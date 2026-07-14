import requests
import urllib.request
import os

res = requests.get("https://huggingface.co/api/models?search=yolov8n")
models = res.json()
found = False
for m in models:
    model_id = m['id']
    url = f"https://huggingface.co/{model_id}/resolve/main/yolov8n.onnx"
    try:
        r = requests.head(url)
        if r.status_code == 302 or r.status_code == 200:
            print(f"Downloading from {url}")
            urllib.request.urlretrieve(url, "yolov8n.onnx")
            if os.path.getsize("yolov8n.onnx") > 5000000:
                print("Success")
                found = True
                break
    except Exception as e:
        pass
    
    url2 = f"https://huggingface.co/{model_id}/resolve/main/yolov8n.onnx?download=true"
    try:
        r = requests.head(url2)
        if r.status_code == 302 or r.status_code == 200:
            print(f"Downloading from {url2}")
            urllib.request.urlretrieve(url, "yolov8n.onnx")
            if os.path.getsize("yolov8n.onnx") > 5000000:
                print("Success")
                found = True
                break
    except Exception as e:
        pass

if not found:
    print("Could not find yolov8n.onnx on HuggingFace")
