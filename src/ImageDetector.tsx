/**
 * System: Pedestrian Hazard YOLO
 * Module: Image Detection
 * File URL: src/ImageDetector.tsx
 * Purpose: Upload local images and run classified YOLO inference in the browser
 */

import {
	AlertCircle,
	CheckCircle2,
	Image as ImageIcon,
	LoaderCircle,
	RefreshCw,
	Search,
	UploadCloud,
} from "lucide-react";
import type { InferenceSession } from "onnxruntime-web";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { getCocoClassLabel } from "./utils/cocoClasses";
import {
	CONFIDENCE_PERCENT_MULTIPLIER,
	drawBoxes,
	getDetectionColor,
} from "./utils/detectionOverlay";
import { type Box, detectObjects } from "./utils/yolo";

const BYTES_PER_MEGABYTE = 1024 * 1024;
const MAX_FILE_SIZE_MEGABYTES = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MEGABYTES * BYTES_PER_MEGABYTE;
const FILE_SIZE_DECIMAL_PLACES = 2;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type DetectionStatus = "idle" | "loading" | "success" | "empty" | "error";

type Result<T, E> = { success: true; data: T } | { success: false; error: E };

interface ImageDetectorProps {
	session: InferenceSession | null;
}

function validateImageFile(file: File): Result<File, string> {
	if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
		return {
			success: false,
			error: "Choose a JPEG, PNG, or WebP image.",
		};
	}

	if (file.size > MAX_FILE_SIZE_BYTES) {
		return {
			success: false,
			error: `Choose an image smaller than ${MAX_FILE_SIZE_MEGABYTES} MB.`,
		};
	}

	return { success: true, data: file };
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: "The image could not be analyzed.";
}

