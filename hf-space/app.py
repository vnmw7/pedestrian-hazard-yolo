"""Hugging Face Spaces adapter for the pedestrian hazard YOLO API.

Runs on the free Gradio/CPU Basic runtime while preserving the existing
POST /api/v1/detect multipart API used by the Cloudflare-hosted frontend.
"""

from __future__ import annotations

import io
import os
from pathlib import Path
from threading import Lock

import gradio as gr
import httpx
import numpy as np
import onnxruntime as ort
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

MODEL_PATH = Path(os.getenv("MODEL_PATH", "yolov8n.onnx"))
MODEL_URL = os.getenv(
    "MODEL_URL",
    "https://github.com/Hyuto/yolov8-onnx-tensorrt-cpp/raw/master/models/yolov8n.onnx",
)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
INPUT_SIZE = 640
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.45"))

COCO_CLASSES = (
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
    "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard",
    "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase",
    "scissors", "teddy bear", "hair drier", "toothbrush",
)

_session: ort.InferenceSession | None = None
_session_lock = Lock()


def download_model() -> None:
    if MODEL_PATH.exists():
        return

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = MODEL_PATH.with_suffix(MODEL_PATH.suffix + ".part")
    with httpx.stream("GET", MODEL_URL, follow_redirects=True, timeout=120.0) as response:
        response.raise_for_status()
        with temporary_path.open("wb") as output:
            for chunk in response.iter_bytes():
                output.write(chunk)
    temporary_path.replace(MODEL_PATH)


def get_session() -> ort.InferenceSession:
    global _session
    if _session is None:
        with _session_lock:
            if _session is None:
                download_model()
                options = ort.SessionOptions()
                options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                options.intra_op_num_threads = max(1, min(2, os.cpu_count() or 1))
                _session = ort.InferenceSession(
                    str(MODEL_PATH),
                    sess_options=options,
                    providers=["CPUExecutionProvider"],
                )
    return _session


def calculate_iou(first: np.ndarray, second: np.ndarray) -> float:
    x1 = max(float(first[0]), float(second[0]))
    y1 = max(float(first[1]), float(second[1]))
    x2 = min(float(first[0] + first[2]), float(second[0] + second[2]))
    y2 = min(float(first[1] + first[3]), float(second[1] + second[3]))

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    first_area = float(first[2] * first[3])
    second_area = float(second[2] * second[3])
    return intersection / (first_area + second_area - intersection + 1e-6)


def apply_nms(detections: list[dict]) -> list[dict]:
    detections.sort(key=lambda item: item["confidence"], reverse=True)
    kept: list[dict] = []

    for candidate in detections:
        should_keep = True
        candidate_box = np.asarray(candidate["bbox"], dtype=np.float32)
        for existing in kept:
            if candidate["class"] != existing["class"]:
                continue
            existing_box = np.asarray(existing["bbox"], dtype=np.float32)
            if calculate_iou(candidate_box, existing_box) > IOU_THRESHOLD:
                should_keep = False
                break
        if should_keep:
            kept.append(candidate)

    return kept


def predict(image: Image.Image) -> list[dict]:
    original = image.convert("RGB")
    original_width, original_height = original.size
    resized = original.resize((INPUT_SIZE, INPUT_SIZE), Image.Resampling.BILINEAR)

    tensor = np.asarray(resized, dtype=np.float32) / 255.0
    tensor = np.transpose(tensor, (2, 0, 1))[None, ...]

    session = get_session()
    input_name = session.get_inputs()[0].name
    output = session.run(None, {input_name: tensor})[0]
    output = np.squeeze(output, axis=0)

    if output.shape[0] == 84:
        rows = output.T
    elif output.shape[1] == 84:
        rows = output
    else:
        raise RuntimeError(f"Unexpected YOLO output shape: {output.shape}")

    x_scale = original_width / INPUT_SIZE
    y_scale = original_height / INPUT_SIZE
    detections: list[dict] = []

    for row in rows:
        class_scores = row[4:]
        class_id = int(np.argmax(class_scores))
        confidence = float(class_scores[class_id])
        if confidence < CONFIDENCE_THRESHOLD:
            continue

        center_x, center_y, width, height = map(float, row[:4])
        x = (center_x - width / 2.0) * x_scale
        y = (center_y - height / 2.0) * y_scale

        detections.append(
            {
                "class": COCO_CLASSES[class_id],
                "confidence": confidence,
                "bbox": [x, y, width * x_scale, height * y_scale],
            }
        )

    return apply_nms(detections)


api = FastAPI(title="Pedestrian Hazard YOLO API", version="1.0.0")

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_URL", "").split(",")
    if origin.strip()
]
if frontend_origins:
    api.add_middleware(
        CORSMiddleware,
        allow_origins=frontend_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )


@api.get("/")
def root() -> dict:
    return {
        "service": "pedestrian-hazard-yolo",
        "status": "ok",
        "detect_endpoint": "/api/v1/detect",
        "demo": "/demo",
    }


@api.get("/health")
def health() -> dict:
    return {"status": "healthy", "model_downloaded": MODEL_PATH.exists()}


@api.post("/api/v1/detect")
async def detect_objects(image: UploadFile = File(...)) -> dict:
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP are allowed.")

    content = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")

    try:
        source_image = Image.open(io.BytesIO(content))
        source_image.load()
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image.") from error

    try:
        return {"detections": predict(source_image)}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Inference failed: {error}") from error


def demo_detect(image: Image.Image | None) -> dict:
    if image is None:
        return {"detections": []}
    return {"detections": predict(image)}


demo = gr.Interface(
    fn=demo_detect,
    inputs=gr.Image(type="pil", label="Street image"),
    outputs=gr.JSON(label="Detections"),
    title="Pedestrian Hazard YOLO API",
    description="Upload an image to test the same detector exposed at /api/v1/detect.",
)

app = gr.mount_gradio_app(api, demo, path="/demo", max_file_size="10mb")


if __name__ == "__main__":
    get_session()
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
