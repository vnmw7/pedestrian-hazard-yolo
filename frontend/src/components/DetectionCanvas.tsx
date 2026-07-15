/**
 * System: Pedestrian Hazard YOLO
 * Module: Detection UI
 * File URL: frontend/src/components/DetectionCanvas.tsx
 * Purpose: A reusable canvas component to overlay bounding boxes on images/videos
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Detection } from "../api/detect";

interface RenderedMediaBounds {
	offsetX: number;
	offsetY: number;
	scaleX: number;
	scaleY: number;
}

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

		const context = canvas.getContext("2d");
		if (!context) return;
		const pixelRatio = window.devicePixelRatio || 1;
		context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

		// Clear old detections before drawing new results
		context.clearRect(0, 0, size.width, size.height);

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

		const { offsetX, offsetY, scaleX, scaleY } = getRenderedMediaBounds(
			target,
			originalWidth,
			originalHeight,
			size.width,
			size.height,
		);

		for (const det of detections) {
			const [x, y, w, h] = det.bbox;
			const scaledX = offsetX + x * scaleX;
			const scaledY = offsetY + y * scaleY;
			const scaledW = w * scaleX;
			const scaledH = h * scaleY;

			// Draw a rectangle for each detection
			context.strokeStyle = "#ef4444"; // Tailwind Red-500
			context.lineWidth = 3;
			context.strokeRect(scaledX, scaledY, scaledW, scaledH);

			// Display the class name and confidence
			const text = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
			context.font = "600 14px system-ui, -apple-system, sans-serif";
			const textWidth = context.measureText(text).width;
			const padding = 6;
			const bgHeight = 24;

			context.fillStyle = "#ef4444";
			context.fillRect(
				scaledX,
				scaledY - bgHeight,
				textWidth + padding * 2,
				bgHeight,
			);

			context.fillStyle = "#ffffff";
			context.textBaseline = "middle";
			context.fillText(text, scaledX + padding, scaledY - bgHeight / 2);
		}
	}, [detections, size, targetRef]);

	const pixelRatio =
		typeof window === "undefined" ? 1 : window.devicePixelRatio;

	return (
		<canvas
			ref={canvasRef}
			width={Math.round(size.width * pixelRatio)}
			height={Math.round(size.height * pixelRatio)}
			className={`pointer-events-none absolute inset-0 ${className}`}
			style={{ width: size.width, height: size.height }}
		/>
	);
}

function getRenderedMediaBounds(
	target: HTMLImageElement | HTMLVideoElement,
	originalWidth: number,
	originalHeight: number,
	containerWidth: number,
	containerHeight: number,
): RenderedMediaBounds {
	const objectFit = window.getComputedStyle(target).objectFit;
	const containScale = Math.min(
		containerWidth / originalWidth,
		containerHeight / originalHeight,
	);

	if (objectFit === "fill") {
		return {
			offsetX: 0,
			offsetY: 0,
			scaleX: containerWidth / originalWidth,
			scaleY: containerHeight / originalHeight,
		};
	}

	let scale = containScale;
	if (objectFit === "cover") {
		scale = Math.max(
			containerWidth / originalWidth,
			containerHeight / originalHeight,
		);
	} else if (objectFit === "none") {
		scale = 1;
	} else if (objectFit === "scale-down") {
		scale = Math.min(1, containScale);
	}

	const renderedWidth = originalWidth * scale;
	const renderedHeight = originalHeight * scale;

	return {
		offsetX: (containerWidth - renderedWidth) / 2,
		offsetY: (containerHeight - renderedHeight) / 2,
		scaleX: scale,
		scaleY: scale,
	};
}
