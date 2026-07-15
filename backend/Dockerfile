# System: Pedestrian Hazard YOLO
# Module: Deployment Container
# File URL: backend/Dockerfile
# Purpose: Build-stage and runner-stage setup for Axum Rust application with baked YOLOv8n ONNX model

FROM rust:1.88-trixie AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release


FROM debian:trixie-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/backend /app/backend

RUN curl --fail --location --retry 3 --retry-delay 2 \
    "https://media.githubusercontent.com/media/axinc-ai/ailia-models/master/object_detection/yolov8/yolov8n.onnx" \
    --output /app/yolov8n.onnx \
    && test "$(stat -c%s /app/yolov8n.onnx)" -gt 5000000

ENV RUST_LOG=info

EXPOSE 10000

CMD ["/app/backend"]
