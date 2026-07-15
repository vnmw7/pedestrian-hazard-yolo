/**
 * System: Pedestrian Hazard YOLO
 * Module: Media Geometry Tests
 * File URL: frontend/src/components/mediaGeometry.test.ts
 * Purpose: Prevent regressions in inference-frame and overlay coordinate scaling
 */
import { describe, expect, it } from "vitest";
import {
	getDownscaledDimensions,
	getRenderedMediaBounds,
} from "./mediaGeometry";

const MAX_FRAME_DIMENSION_PX = 640;

describe("media geometry", () => {
	it("preserves aspect ratio when downscaling a full-HD video frame", () => {
		expect(getDownscaledDimensions(1920, 1080, MAX_FRAME_DIMENSION_PX)).toEqual(
			{ width: 640, height: 360 },
		);
	});

	it("does not upscale a frame already below the maximum dimension", () => {
		expect(getDownscaledDimensions(320, 180, MAX_FRAME_DIMENSION_PX)).toEqual({
			width: 320,
			height: 180,
		});
	});

	it("projects downscaled detections through an object-cover viewport", () => {
		const bounds = getRenderedMediaBounds("cover", 640, 360, 1920, 1080);

		expect(bounds).toEqual({
			offsetX: 0,
			offsetY: 0,
			scaleX: 3,
			scaleY: 3,
		});
	});
});
