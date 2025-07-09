from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import requests
import os
import shutil
import base64

app = FastAPI()

# Allow CORS for local/frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BFL_API_KEY = os.getenv("BFL_API_KEY", "60e13fcf-1d19-4294-b170-815a2ad6d9f7")
BFL_API_URL = "https://api.bfl.ai/v1/flux-kontext-pro"

# Helper to call bfl.ai API

def call_bfl_ai(prompt: str, image_url: Optional[str] = None, image_base64: Optional[str] = None):
    payload = {
        "prompt": prompt,
        "aspect_ratio": "3:4",  # Portrait for headshots
        "output_format": "jpeg"
    }
    if image_url:
        payload["input_image"] = image_url
    elif image_base64:
        payload["input_image"] = image_base64
    payload["negative_prompt"] = "blurry, distorted face, poor lighting, low resolution, cartoonish, painting, artistic style, hat, sunglasses, overexposed, underexposed, watermark, background clutter, open mouth, extreme makeup"
                
    headers = {
        "accept": "application/json",
        "x-key": BFL_API_KEY,
        "Content-Type": "application/json"
    }
    response = requests.post(BFL_API_URL, json=payload, headers=headers)
    if response.status_code != 200:
        return None, f"BFL API error: {response.text}"
    data = response.json()
    return data, None

# Polling helper

def poll_bfl_result(polling_url: str):
    headers = {"accept": "application/json", "x-key": BFL_API_KEY}
    import time
    for _ in range(40):  # up to 20 seconds
        resp = requests.get(polling_url, headers=headers)
        if resp.status_code != 200:
            return None, f"Polling error: {resp.text}"
        data = resp.json()
        if data.get("status") == "Ready":
            return data["result"].get("sample"), None
        elif data.get("status") in ("Error", "Failed"):
            return None, f"Generation failed: {data}"
        time.sleep(0.5)
    return None, "Timeout waiting for BFL result"

@app.post("/headshot")
async def create_headshot(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    prompt: Optional[str] = Form("Professional headshot, studio lighting, business attire, clean background, realistic, high quality")
):
    """
    Upload a photo (file or URL) and get a professional headshot (AI-powered).
    """
    if not file and not image_url:
        return JSONResponse(status_code=400, content={"error": "Provide a file or image_url"})

    # If file, read and encode as base64
    if file:
        file_bytes = await file.read()
        image_base64 = base64.b64encode(file_bytes).decode("utf-8")
        # Call bfl.ai API with base64
        bfl_data, err = call_bfl_ai(prompt, None, image_base64=image_base64)
    else:
        # Call bfl.ai API with image_url
        bfl_data, err = call_bfl_ai(prompt, image_url)
    if err:
        return JSONResponse(status_code=500, content={"error": err})
    polling_url = bfl_data.get("polling_url")
    if not polling_url:
        return JSONResponse(status_code=500, content={"error": "No polling_url from BFL API"})

    # Poll for result
    result_url, err = poll_bfl_result(polling_url)
    if err:
        return JSONResponse(status_code=500, content={"error": err})

    return {"result_url": result_url} 