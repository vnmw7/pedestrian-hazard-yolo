/**
 * System: Pedestrian Hazard YOLO
 * Module: Detection UI
 * File URL: frontend/src/components/DetectionStatus.tsx
 * Purpose: Shared UI states for the detection process
 */
import React from "react";

export type DetectionState =
	| "idle"
	| "loading"
	| "success"
	| "no-detections"
	| "error";

interface DetectionStatusProps {
	status: DetectionState;
	errorMessage?: string;
	className?: string;
}

export function DetectionStatus({
	status,
	errorMessage,
	className = "",
}: DetectionStatusProps) {
	if (status === "idle") {
		return null; // Or show some placeholder "Ready to detect" message if desired
	}

	return (
		<div
			className={`p-4 rounded-lg shadow-sm border ${getStatusStyles(status)} ${className}`}
		>
			<div className="flex items-center gap-3">
				{status === "loading" && (
					<div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
				)}

				{status === "success" && (
					<svg
						className="w-5 h-5 text-green-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				)}

				{status === "no-detections" && (
					<svg
						className="w-5 h-5 text-yellow-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				)}

				{status === "error" && (
					<svg
						className="w-5 h-5 text-red-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				)}

				<span className="font-medium">
					{status === "loading" && "Examining image for hazards..."}
					{status === "success" && "Detections successful"}
					{status === "no-detections" && "No pedestrians or hazards detected"}
					{status === "error" &&
						(errorMessage || "An error occurred during detection")}
				</span>
			</div>
		</div>
	);
}

function getStatusStyles(status: DetectionState): string {
	switch (status) {
		case "loading":
			return "bg-blue-50 border-blue-100 text-blue-800";
		case "success":
			return "bg-green-50 border-green-100 text-green-800";
		case "no-detections":
			return "bg-yellow-50 border-yellow-100 text-yellow-800";
		case "error":
			return "bg-red-50 border-red-100 text-red-800";
		default:
			return "";
	}
}
