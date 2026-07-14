/**
 * System: Pedestrian Hazard YOLO
 * Module: Detection Proxy (Server Route)
 * File URL: frontend/src/routes/api/detect.ts
 * Purpose: Server-side proxy that forwards uploaded images to the Rust YOLO
 *          backend, hiding it from the browser and avoiding CORS. Always
 *          responds with the Result<T, E> JSON shape.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/detect")({
	component: () => null,
	server: {
		handlers: {
			POST: async ({ request }): Promise<Response> => {
				try {
					const formData = await request.formData();

					const backendUrl =
						import.meta.env.VITE_BACKEND_URL ?? "http://localhost:7860";

					const upstream = await fetch(`${backendUrl}/api/v1/detect`, {
						method: "POST",
						body: formData,
					});

					if (!upstream.ok) {
						const text = await upstream.text().catch(() => "");
						return Response.json(
							{
								success: false,
								error: text || `Backend error ${upstream.status}`,
							},
							{ status: 200 },
						);
					}

					const json = (await upstream.json()) as { detections?: unknown[] };
					return Response.json({ success: true, data: json.detections ?? [] });
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
							: "Failed to reach the detection service.";
					return Response.json({ success: false, error: message });
				}
			},
		},
	},
});
