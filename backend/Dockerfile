# System: Pedestrian Hazard YOLO
# Module: Deployment Container
# File URL: backend/Dockerfile
# Purpose: Build the Axum Rust API and export an official YOLOv8n model to ONNX

FROM python:3.11-slim-bookworm AS model-exporter

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /model

# Generate the ONNX artifact from the official Ultralytics model instead of
# depending on an unversioned third-party ONNX download URL.
RUN pip install --no-cache-dir \
        ultralytics==8.3.0 \
        onnx==1.16.2 \
    && python - <<'PY'
from pathlib import Path
import shutil

from ultralytics import YOLO

exported = Path(
    YOLO("yolov8n.pt").export(
        format="onnx",
        imgsz=640,
        opset=12,
        simplify=False,
        dynamic=False,
    )
)

destination = Path("/model/yolov8n.onnx")
if exported.resolve() != destination.resolve():
    shutil.copy2(exported, destination)

size = destination.stat().st_size
if size <= 5_000_000:
    raise RuntimeError(f"Exported ONNX model is unexpectedly small: {size} bytes")

print(f"Exported {destination} ({size} bytes)")
PY


FROM rust:1.88-trixie AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release


FROM debian:trixie-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/backend /app/backend
COPY --from=model-exporter /model/yolov8n.onnx /app/yolov8n.onnx

RUN test "$(stat -c%s /app/yolov8n.onnx)" -gt 5000000

ENV RUST_LOG=info

EXPOSE 10000

CMD ["/app/backend"]