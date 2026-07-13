# Stage 1: Build
FROM rust:bookworm AS builder
WORKDIR /app

# Copy the backend source
COPY backend/ ./backend/
WORKDIR /app/backend

# We need ONNX Runtime during build for `ort` crate
ENV ORT_STRATEGY=download

# Build the Rust binary
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install necessary runtime dependencies
RUN apt-get update && apt-get install -y libgomp1 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/backend/target/release/backend /app/server

# Expose port 7860 as expected by Hugging Face Spaces
EXPOSE 7860

CMD ["/app/server"]
