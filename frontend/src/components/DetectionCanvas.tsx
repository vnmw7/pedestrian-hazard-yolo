/**
 * System: Pedestrian Hazard YOLO
 * Module: Detection UI
 * File URL: frontend/src/components/DetectionCanvas.tsx
 * Purpose: A reusable canvas component to overlay bounding boxes on images/videos
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Detection } from "../api/detect";

interface DetectionCanvasProps {
	targetRef: React.RefObject<HTMLImageElement | HTMLVideoElement | null>;
	detections: Detection[];
	className?: string;
}

export function DetectionCanvas({
	targetRef,
	detections,
	className = "",
}: DetectionCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const target = targetRef.current;
		if (!target) return;

		const updateSize = () => {
			setSize({
				width: target.clientWidth,
				height: target.clientHeight,
			});
		};

		// Initial size
		updateSize();

		// Redraw when the browser window or element resizes
		const resizeObserver = new ResizeObserver(() => {
			updateSize();
		});

		resizeObserver.observe(target);

		return () => {
			resizeObserver.disconnect();
		};
	}, [targetRef]);

	useEffect(() => {
		const canvas = canvasRef.current;
		const target = targetRef.current;
		if (!canvas || !target) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear old detections before drawing new results
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (detections.length === 0) return;

		let originalWidth = 0;
		let originalHeight = 0;

		if (target instanceof HTMLImageElement) {
			originalWidth = target.naturalWidth;
			originalHeight = target.naturalHeight;
		} else if (target instanceof HTMLVideoElement) {
			originalWidth = target.videoWidth;
			originalHeight = target.videoHeight;
		}

		if (!originalWidth || !originalHeight) return;

		// Scale backend coordinates to the displayed dimensions
		const scaleX = size.width / originalWidth;
		const scaleY = size.height / originalHeight;

		for (const det of detections) {
			const [x, y, w, h] = det.bbox;
			const scaledX = x * scaleX;
			const scaledY = y * scaleY;
			const scaledW = w * scaleX;
			const scaledH = h * scaleY;

			// Draw a rectangle for each detection
			ctx.strokeStyle = "#ef4444"; // Tailwind Red-500
			ctx.lineWidth = 3;
			ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

			// Display the class name and confidence
			const text = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
			ctx.font = "600 14px system-ui, -apple-system, sans-serif";
			const textWidth = ctx.measureText(text).width;
			const padding = 6;
			const bgHeight = 24;

			ctx.fillStyle = "#ef4444";
			ctx.fillRect(
				scaledX,
				scaledY - bgHeight,
				textWidth + padding * 2,
				bgHeight,
			);

			ctx.fillStyle = "#ffffff";
			ctx.textBaseline = "middle";
			ctx.fillText(text, scaledX + padding, scaledY - bgHeight / 2);
		}
	}, [detections, size, targetRef]);

	return (
		<canvas
			ref={canvasRef}
			width={size.width}
			height={size.height}
			className={`absolute top-0 left-0 pointer-events-none ${className}`}
			style={{ width: size.width, height: size.height }}
		/>
	);
}
