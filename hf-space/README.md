---
title: Pedestrian Hazard YOLO API
emoji: 🚶
colorFrom: blue
colorTo: red
sdk: gradio
app_file: app.py
pinned: false
license: mit
---

# Pedestrian Hazard YOLO API

Free Hugging Face Gradio Space adapter for the pedestrian hazard detector.
It exposes the same multipart endpoint used by the existing frontend:

```text
POST /api/v1/detect
Content-Type: multipart/form-data
Field name: image
```

The response shape is:

```json
{
  "detections": [
    {
      "class": "person",
      "confidence": 0.91,
      "bbox": [10.0, 20.0, 100.0, 200.0]
    }
  ]
}
```

## Space setup

1. Create a **Gradio** Space using the **Blank** template.
2. Select **CPU Basic (Free)**. ZeroGPU is not needed for this ONNX CPU model.
3. Copy `app.py`, `requirements.txt`, and this `README.md` into the root of the Space repository.
4. Wait for the build to finish.
5. Test `/health`, then upload an image at `/demo`.

The API base URL will normally be:

```text
https://vnmw7-pedestrian-hazard-yolo.hf.space
```

## Cloudflare frontend

Set this build/runtime variable in Cloudflare:

```text
VITE_BACKEND_URL=https://vnmw7-pedestrian-hazard-yolo.hf.space
```

The existing TanStack server route will then forward images to:

```text
https://vnmw7-pedestrian-hazard-yolo.hf.space/api/v1/detect
```

When the frontend uses its server-side `/api/detect` proxy, no browser CORS configuration is required. If the browser calls the Space directly instead, add the exact Cloudflare site URL as the Space variable `FRONTEND_URL`.

## Optional variables

- `FRONTEND_URL`: comma-separated browser origins allowed by CORS
- `MODEL_URL`: alternate ONNX model download URL
- `MODEL_PATH`: model file path, default `yolov8n.onnx`
- `CONFIDENCE_THRESHOLD`: default `0.5`
- `IOU_THRESHOLD`: default `0.45`
