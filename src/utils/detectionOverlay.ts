/**
 * System: Pedestrian Hazard YOLO
 * Module: Detection Overlay Rendering
 * File URL: src/utils/detectionOverlay.ts
 * Purpose: Draw classified YOLO bounding boxes on video and image canvases
 */

import { getCocoClassLabel } from "./cocoClasses";
import type { Box } from "./yolo";

const PERSON_CLASS_ID = 0;
export const CONFIDENCE_PERCENT_MULTIPLIER = 100;
const DETECTION_LINE_WIDTH_PX = 3;
const LABEL_HEIGHT_PX = 24;
const LABEL_HORIZONTAL_PADDING_PX = 6;
const CANVAS_LABEL_FONT =
	"600 14px Inter, ui-sans-serif, system-ui, sans-serif";
const PERSON_COLOR = "#ef4444";
const OBJECT_COLOR = "#f59e0b";
const LABEL_TEXT_COLOR = "#ffffff";

export function getDetectionColor(classId: number): string {
	return classId === PERSON_CLASS_ID ? PERSON_COLOR : OBJECT_COLOR;
}

export function drawBoxes(boxes: Box[], canvas: HTMLCanvasElement): void {
	const context = canvas.getContext("2d");
	if (!context) return;

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.font = CANVAS_LABEL_FONT;
	context.textBaseline = "middle";

	for (const box of boxes) {
		const detectionColor = getDetectionColor(box.classId);
		const confidence = Math.round(box.prob * CONFIDENCE_PERCENT_MULTIPLIER);
		const label = `${getCocoClassLabel(box.classId)} ${confidence}%`;
		const textWidth = context.measureText(label).width;
		const labelWidth = textWidth + LABEL_HORIZONTAL_PADDING_PX * 2;
		const labelY = Math.max(box.y - LABEL_HEIGHT_PX, 0);

		context.strokeStyle = detectionColor;
		context.lineWidth = DETECTION_LINE_WIDTH_PX;
		context.strokeRect(box.x, box.y, box.w, box.h);

		context.fillStyle = detectionColor;
		context.fillRect(box.x, labelY, labelWidth, LABEL_HEIGHT_PX);
		context.fillStyle = LABEL_TEXT_COLOR;
		context.fillText(
			label,
			box.x + LABEL_HORIZONTAL_PADDING_PX,
			labelY + LABEL_HEIGHT_PX / 2,
		);
	}
}
