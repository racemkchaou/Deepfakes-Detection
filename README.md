# DeepGuard: Production-Quality Deepfake Detection Web App

DeepGuard is a full-stack AI application for deepfake detection, built for portfolio-grade presentation on LinkedIn and GitHub.

## Tech Stack

- Frontend: React 18, Vite, TailwindCSS, Framer Motion, Recharts, React Dropzone, Lucide, Axios
- Backend: FastAPI, TensorFlow, OpenCV, NumPy, Pillow
- Model: TimeDistributed EfficientNetB0-based sequence model (`backend/model/best_phase2.keras`)

## Architecture

```text
+-------------------------+         HTTP Multipart Upload         +--------------------------+
|      React Frontend     | ------------------------------------> |      FastAPI Backend     |
|  - Upload + Preview     |                                        |  - /predict              |
|  - Animated Analyzer    | <------------------------------------ |  - /health               |
|  - Timeline + Gauge     |          JSON Inference Result        |  - Model loaded at boot  |
+-----------+-------------+                                        +------------+-------------+
            |                                                                   |
            |                                                                   |
            |                                                        +----------v-----------+
            |                                                        | TensorFlow Model     |
            |                                                        | best_phase2.keras    |
            |                                                        +----------+-----------+
            |                                                                   |
            |                                                        +----------v-----------+
            +------------------------------------------------------> | OpenCV Preprocessing |
                                                                     | - 30 frame sampling  |
                                                                     | - face crop + CLAHE  |
                                                                     | - Grad-CAM overlay   |
                                                                     +----------------------+
```

## Backend Setup

1. Open terminal in `backend`.
2. Create virtual environment and install dependencies:

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Start the API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

4. Health check:

```bash
curl http://localhost:8000/health
```

## Frontend Setup

1. Open another terminal in `frontend`.
2. Install dependencies:

```bash
npm install
```

3. Start Vite dev server:

```bash
npm run dev
```

4. Open:

```text
http://localhost:5173
```

## API Contract

### `POST /predict`

- Form field: `file` (video)
- Formats: MP4, AVI, MOV, MKV
- Max file size: 100MB

Example response:

```json
{
  "score": 0.82,
  "label": "DEEPFAKE",
  "confidence": 0.82,
  "gradcam_b64": "...",
  "middle_frame_b64": "...",
  "processing_time": 2.94,
  "frame_scores": [0.12, 0.17, 0.2]
}
```

### `GET /health`

Returns model status and metadata.

## Screenshots (Placeholders)

- `docs/screenshots/01-upload-view.png`
- `docs/screenshots/02-analyzing-overlay.png`
- `docs/screenshots/03-result-dashboard.png`
- `docs/screenshots/04-gradcam-comparison.png`

## Notes

- The preprocessing logic in `backend/predict.py` matches the training pipeline exactly.
- Model is loaded once at startup for production-style serving.
- Grad-CAM and per-frame timeline are included for explainability.
