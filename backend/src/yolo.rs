use image::{DynamicImage, GenericImageView};
use ndarray::Array;
use ort::{inputs, session::{builder::GraphOptimizationLevel, Session}};
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

use crate::api::Detection;

use std::sync::Mutex;

const YOLO_CLASSES: [&str; 80] = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
    "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
    "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed",
    "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven",
    "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
];

pub struct YoloModel {
    session: Mutex<Session>,
}

impl YoloModel {
    pub fn new(model_path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let session = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(2)?
            .commit_from_file(model_path)?;

        Ok(Self { session: Mutex::new(session) })
    }

    pub fn predict(&self, image: DynamicImage) -> Result<Vec<Detection>, Box<dyn std::error::Error>> {
        let (img_width, img_height) = image.dimensions();
        
        // Resize to 640x640 (standard YOLOv8 input)
        let resized = image.resize_exact(640, 640, image::imageops::FilterType::Triangle);
        
        // Prepare input tensor
        let mut input_tensor = Array::zeros((1, 3, 640, 640));
        for pixel in resized.pixels() {
            let x = pixel.0 as usize;
            let y = pixel.1 as usize;
            let rgba = pixel.2;
            input_tensor[[0, 0, y, x]] = (rgba[0] as f32) / 255.0;
            input_tensor[[0, 1, y, x]] = (rgba[1] as f32) / 255.0;
            input_tensor[[0, 2, y, x]] = (rgba[2] as f32) / 255.0;
        }

        let input_tensor_value = ort::value::Tensor::from_array(input_tensor)?;

        // Run inference
        let output_t = {
            let mut session_lock = self.session.lock().unwrap();
            let outputs = session_lock.run(inputs![input_tensor_value])?;
            
            let (_, data) = outputs[0].try_extract_tensor::<f32>()?;
            let output_view = ndarray::ArrayView::from_shape((84, 8400), data)?;
            
            // YOLOv8 output shape is typically [1, 84, 8400]
            // We need to transpose to [8400, 84] to process easily
            let reshaped = output_view.into_shape_with_order((84, 8400))?;
            reshaped.t().to_owned() // Clone the data so it lives after the lock is dropped
        };

        let mut detections = Vec::new();
        let conf_threshold = 0.5;

        for row in output_t.outer_iter() {
            // Find max class confidence
            let mut max_conf = 0.0;
            let mut class_id = 0;
            for i in 4..84 {
                if row[i] > max_conf {
                    max_conf = row[i];
                    class_id = i - 4;
                }
            }

            if max_conf >= conf_threshold {
                let cx = row[0];
                let cy = row[1];
                let w = row[2];
                let h = row[3];

                // Scale bounding box back to original image size
                let x_scale = img_width as f32 / 640.0;
                let y_scale = img_height as f32 / 640.0;

                let x = (cx - w / 2.0) * x_scale;
                let y = (cy - h / 2.0) * y_scale;
                let width = w * x_scale;
                let height = h * y_scale;

                detections.push(Detection {
                    class: YOLO_CLASSES[class_id].to_string(),
                    confidence: max_conf,
                    bbox: [x, y, width, height],
                });
            }
        }

        // Apply basic Non-Maximum Suppression (NMS)
        let nms_threshold = 0.45;
        let final_detections = apply_nms(detections, nms_threshold);

        Ok(final_detections)
    }
}

fn apply_nms(mut detections: Vec<Detection>, iou_threshold: f32) -> Vec<Detection> {
    detections.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
    
    let mut keep = Vec::new();
    let mut is_suppressed = vec![false; detections.len()];

    for i in 0..detections.len() {
        if is_suppressed[i] { continue; }
        keep.push(detections[i].clone());

        for j in (i + 1)..detections.len() {
            if is_suppressed[j] { continue; }
            if detections[i].class != detections[j].class { continue; }

            let iou = calculate_iou(&detections[i].bbox, &detections[j].bbox);
            if iou > iou_threshold {
                is_suppressed[j] = true;
            }
        }
    }
    keep
}

fn calculate_iou(box1: &[f32; 4], box2: &[f32; 4]) -> f32 {
    let x1 = box1[0].max(box2[0]);
    let y1 = box1[1].max(box2[1]);
    let x2 = (box1[0] + box1[2]).min(box2[0] + box2[2]);
    let y2 = (box1[1] + box1[3]).min(box2[1] + box2[3]);

    let inter_area = (x2 - x1).max(0.0) * (y2 - y1).max(0.0);
    let box1_area = box1[2] * box1[3];
    let box2_area = box2[2] * box2[3];

    inter_area / (box1_area + box2_area - inter_area + 1e-6)
}

pub async fn download_model(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let _url = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt";
    let onnx_url = "https://github.com/Hyuto/yolov8-onnx-tensorrt-cpp/raw/master/models/yolov8n.onnx";
    
    let response = reqwest::get(onnx_url).await?;
    let mut file = File::create(path).await?;
    let mut stream = response.bytes_stream();
    
    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let data = chunk?;
        file.write_all(&data).await?;
    }
    
    Ok(())
}
