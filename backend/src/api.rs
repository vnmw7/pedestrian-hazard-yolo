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
            let bytes = field
                .bytes()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed to read image bytes: {}", e)))?;
            
            if bytes.len() > 10 * 1024 * 1024 {
                return Err((StatusCode::PAYLOAD_TOO_LARGE, "File exceeds 10 MB limit".to_string()));
            }

            match image::guess_format(&bytes) {
                Ok(image::ImageFormat::Jpeg) | Ok(image::ImageFormat::Png) | Ok(image::ImageFormat::WebP) => {
                    image_data = Some(bytes);
                }
                _ => return Err((StatusCode::BAD_REQUEST, "Unsupported format. Only JPEG, PNG, and WebP are allowed.".to_string())),
            }

            break;
        }
    }

    let image_bytes = match image_data {
        Some(bytes) => bytes,
        None => return Err((StatusCode::BAD_REQUEST, "Missing 'image' field".to_string())),
    };

    // Process image
    let image = image::load_from_memory(&image_bytes)
        .map_err(|e| {
            tracing::error!("Invalid image format or corrupted data: {}", e);
            (StatusCode::BAD_REQUEST, format!("Invalid image: {}", e))
        })?;

    info!("Processing image of size {}x{}", image.width(), image.height());

    let allowed_classes = ["person", "bicycle", "car", "motorcycle", "bus", "truck"];

    let detections: Vec<Detection> = model
        .predict(image)
        .map_err(|e| {
            tracing::error!("Inference error during model prediction: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Inference error: {}", e))
        })?
        .into_iter()
        .filter(|d| allowed_classes.contains(&d.class.as_str()))
        .collect();

    Ok(Json(DetectResponse { detections }))
}
