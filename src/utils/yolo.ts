/*
 * System: Pedestrian Hazard YOLO
 * Module: YOLO Inference
 * File URL: src/utils/yolo.ts
 * Purpose: Load and run YOLOv8 ONNX model inference in the browser via onnxruntime-web
 */

import * as ort from "onnxruntime-web/wasm";

// Configure WASM backend for Cloudflare Pages compatibility.
// Use the plain (non-threaded) WASM binary (numThreads: 1) so it doesn't require
// SharedArrayBuffer (which needs special COOP/COEP headers).
ort.env.wasm.wasmPaths = "/";
ort.env.wasm.numThreads = 1;

export async function loadModel(): Promise<ort.InferenceSession> {
	const session = await ort.InferenceSession.create("/yolov8n.onnx", {
		executionProviders: ["wasm"],
	});

	return session;
}

export function preprocess(
	source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
	modelWidth: number,
	modelHeight: number,
): ort.Tensor {
	const canvas = document.createElement("canvas");
	canvas.width = modelWidth;
	canvas.height = modelHeight;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Could not get 2d context");

	ctx.drawImage(source, 0, 0, modelWidth, modelHeight);
	const imgData = ctx.getImageData(0, 0, modelWidth, modelHeight);
	const pixels = imgData.data;

	const float32Data = new Float32Array(3 * modelWidth * modelHeight);

	for (let i = 0; i < pixels.length / 4; i++) {
		float32Data[i] = pixels[i * 4] / 255.0; // R
		float32Data[i + modelWidth * modelHeight] = pixels[i * 4 + 1] / 255.0; // G
		float32Data[i + 2 * modelWidth * modelHeight] = pixels[i * 4 + 2] / 255.0; // B
	}

	return new ort.Tensor("float32", float32Data, [
		1,
		3,
		modelHeight,
		modelWidth,
	]);
}

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
	prob: number;
	classId: number;
}

export function postprocess(
	tensor: ort.Tensor,
	originalWidth: number,
	originalHeight: number,
	modelWidth: number,
	modelHeight: number,
): Box[] {
	const data = tensor.data as Float32Array;
	// YOLOv8 output shape: [1, 84, 8400]
	const numClasses = 80;
	const numBoxes = 8400;

	const boxes: Box[] = [];

	for (let i = 0; i < numBoxes; i++) {
		let maxProb = 0;
		let classId = -1;

		for (let c = 0; c < numClasses; c++) {
			const prob = data[(4 + c) * numBoxes + i];
			if (prob > maxProb) {
				maxProb = prob;
				classId = c;
			}
		}

		if (maxProb > 0.4) {
			const xc = data[0 * numBoxes + i];
			const yc = data[1 * numBoxes + i];
			const w = data[2 * numBoxes + i];
			const h = data[3 * numBoxes + i];

			const x = ((xc - w / 2) / modelWidth) * originalWidth;
			const y = ((yc - h / 2) / modelHeight) * originalHeight;
			const width = (w / modelWidth) * originalWidth;
			const height = (h / modelHeight) * originalHeight;

			boxes.push({ x, y, w: width, h: height, prob: maxProb, classId });
		}
	}

	boxes.sort((a, b) => b.prob - a.prob);
	const nmsBoxes: Box[] = [];
	for (let i = 0; i < boxes.length; i++) {
		let keep = true;
		for (let j = 0; j < nmsBoxes.length; j++) {
			const iou = calculateIoU(boxes[i], nmsBoxes[j]);
			if (iou > 0.45 && boxes[i].classId === nmsBoxes[j].classId) {
				keep = false;
				break;
			}
		}
		if (keep) nmsBoxes.push(boxes[i]);
	}

	return nmsBoxes;
}

function calculateIoU(box1: Box, box2: Box) {
	const xA = Math.max(box1.x, box2.x);
	const yA = Math.max(box1.y, box2.y);
	const xB = Math.min(box1.x + box1.w, box2.x + box2.w);
	const yB = Math.min(box1.y + box1.h, box2.y + box2.h);

	const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
	const box1Area = box1.w * box1.h;
	const box2Area = box2.w * box2.h;

	return interArea / (box1Area + box2Area - interArea);
}
