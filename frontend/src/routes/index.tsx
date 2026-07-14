/**
 * System: Pedestrian Hazard YOLO
 * Module: Home Page
 * File URL: frontend/src/routes/index.tsx
 * Purpose: Demo the shared frontend detection system components
 */
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { type Detection, detectImage } from "../api/detect";
import { DetectionCanvas } from "../components/DetectionCanvas";
import {
	type DetectionState,
	DetectionStatus,
} from "../components/DetectionStatus";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [detections, setDetections] = useState<Detection[]>([]);
	const [status, setStatus] = useState<DetectionState>("idle");
	const [errorMessage, setErrorMessage] = useState<string>();

	const imageRef = useRef<HTMLImageElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		setFile(selectedFile);
		// Cleanup previous object URL to avoid memory leaks
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		const url = URL.createObjectURL(selectedFile);
		setPreviewUrl(url);
		setDetections([]);
		setStatus("idle");
		setErrorMessage(undefined);
	};

	const handleDetect = async () => {
		if (!file) return;

		setStatus("loading");
		const result = await detectImage(file);

		if (result.success) {
			setDetections(result.data);
			if (result.data.length > 0) {
				setStatus("success");
			} else {
				setStatus("no-detections");
			}
		} else {
			setStatus("error");
			setErrorMessage(result.error);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-8 flex flex-col gap-8">
			<div className="space-y-4">
				<h1 className="text-4xl font-bold tracking-tight text-slate-900">
					Pedestrian Hazard Detection
				</h1>
				<p className="text-slate-600">
					Upload an image to test the detection system.
				</p>

				<div className="flex items-center gap-4">
					<input
						type="file"
						accept="image/*"
						onChange={handleFileChange}
						className="file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
						disabled={status === "loading"}
					/>
					<button
						onClick={handleDetect}
						disabled={!file || status === "loading"}
						className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{status === "loading" ? "Detecting..." : "Run Detection"}
					</button>
				</div>

				<DetectionStatus status={status} errorMessage={errorMessage} />
			</div>

			{previewUrl && (
				<div className="relative w-full border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm">
					<img
						ref={imageRef}
						src={previewUrl}
						alt="Preview"
						className="w-full h-auto block"
					/>
					<DetectionCanvas targetRef={imageRef} detections={detections} />
				</div>
			)}
		</div>
	);
}
