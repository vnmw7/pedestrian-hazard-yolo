import requests
import urllib.request
from PIL import Image
import io
import json
import time

API_URL = "http://localhost:7860/api/v1/detect"

def test_valid_image():
    print("Testing valid image...")
    # download a sample image (a dog)
    url = "https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/zidane.jpg"
    urllib.request.urlretrieve(url, "zidane.jpg")
    
    with open("zidane.jpg", "rb") as f:
        files = {"image": f}
        response = requests.post(API_URL, files=files)
        
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Detections count: {len(data.get('detections', []))}")
        for det in data.get('detections', [])[:2]:
            print(f" - Class: {det['class']}, Confidence: {det['confidence']:.2f}, BBox: {det['bbox']}")
    else:
        print(response.text)
    print("-" * 40)

def test_no_objects():
    print("Testing image with no objects...")
    # Create a blank image
    img = Image.new('RGB', (640, 640), color = 'white')
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    
    files = {"image": ("blank.jpg", buf, "image/jpeg")}
    response = requests.post(API_URL, files=files)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Detections count: {len(data.get('detections', []))}")
    else:
        print(response.text)
    print("-" * 40)

def test_invalid_file():
    print("Testing invalid file...")
    # Send a text file
    files = {"image": ("test.txt", b"This is not an image", "text/plain")}
    response = requests.post(API_URL, files=files)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    print("-" * 40)

if __name__ == "__main__":
    test_valid_image()
    test_no_objects()
    test_invalid_file()
