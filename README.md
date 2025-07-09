# AI-Powered Professional Headshot Generator

---

## Features

- **Frontend**: React (TypeScript), Vite, Tailwind CSS, shadcn/ui, Radix UI, modern UX
- **Backend**: FastAPI, Python, REST API, bfl.ai integration
- **Dockerized**: Easy deployment with Docker Compose
- **Custom Prompts**: Users can customize the style of their headshot
- **Multiple Image Support**: Generate up to 4 headshots at once

## Quick Start

### 1. Prerequisites
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- Or: Python 3.11+, Node.js 20+, pnpm (or npm/yarn)

### 2. Clone the Repository
```bash
git clone <your-repo-url>
cd flux
```

### 3. Run with Docker Compose (Recommended)
```bash
docker-compose up --build
```
- Frontend: [http://localhost:4173](http://localhost:4173)
- Backend: [http://localhost:8051](http://localhost:8051)

> **Note:** Set your `BFL_API_KEY` in `docker-compose.yml` or as an environment variable for production.

---

## Local Development

### Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export BFL_API_KEY=your_bfl_api_key_here
uvicorn main:app --reload --port 8051
```

### Frontend (React)
```bash
cd front
pnpm install  # or npm install
pnpm dev      # or npm run dev
```
- Visit [http://localhost:8080](http://localhost:8080) (default Vite dev port)

---

## Usage

1. Open the frontend in your browser.
2. Upload a photo (or paste an image).
3. (Optional) Customize the prompt for your headshot style.
4. Click **Generate**. Wait for the AI to process your image.
5. Download your new professional headshot!

---

## API Reference

See [`backend/README.md`](backend/README.md) for full API details.
- **POST `/headshot`**: Upload a photo or image URL, get a professional headshot.
- Requires `BFL_API_KEY` (see [bfl.ai docs](https://docs.bfl.ai)).

---

## Environment Variables
- `BFL_API_KEY`: Your bfl.ai API key (required for backend)

---

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Radix UI
- **Backend**: FastAPI, Python, requests
- **Docker**: Multi-stage builds for both frontend and backend

---

## .gitignore
- Python: venv, __pycache__, *.pyc
- Node: node_modules, dist
- Docker, IDE, OS, logs, misc

---

## Contributing
1. Fork the repo & create a feature branch
2. Make your changes (see local dev above)
3. Open a pull request

---

## License
MIT

---

## Credits
- [bfl.ai](https://bfl.ai) for AI headshot generation
- [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Vite](https://vitejs.dev/)

---

For questions or support, open an issue or contact the maintainer. 