# Professional Headshot API (AI-Powered)

This is a FastAPI backend that provides a REST endpoint to upload a photo (file or URL) and returns a professional headshot using the bfl.ai API.

## Setup

1. Create and activate a virtual environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install fastapi uvicorn python-multipart requests
```

3. Set your BFL API key (get it from https://docs.bfl.ai):

```bash
export BFL_API_KEY=your_bfl_api_key_here
```

4. Run the server:

```bash
uvicorn main:app --reload
```

## Usage

### POST /headshot

Upload a photo (file or image_url) and get a professional headshot.

**Request (multipart/form-data):**
- `file`: (optional) Image file to upload
- `image_url`: (optional) URL of an image
- `prompt`: (optional) Custom prompt for the headshot (default is a professional headshot prompt)

**Response:**
- `result_url`: URL to the generated professional headshot image

**Example using curl:**

```bash
curl -X POST "http://localhost:8000/headshot" \
  -F "file=@your_photo.jpg"
```

or

```bash
curl -X POST "http://localhost:8000/headshot" \
  -F "image_url=https://example.com/photo.jpg"
```

## Notes
- The API uploads files to file.io for temporary hosting. For production, use your own image hosting (e.g., S3).
- The BFL API key is required and must be set in the environment.
- The endpoint polls the BFL API for the result and returns the final image URL. 