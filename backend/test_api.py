import requests
import urllib.request
from PIL import Image
import io
import json
import time

API_URL = "http://localhost:7860/api/v1/detect"

def test_pedestrian_image():
    print("Testing pedestrian image...")
    # download a sample image (zidane has persons)
    url = "https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/zidane.jpg"
    urllib.request.urlretrieve(url, "zidane.jpg")
    
    with open("zidane.jpg", "rb") as f:
        files = {"image": f}
        response = requests.post(API_URL, files=files)
        
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Detections count: {len(data.get('detections', []))}")
        classes = [d['class'] for d in data.get('detections', [])]
        print(f"Detected classes: {classes}")
    print("-" * 40)

def test_multiple_objects_and_vehicles():
    print("Testing image with multiple objects and vehicles...")
    # download bus.jpg (has bus and persons)
    url = "https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/bus.jpg"
    urllib.request.urlretrieve(url, "bus.jpg")
    
    with open("bus.jpg", "rb") as f:
        files = {"image": f}
        response = requests.post(API_URL, files=files)
        
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Detections count: {len(data.get('detections', []))}")
        classes = [d['class'] for d in data.get('detections', [])]
        print(f"Detected classes: {classes}")
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

def test_oversized_file():
    print("Testing oversized file...")
    # Create an image > 10MB by creating a large random array or just a large blank image
    img = Image.new('RGB', (10000, 10000), color = 'black')
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=100)
    buf.seek(0)
    
    files = {"image": ("large.jpg", buf, "image/jpeg")}
    response = requests.post(API_URL, files=files)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    print("-" * 40)

def test_corrupted_image():
    print("Testing corrupted image...")
    # Send random bytes
    files = {"image": ("corrupted.jpg", b"This is just random bytes not a valid image", "image/jpeg")}
    response = requests.post(API_URL, files=files)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    print("-" * 40)

def test_unsupported_format():
    print("Testing unsupported format...")
    # Send a text file disguised as pdf
    files = {"image": ("document.pdf", b"%PDF-1.4...", "application/pdf")}
    response = requests.post(API_URL, files=files)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    print("-" * 40)

if __name__ == "__main__":
    test_pedestrian_image()
    test_multiple_objects_and_vehicles()
    test_no_objects()
    test_invalid_file()
    test_oversized_file()
    test_corrupted_image()
    test_unsupported_format()
