/**
 * System: Pedestrian Hazard YOLO
 * Module: Browser Detection Experience
 * File URL: src/App.tsx
 * Purpose: Coordinate video and image hazard detection with shared ONNX inference
 */

import {
	LoaderCircle,
	Play,
	ShieldCheck,
	TriangleAlert,
	WifiOff,
} from "lucide-react";
import type { InferenceSession } from "onnxruntime-web";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { type DetectionMode, FloatingNavigation } from "./FloatingNavigation";
import { ImageDetector } from "./ImageDetector";
import { getCocoClassLabel } from "./utils/cocoClasses";
import {
	CONFIDENCE_PERCENT_MULTIPLIER,
	drawBoxes,
} from "./utils/detectionOverlay";
import { type Box, detectObjects, loadModel } from "./utils/yolo";

function getErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: "The detector could not start.";
}

export default function App() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const requestRef = useRef<number | null>(null);
	const [mode, setMode] = useState<DetectionMode>("video");
	const [session, setSession] = useState<InferenceSession | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isModelLoading, setIsModelLoading] = useState(true);
	const [hasAnalyzed, setHasAnalyzed] = useState(false);
	const [detections, setDetections] = useState<Box[]>([]);
	const [modelError, setModelError] = useState<string | null>(null);
	const [analysisError, setAnalysisError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		loadModel()
			.then((loadedSession) => {
				if (!isMounted) return;
				setSession(loadedSession);
				setIsModelLoading(false);
			})
			.catch((loadError: unknown) => {
				if (!isMounted) return;
				console.error("Failed to load model", loadError);
				setModelError(getErrorMessage(loadError));
				setIsModelLoading(false);
			});

		return () => {
			isMounted = false;
			if (requestRef.current !== null) {
				cancelAnimationFrame(requestRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!session || mode !== "video") return;
		videoRef.current?.play().catch(() => {
			// Native controls remain available when a browser blocks autoplay.
		});
	}, [session, mode]);

	const detectFrame = async (): Promise<void> => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || !session || video.paused || video.ended) return;

		if (
			canvas.width !== video.videoWidth ||
			canvas.height !== video.videoHeight
		) {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
		}

		try {
			const nextDetections = await detectObjects(
				session,
				video,
				video.videoWidth,
				video.videoHeight,
			);

			drawBoxes(nextDetections, canvas);
			setDetections(nextDetections);
			setHasAnalyzed(true);
			setAnalysisError(null);
		} catch (inferenceError: unknown) {
			console.error("Inference error", inferenceError);
			setAnalysisError(getErrorMessage(inferenceError));
		}

		if (!video.paused && !video.ended) {
			requestRef.current = requestAnimationFrame(detectFrame);
		}
	};

	const handlePlay = (): void => {
		if (!session) {
			videoRef.current?.pause();
			return;
		}

		if (requestRef.current !== null) {
			cancelAnimationFrame(requestRef.current);
		}
		setIsPlaying(true);
		setHasAnalyzed(false);
		requestRef.current = requestAnimationFrame(detectFrame);
	};

	const handlePause = (): void => {
		setIsPlaying(false);
		if (requestRef.current !== null) {
			cancelAnimationFrame(requestRef.current);
			requestRef.current = null;
		}
	};

	const handleSeeked = (): void => {
		setDetections([]);
		setHasAnalyzed(false);
		const canvas = canvasRef.current;
		if (canvas) drawBoxes([], canvas);
	};

	const handleModeChange = (nextMode: DetectionMode): void => {
		if (nextMode === mode) return;
		if (nextMode === "image") {
			videoRef.current?.pause();
			handlePause();
		}
		setMode(nextMode);
	};

	const highestConfidenceDetection = detections.reduce<Box | null>(
		(highest, detection) =>
			highest === null || detection.prob > highest.prob ? detection : highest,
		null,
	);
	const activeError = modelError ?? analysisError;

	return (
		<main className={`app-shell is-${mode}-mode`}>
			{mode === "video" ? (
				<>
					<section className="media-stage" aria-label="Video hazard simulation">
						<video
							ref={videoRef}
							src="/source_video.mp4"
							className="source-video"
							controls
							autoPlay
							loop
							muted
							playsInline
							preload="auto"
							crossOrigin="anonymous"
							onPlay={handlePlay}
							onPause={handlePause}
							onEnded={handlePause}
							onSeeked={handleSeeked}
							aria-label="Street-level source video"
						/>
						<canvas ref={canvasRef} className="detection-canvas" />
						<div className="media-vignette" aria-hidden="true" />
					</section>

					<div className="analysis-hud" aria-live="polite">
						<div className="analysis-status">
							<p className="status-label">
								<span>Live analysis</span>
								<span className="status-label-count">
									{detections.length} detected
								</span>
							</p>
							{activeError ? (
								<div className="status-message">
									<WifiOff
										className="status-icon is-error"
										aria-hidden="true"
									/>
									<p>Analysis unavailable</p>
								</div>
							) : highestConfidenceDetection ? (
								<div className="status-message">
									<TriangleAlert
										className="status-icon is-warning"
										aria-hidden="true"
									/>
									<p>
										{getCocoClassLabel(highestConfidenceDetection.classId)}{" "}
										detected
										<span className="confidence-value">
											{Math.round(
												highestConfidenceDetection.prob *
													CONFIDENCE_PERCENT_MULTIPLIER,
											)}
											%
										</span>
									</p>
								</div>
							) : isPlaying && hasAnalyzed ? (
								<div className="status-message">
									<ShieldCheck
										className="status-icon is-clear"
										aria-hidden="true"
									/>
									<p>Path clear</p>
								</div>
							) : isPlaying ? (
								<div className="status-message">
									<LoaderCircle
										className="status-icon is-analyzing"
										aria-hidden="true"
									/>
									<p>Analyzing path</p>
								</div>
							) : (
								<div className="status-message">
									<Play
										className="status-icon"
										aria-hidden="true"
										fill="currentColor"
									/>
									<p>Play video to begin</p>
								</div>
							)}
						</div>

						<div className="detection-count">
							<span>{detections.length}</span>
							{" detected"}
						</div>
					</div>
				</>
			) : (
				<ImageDetector session={session} />
			)}

			<FloatingNavigation mode={mode} onModeChange={handleModeChange} />

			{isModelLoading && (
				<div className="system-overlay" role="status" aria-live="polite">
					<LoaderCircle
						className="overlay-icon is-loading"
						aria-hidden="true"
					/>
					<h1>Preparing hazard detection</h1>
					<p>
						Loading the YOLOv8 model locally. Analysis stays in this browser.
					</p>
				</div>
			)}

			{modelError && !isModelLoading && (
				<div className="system-overlay" role="alert">
					<WifiOff className="overlay-icon is-error" aria-hidden="true" />
					<h1>Detection is unavailable</h1>
					<p>{modelError}</p>
					<button type="button" onClick={() => window.location.reload()}>
						Reload application
					</button>
				</div>
			)}
		</main>
	);
}
