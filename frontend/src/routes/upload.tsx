/**
 * System: Pedestrian Hazard YOLO
 * Module: Image Upload Page
 * File URL: frontend/src/routes/upload.tsx
 * Purpose: Upload an image and run YOLO pedestrian hazard detection
 */
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search } from "lucide-react";
import { useRef, useState } from "react";
import { type Detection, detectImage } from "../api/detect";
import { DetectionCanvas } from "../components/DetectionCanvas";
import {
	type DetectionState,
	DetectionStatus,
} from "../components/DetectionStatus";
import { DetectionSummary } from "../components/DetectionSummary";
import { ImageUploader } from "../components/ImageUploader";

export const Route = createFileRoute("/upload")({ component: Upload });

function Upload() {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [detections, setDetections] = useState<Detection[]>([]);
	const [status, setStatus] = useState<DetectionState>("idle");
	const [errorMessage, setErrorMessage] = useState<string>();

	const imageRef = useRef<HTMLImageElement>(null);
	const activeUrlRef = useRef<string | null>(null);

	const handleFileSelected = (selectedFile: File) => {
		setFile(selectedFile);
		// Cleanup previous object URL to avoid memory leaks safely
		if (activeUrlRef.current) {
			URL.revokeObjectURL(activeUrlRef.current);
			activeUrlRef.current = null;
		}
		const url = URL.createObjectURL(selectedFile);
		activeUrlRef.current = url;
		setPreviewUrl(url);
		setDetections([]);
		setStatus("idle");
		setErrorMessage(undefined);
	};

	const handleReset = () => {
		setFile(null);
		if (activeUrlRef.current) {
			URL.revokeObjectURL(activeUrlRef.current);
			activeUrlRef.current = null;
		}
		setPreviewUrl(null);
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
		<div className="max-w-4xl mx-auto p-8 flex flex-col gap-8 animate-in fade-in duration-500">
			<div className="space-y-4 text-center mb-4">
				<h1 className="text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
					Image Detection
				</h1>
				<p className="text-lg text-slate-600 max-w-2xl mx-auto">
					Upload an image to identify pedestrian hazards using our YOLO
					detection system.
				</p>
			</div>

			<div className="flex flex-col gap-8">
				{!file ? (
					<ImageUploader onFileSelected={handleFileSelected} />
				) : (
					<div className="flex flex-col gap-6">
						<div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
							<div className="flex items-center gap-3 overflow-hidden">
								<div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
									<img
										src={previewUrl ?? ""}
										alt="Thumbnail"
										className="w-10 h-10 object-cover rounded"
									/>
								</div>
								<div className="min-w-0">
									<p className="font-semibold text-slate-800 truncate">
										{file.name}
									</p>
									<p className="text-sm text-slate-500">
										{(file.size / (1024 * 1024)).toFixed(2)} MB
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={handleReset}
									disabled={status === "loading"}
									className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
									title="Choose Another Image"
								>
									<RefreshCw className="w-5 h-5" />
								</button>
								{status === "idle" && (
									<button
										type="button"
										onClick={handleDetect}
										className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95"
									>
										<Search className="w-4 h-4" />
										Examine Image
									</button>
								)}
							</div>
						</div>

						<DetectionStatus status={status} errorMessage={errorMessage} />

						{previewUrl && (
							<div className="animate-in fade-in slide-in-from-bottom-4">
								<div className="relative w-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
									<img
										ref={imageRef}
										src={previewUrl}
										alt="Preview"
										className="w-full h-auto block object-contain max-h-[70vh] max-w-full"
									/>
									<DetectionCanvas
										targetRef={imageRef}
										detections={detections}
									/>
								</div>

								<DetectionSummary detections={detections} />
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
