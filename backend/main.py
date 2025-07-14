from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import requests
import os
import shutil
import base64
import tempfile
import zipfile
import fal_client
from services.utils import on_queue_update
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
FAL_KEY = os.getenv("FAL_KEY", "526267e9-c8b6-4e8f-8808-2d4e59c10013:f645dfa5db5bcb24596ee74da77d50d8")
os.environ['FAL_KEY'] = FAL_KEY
BFL_API_URL = "https://api.bfl.ai/v1/flux-kontext-max"
BFL_FINETUNE_URL = "https://api.us1.bfl.ai/v1/finetune"

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
    path: str = Form(..., description="Loras path"),
    prompt: Optional[str] = Form("Professional headshot, studio lighting, business attire, clean background, realistic, high quality")
):
    result = fal_client.subscribe(
        "fal-ai/flux-lora",
        arguments={
            "prompt": prompt,
            "model_name": None,
            "loras": [{
                "path": path,
                "scale": 1
            }],
            "embeddings": [],
            "enable_safety_checker": True
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )
    return result

@app.post("/finetune")
async def finetune_model(
    files: List[UploadFile] = File(..., description="Upload 3-20 images for fine-tuning (JPEG/PNG)"),
    trigger_word: str = Form(..., description="Unique trigger word for your concept (e.g. 'TOK')"),
):
    """
    Upload images and fine-tune a FLUX model using the BFL API.
    Returns the finetune job status/result.
    """
    
    # Validate number of files
    if len(files) < 3 or len(files) > 20:
        return JSONResponse(
            status_code=400, 
            content={"error": "Please upload between 3 and 20 images"}
        )
    
    # Validate file types
    allowed_extensions = {'.jpg', '.jpeg', '.png'}
    for file in files:
        if not file.filename:
            return JSONResponse(
                status_code=400, 
                content={"error": "All files must have filenames"}
            )
        
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            return JSONResponse(
                status_code=400, 
                content={"error": f"File {file.filename} has unsupported format. Only JPEG/PNG allowed."}
            )
    
    # Create temporary directory
    tmpdir = tempfile.mkdtemp()
    
    try:
        # Save uploaded images to temporary directory
        image_paths = []
        for file in files:
            print(f"Processing file: {file.filename}")
            img_path = os.path.join(tmpdir, file.filename)
            
            # Read file content
            content = await file.read()
            
            # Write to temporary file
            with open(img_path, "wb") as f:
                f.write(content)
            
            image_paths.append(img_path)
        
        # Create zip file
        zip_path = os.path.join(tmpdir, "finetune_images_1.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for img_path in image_paths:
                # Add file to zip with just the filename (not full path)
                zipf.write(img_path, os.path.basename(img_path))
        
        with open(zip_path, "rb") as f:
            upload_response = requests.post(
                "https://tmpfiles.org/api/v1/upload",
                files={"file": ("finetune_images.zip", f, "application/zip")}
            )
        
        if upload_response.status_code != 200:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to upload zip file to temporary storage"}
            )
        
        upload_data = upload_response.json()
        
        data_section = upload_data.get("data", {})
        temp_url = data_section.get("url")
        if not temp_url:
            return JSONResponse(
                status_code=500,
                content={"error": "No URL received from temporary file service"}
            )
        
        # Convert to direct download URL
        download_url = temp_url.replace("http://tmpfiles.org/", "http://tmpfiles.org/dl/")
        
        result = fal_client.subscribe(
            "fal-ai/flux-lora-fast-training",
            arguments={
                "images_data_url": download_url,
                "create_masks": True,
                "steps": 2000,
                "trigger_word": trigger_word,
            },
            with_logs=True, 
            on_queue_update=on_queue_update,
        )
        
        return {
            "status": "success",
            "message": "Fine-tuning job submitted successfully",
            "result": result
        }
        
    except Exception as e:
        print(f"Error during fine-tuning: {str(e)}")
        return JSONResponse(
            status_code=500, 
            content={"error": f"Fine-tuning failed: {str(e)}"}
        )
    
    finally:
        # Clean up temporary directory
        try:
            shutil.rmtree(tmpdir)
        except Exception as cleanup_error:
            print(f"Warning: Could not clean up temporary directory: {cleanup_error}")

@app.post("/generate-finetuned-image")
async def generate_finetuned_image(
    finetune_id: str = Form(..., description="ID of the finetune job (from /finetune response)"),
    prompt: str = Form(..., description="Prompt for image generation"),
    finetune_strength: float = Form(1.1, description="Finetune strength (default: 1.1)"),
    steps: int = Form(40, description="Number of inference steps (default: 40)"),
    guidance: float = Form(2.5, description="Guidance scale (default: 2.5)"),
    image_prompt: UploadFile = File(None, description="Optional image prompt (image file, will be base64 encoded)"),
    width: int = Form(1024, description="Image width (default: 1024)"),
    height: int = Form(768, description="Image height (default: 768)"),
    prompt_upsampling: bool = Form(False, description="Enable prompt upsampling (default: false)"),
    seed: int = Form(42, description="Random seed (default: 42)"),
    safety_tolerance: int = Form(2, description="Safety tolerance (default: 2)"),
    output_format: str = Form("jpeg", description="Output format (default: jpeg)"),
    webhook_url: str = Form(None, description="Optional webhook URL for async notification"),
    webhook_secret: str = Form(None, description="Optional webhook secret for verification")
):
    """
    Generate an image using a previously finetuned FLUX model via the BFL API.
    Returns the job status/result (including polling_url).
    """
    # Handle image_prompt as base64 if provided
    image_prompt_b64 = None
    if image_prompt is not None:
        file_bytes = await image_prompt.read()
        import base64
        image_prompt_b64 = base64.b64encode(file_bytes).decode("utf-8")

    payload = {
        "finetune_id": finetune_id,
        "finetune_strength": 1.1,
        "steps": 40,
        "guidance": 2.5,
        "prompt": "professional corporate business headshot of a person, clean studio lighting, formal attire, natural skin texture, centered composition, blurred neutral background",
        "width": 1024,
        "height": 768,
        "prompt_upsampling": False,
        "seed": 42,
        "safety_tolerance": 2,
        "output_format": "jpeg",
    }
    if webhook_url:
        payload["webhook_url"] = webhook_url
    if webhook_secret:
        payload["webhook_secret"] = webhook_secret

    headers = {
        "accept": "application/json",
        "x-key": BFL_API_KEY,
        "Content-Type": "application/json"
    }
    try:
        response = requests.post("https://api.us1.bfl.ai/v1/flux-pro-finetuned", json=payload, headers=headers)
        if response.status_code != 200:
            return JSONResponse(status_code=500, content={"error": f"BFL API error: {response.text}"})
        return response.json()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)}) 
    
    