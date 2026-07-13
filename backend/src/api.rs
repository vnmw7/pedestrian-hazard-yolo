use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;
use bytes::Bytes;

use crate::yolo::YoloModel;

#[derive(Serialize, Deserialize, Clone)]
pub struct Detection {
    pub class: String,
    pub confidence: f32,
    pub bbox: [f32; 4], // [x, y, width, height]
}

#[derive(Serialize)]
pub struct DetectResponse {
    pub detections: Vec<Detection>,
}

pub async fn detect_objects(
    State(model): State<Arc<YoloModel>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut image_data: Option<Bytes> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Multipart error: {}", e)))?
    {
        if field.name() == Some("image") {
            image_data = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed to read image bytes: {}", e)))?,
            );
            break;
        }
    }

    let image_bytes = match image_data {
        Some(bytes) => bytes,
        None => return Err((StatusCode::BAD_REQUEST, "Missing 'image' field".to_string())),
    };

    // Process image
    let image = image::load_from_memory(&image_bytes)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid image: {}", e)))?;

    info!("Processing image of size {}x{}", image.width(), image.height());

    let detections = model
        .predict(image)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Inference error: {}", e)))?;

    Ok(Json(DetectResponse { detections }))
}
