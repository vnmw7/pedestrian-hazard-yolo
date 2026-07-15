# System: Pedestrian Hazard YOLO
# Module: Deployment Container
# File URL: backend/Dockerfile
# Purpose: Build the Axum Rust API and bundle the pre-exported YOLOv8n ONNX model

# Build context is backend/, so all COPY paths are relative to backend/.
# The ONNX model is produced once (locally / CI) and committed, avoiding a
# fragile PyTorch/Ultralytics/onnxscript toolchain in the Render build.

FROM rust:1.88-trixie AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

# Stage the ONNX Runtime shared library that the `ort` crate's build script
# downloads into target/ (via its default `download-binaries` strategy). The
# slim runtime stage needs it to satisfy the binary's dynamic NEEDED entry.
# -L dereferences the soname symlinks (libonnxruntime.so -> libonnxruntime.so.1.x).
RUN mkdir -p /out/libs \
    && find / -name "libonnxruntime.so*" -exec cp -fL {} /out/libs/ \; 2>/dev/null || true \
    && test -n "$(ls -1 /out/libs/libonnxruntime.so* 2>/dev/null | head -n1)"


FROM debian:trixie-slim

# libgomp1: required by libonnxruntime.so (OpenMP runtime), absent in slim.
# ca-certificates: required for any HTTPS the runtime performs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/backend /app/backend
COPY --from=builder /out/libs/ /usr/lib/
COPY yolov8n.onnx /app/yolov8n.onnx

# Refresh the dynamic linker cache so the soname resolves, then sanity-check
# the bundled model size so a truncated/missing ONNX file fails the build.
RUN ldconfig \
    && test "$(stat -c%s /app/yolov8n.onnx)" -gt 5000000

ENV LD_LIBRARY_PATH=/usr/lib
ENV RUST_LOG=info

EXPOSE 10000

CMD ["/app/backend"]
