/**
 * System: Pedestrian Hazard YOLO
 * Module: Media Geometry
 * File URL: frontend/src/components/mediaGeometry.ts
 * Purpose: Calculate inference-frame dimensions and rendered media transforms
 */
export interface MediaDimensions {
	width: number;
	height: number;
}

export interface RenderedMediaBounds {
	offsetX: number;
	offsetY: number;
	scaleX: number;
	scaleY: number;
}

export function getDownscaledDimensions(
	sourceWidth: number,
	sourceHeight: number,
	maxDimension: number,
): MediaDimensions {
	const scale = Math.min(
		1,
		maxDimension / sourceWidth,
		maxDimension / sourceHeight,
	);

	return {
		width: Math.round(sourceWidth * scale),
		height: Math.round(sourceHeight * scale),
	};
}

export function getRenderedMediaBounds(
	objectFit: string,
	originalWidth: number,
	originalHeight: number,
	containerWidth: number,
	containerHeight: number,
): RenderedMediaBounds {
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
