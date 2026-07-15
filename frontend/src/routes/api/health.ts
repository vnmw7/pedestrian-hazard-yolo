/**
 * System: Pedestrian Hazard YOLO
 * Module: Health Check Proxy (Server Route)
 * File URL: frontend/src/routes/api/health.ts
 * Purpose: Server-side proxy that forwards health requests to the Rust YOLO backend.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
	component: () => null,
	server: {
		handlers: {
			GET: async (): Promise<Response> => {
				try {
					const backendUrl =
						import.meta.env.VITE_BACKEND_URL ?? "http://localhost:7860";

					const upstream = await fetch(`${backendUrl}/health`);

					if (!upstream.ok) {
						return Response.json({ status: "unavailable" }, { status: 502 });
					}

					const data = await upstream.json();
					return Response.json({ success: true, data });
				} catch (_error) {
					return Response.json(
						{ success: false, error: "Failed to reach the detection service." },
						{ status: 502 },
					);
				}
			},
		},
	},
});
