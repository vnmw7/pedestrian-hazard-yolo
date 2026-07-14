/**
 * System: Pedestrian Hazard YOLO
 * Module: API Client
 * File URL: frontend/src/api/detect.ts
 * Purpose: Client wrapper that posts an image to the SSR proxy route
 *          (/api/detect) and returns the Result<Detection[], string>.
 */

export type Result<T, E> =
	| { success: true; data: T }
	| { success: false; error: E };

export type Detection = {
	class: string;
	confidence: number;
	bbox: [number, number, number, number];
};

export async function detectImage(
	image: Blob,
): Promise<Result<Detection[], string>> {
	try {
		const formData = new FormData();
		formData.append("image", image);

		const response = await fetch("/api/detect", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			return {
				success: false,
				error: `Request failed: ${response.status} ${response.statusText}`,
			};
		}

		return (await response.json()) as Result<Detection[], string>;
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "An unknown network error occurred";
		return { success: false, error: message };
	}
}
