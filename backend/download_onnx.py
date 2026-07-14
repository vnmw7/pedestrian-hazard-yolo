import urllib.request
import os

urls = [
    "https://github.com/AndreyGermanov/yolov8_onnx_rust/raw/main/yolov8n.onnx",
    "https://huggingface.co/camenduru/YoloV8/resolve/main/yolov8n.onnx",
    "https://github.com/ibaiGorordo/ONNX-YOLOv8-Object-Detection/raw/main/models/yolov8n.onnx",
    "https://github.com/axinc-ai/ailia-models/raw/master/object_detection/yolov8/yolov8n.onnx"
]

for url in urls:
    try:
        print(f"Trying {url}...")
        urllib.request.urlretrieve(url, "yolov8n.onnx")
        size = os.path.getsize("yolov8n.onnx")
        print(f"Size: {size}")
        if size > 5000000: # > 5MB
            print("Success!")
            break
    except Exception as e:
        print(f"Failed: {e}")
