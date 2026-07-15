/*
System: Pedestrian Hazard YOLO
Module: Main
File URL: backend/src/main.rs
Purpose: Configure and start the Axum web server with CORS, trace logging, and routes for YOLO detections and health checks
*/

use axum::{extract::DefaultBodyLimit, routing::{get, post}, Router};
use std::net::SocketAddr;
use std::path::Path;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

mod api;
mod yolo;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    info!("Starting YOLOv8 backend server...");

    // The production image must contain the model exported during the Docker build.
    // Failing immediately is safer than downloading an unverified model at runtime.
    let model_path = Path::new("yolov8n.onnx");
    assert!(
        model_path.exists(),
        "Bundled model yolov8n.onnx is missing from the runtime image"
    );

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
        .route("/", get(api::root_status))
        .route("/health", get(api::health_check))
        .route("/api/v1/detect", post(api::detect_objects))
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024))
        .with_state(shared_state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(7860);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
