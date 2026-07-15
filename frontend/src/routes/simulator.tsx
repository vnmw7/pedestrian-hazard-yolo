/**
 * System: Pedestrian Hazard YOLO
 * Module: Legacy Simulator Route
 * File URL: frontend/src/routes/simulator.tsx
 * Purpose: Redirect legacy simulator links to the simulation home page
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/simulator")({
	beforeLoad: () => {
		throw redirect({ to: "/", replace: true });
	},
});
