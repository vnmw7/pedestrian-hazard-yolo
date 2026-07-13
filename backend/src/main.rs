use axum::{routing::post, Router};
use std::net::SocketAddr;
use std::path::Path;
use tracing::info;

mod api;
mod yolo;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    info!("Starting YOLOv8 backend server...");

    // Initialize YOLO model
    let model_path = Path::new("yolov8n.onnx");
    if !model_path.exists() {
        info!("Model yolov8n.onnx not found. Downloading...");
        yolo::download_model(model_path).await.expect("Failed to download model");
    }

    let yolo_model = yolo::YoloModel::new(model_path).expect("Failed to initialize YOLO model");
    let shared_state = std::sync::Arc::new(yolo_model);

    let app = Router::new()
        .route("/api/v1/detect", post(api::detect_objects))
        .with_state(shared_state);

    // Hugging Face Spaces expect applications to listen on port 7860
    let addr = SocketAddr::from(([0, 0, 0, 0], 7860));
    info!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