export function ImageDetector({ session }: ImageDetectorProps) {
	const imageRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const activeUrlRef = useRef<string | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [detections, setDetections] = useState<Box[]>([]);
	const [status, setStatus] = useState<DetectionStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isImageReady, setIsImageReady] = useState(false);

	useEffect(() => {
		return () => {
			if (activeUrlRef.current) {
				URL.revokeObjectURL(activeUrlRef.current);
			}
		};
	}, []);

	const selectFile = (selectedFile: File): void => {
		const validationResult = validateImageFile(selectedFile);
		if (!validationResult.success) {
			setError(validationResult.error);
			return;
		}

		if (activeUrlRef.current) {
			URL.revokeObjectURL(activeUrlRef.current);
		}

		const nextPreviewUrl = URL.createObjectURL(validationResult.data);
		activeUrlRef.current = nextPreviewUrl;
		setFile(validationResult.data);
		setPreviewUrl(nextPreviewUrl);
		setDetections([]);
		setStatus("idle");
		setError(null);
		setIsImageReady(false);
	};

	const resetImage = (): void => {
		if (activeUrlRef.current) {
			URL.revokeObjectURL(activeUrlRef.current);
			activeUrlRef.current = null;
		}

		setFile(null);
		setPreviewUrl(null);
		setDetections([]);
		setStatus("idle");
		setError(null);
		setIsImageReady(false);
	};

	const handleImageLoad = (): void => {
		const image = imageRef.current;
		const canvas = canvasRef.current;
		if (!image || !canvas) return;

		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		drawBoxes([], canvas);
		setIsImageReady(true);
	};

	const handleDetect = async (): Promise<void> => {
		const image = imageRef.current;
		const canvas = canvasRef.current;
		if (!session || !image || !canvas || !isImageReady) return;

		setStatus("loading");
		setError(null);

		try {
			const nextDetections = await detectObjects(
				session,
				image,
				image.naturalWidth,
				image.naturalHeight,
			);
			drawBoxes(nextDetections, canvas);
			setDetections(nextDetections);
			setStatus(nextDetections.length > 0 ? "success" : "empty");
		} catch (inferenceError: unknown) {
			console.error("Image inference error", inferenceError);
			setStatus("error");
			setError(getErrorMessage(inferenceError));
		}
	};

	const handleDragEvent = (event: React.DragEvent<HTMLLabelElement>): void => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(event.type === "dragenter" || event.type === "dragover");
	};

	const handleDrop = (event: React.DragEvent<HTMLLabelElement>): void => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(false);
		const [droppedFile] = Array.from(event.dataTransfer.files);
		if (droppedFile) selectFile(droppedFile);
	};

	const handleFileChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	): void => {
		const [selectedFile] = Array.from(event.target.files ?? []);
		if (selectedFile) selectFile(selectedFile);
	};

	return (
		<section className="image-detector" aria-busy={status === "loading"}>
			<div className="image-detector-content">
				<header className="image-page-header">
					<p className="image-page-kicker">Image detection</p>
					<h1>Inspect a single frame.</h1>
					<p>
						Upload a street-level image to classify pedestrians, vehicles,
						traffic objects, and other visible hazards.
					</p>
				</header>

				{!file ? (
					<div>
						<label
							className={`image-dropzone ${isDragging ? "is-dragging" : ""}`}
							onDragEnter={handleDragEvent}
							onDragLeave={handleDragEvent}
							onDragOver={handleDragEvent}
							onDrop={handleDrop}
						>
							<span className="upload-icon-wrap">
								<UploadCloud aria-hidden="true" />
							</span>
							<strong>Drop an image or browse</strong>
							<span>JPEG, PNG or WebP · 10 MB maximum</span>
							<input
								type="file"
								className="visually-hidden"
								accept={ACCEPTED_IMAGE_TYPES.join(",")}
								onChange={handleFileChange}
							/>
						</label>
						{error && (
							<p className="upload-error" role="alert">
								<AlertCircle aria-hidden="true" />
								{error}
							</p>
						)}
					</div>
				) : (
					<div className="image-workspace">
						<div className="image-toolbar">
							<div className="selected-file">
								<div className="image-thumbnail">
									{previewUrl ? (
										<img src={previewUrl} alt="" />
									) : (
										<ImageIcon aria-hidden="true" />
									)}
								</div>
								<div className="file-details">
									<strong>{file.name}</strong>
									<span>
										{(file.size / BYTES_PER_MEGABYTE).toFixed(
											FILE_SIZE_DECIMAL_PLACES,
										)}{" "}
										MB
									</span>
								</div>
							</div>

							<div className="image-actions">
								<button
									type="button"
									className="icon-button"
									onClick={resetImage}
									disabled={status === "loading"}
									aria-label="Choose another image"
									title="Choose another image"
								>
									<RefreshCw aria-hidden="true" />
								</button>
								<button
									type="button"
									className="examine-button"
									onClick={handleDetect}
									disabled={!session || !isImageReady || status === "loading"}
								>
									{status === "loading" ? (
										<LoaderCircle className="is-spinning" aria-hidden="true" />
									) : (
										<Search aria-hidden="true" />
									)}
									<span>
										{status === "loading" ? "Examining" : "Examine image"}
									</span>
								</button>
							</div>
						</div>

						{status !== "idle" && (
							<div className={`image-status is-${status}`} aria-live="polite">
								{status === "loading" ? (
									<LoaderCircle className="is-spinning" aria-hidden="true" />
								) : status === "error" ? (
									<AlertCircle aria-hidden="true" />
								) : (
									<CheckCircle2 aria-hidden="true" />
								)}
								<span>
									{status === "loading" && "Examining image for objects…"}
									{status === "success" &&
										`${detections.length} object${detections.length === 1 ? "" : "s"} classified`}
									{status === "empty" && "No objects were detected"}
									{status === "error" && error}
								</span>
							</div>
						)}

						{previewUrl && (
							<div className="image-preview-section">
								<div className="image-preview-frame">
									<img
										ref={imageRef}
										src={previewUrl}
										alt="Uploaded street scene ready for detection"
										onLoad={handleImageLoad}
									/>
									<canvas ref={canvasRef} className="image-detection-canvas" />
								</div>

								{detections.length > 0 && (
									<section
										className="detection-summary"
										aria-labelledby="summary-title"
									>
										<div className="summary-header">
											<h2 id="summary-title">Detection summary</h2>
											<span>{detections.length}</span>
										</div>
										<ul>
											{detections.map((detection) => (
												<li
													key={`${detection.classId}-${detection.x}-${detection.y}-${detection.w}-${detection.h}-${detection.prob}`}
												>
													<span className="detected-class">
														<span
															className="class-color"
															style={{
																backgroundColor: getDetectionColor(
																	detection.classId,
																),
															}}
														/>
														{getCocoClassLabel(detection.classId)}
													</span>
													<span className="detection-confidence">
														{Math.round(
															detection.prob * CONFIDENCE_PERCENT_MULTIPLIER,
														)}
														% confidence
													</span>
												</li>
											))}
										</ul>
									</section>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
