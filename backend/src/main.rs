use axum::{routing::post, Router, extract::DefaultBodyLimit};
use std::net::SocketAddr;
use std::path::Path;
use tracing::info;
use tower_http::cors::{Any, CorsLayer};

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

    let mut origins = vec![
        "http://localhost:5173".parse::<axum::http::HeaderValue>().unwrap(),
        "http://127.0.0.1:5173".parse::<axum::http::HeaderValue>().unwrap(),
    ];
    if let Ok(frontend_url) = std::env::var("FRONTEND_URL") {
        if let Ok(origin) = frontend_url.parse::<axum::http::HeaderValue>() {
            origins.push(origin);
        }
    }

    let cors = CorsLayer::new()
        .allow_methods([axum::http::Method::GET, axum::http::Method::POST])
        .allow_origin(origins)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/v1/detect", post(api::detect_objects))
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024))
        .with_state(shared_state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http());

    // Hugging Face Spaces expect applications to listen on port 7860
    let addr = SocketAddr::from(([0, 0, 0, 0], 7860));
    info!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
