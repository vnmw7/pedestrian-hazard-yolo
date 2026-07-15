/**
 * System: Pedestrian Hazard YOLO
 * Module: Image Upload Page
 * File URL: frontend/src/routes/upload.tsx
 * Purpose: Upload an image and run YOLO pedestrian hazard detection
 */
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

	useEffect(() => {
		return () => {
			if (activeUrlRef.current) {
				URL.revokeObjectURL(activeUrlRef.current);
			}
		};
	}, []);

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
		<section className="min-h-dvh bg-[#f4f4f0] px-4 pt-28 pb-16 sm:px-6 sm:pt-32">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header className="space-y-2">
					<p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
						Image detection
					</p>
					<h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl">
						Inspect a single frame.
					</h1>
					<p className="max-w-xl text-sm leading-6 text-zinc-600 sm:text-base">
						Upload a street-level image to highlight pedestrians and potential
						hazards.
					</p>
				</header>

				<div className="flex flex-col gap-6">
					{!file ? (
						<ImageUploader onFileSelected={handleFileSelected} />
					) : (
						<div className="flex flex-col gap-6">
							<div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm sm:p-4">
								<div className="flex items-center gap-3 overflow-hidden">
									<div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
										<img
											src={previewUrl ?? ""}
											alt="Thumbnail"
											className="size-full object-cover"
										/>
									</div>
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-zinc-900 sm:text-base">
											{file.name}
										</p>
										<p className="text-xs text-zinc-500 sm:text-sm">
											{(file.size / (1024 * 1024)).toFixed(2)} MB
										</p>
									</div>
								</div>

								<div className="flex shrink-0 items-center gap-2">
									<button
										type="button"
										onClick={handleReset}
										disabled={status === "loading"}
										className="rounded-full p-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-50"
										title="Choose Another Image"
									>
										<RefreshCw className="w-5 h-5" />
									</button>
									{status === "idle" && (
										<button
											type="button"
											onClick={handleDetect}
											className="flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-md active:scale-95 sm:px-5"
										>
											<Search className="w-4 h-4" />
											<span className="hidden sm:inline">Examine image</span>
										</button>
									)}
								</div>
							</div>

							<DetectionStatus status={status} errorMessage={errorMessage} />

							{previewUrl && (
								<div className="animate-in fade-in slide-in-from-bottom-4">
									<div className="relative w-full overflow-hidden rounded-3xl bg-zinc-950 shadow-2xl shadow-zinc-950/10">
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
		</section>
	);
}
