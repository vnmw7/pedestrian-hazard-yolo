/**
 * System: Pedestrian Hazard YOLO
 * Module: Video Simulator
 * File URL: frontend/src/components/VideoSimulator.tsx
 * Purpose: Run full-viewport video playback with live hazard detection overlays
 */
import {
	LoaderCircle,
	ShieldCheck,
	TriangleAlert,
	WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Detection, detectImage } from "../api/detect";
import { DetectionCanvas } from "./DetectionCanvas";
import { getDownscaledDimensions, type MediaDimensions } from "./mediaGeometry";

const CAPTURE_INTERVAL_MS = 10;
const FRAME_QUALITY = 0.8;
const CONFIDENCE_PERCENT_MULTIPLIER = 100;
const MAX_FRAME_DIMENSION_PX = 640;
const MEDIA_TIME_EPSILON_SECONDS = 0.05;
const EMPTY_DETECTIONS: Detection[] = [];
type AnalysisState = "analyzing" | "ready" | "unavailable";

interface DetectionFrame {
	detections: Detection[];
	sourceDimensions: MediaDimensions;
}

export function VideoSimulator() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoFrameCallbackRef = useRef<number | null>(null);
	const lastCapturedMediaTimeRef = useRef<number | null>(null);
	const playbackGenerationRef = useRef(0);
	const isRequestRunningRef = useRef(false);
	const isMountedRef = useRef(true);
	const [detectionFrame, setDetectionFrame] = useState<DetectionFrame | null>(
		null,
	);
	const [analysisState, setAnalysisState] =
		useState<AnalysisState>("analyzing");
	const detections = detectionFrame?.detections ?? EMPTY_DETECTIONS;

	const [serviceStatus, setServiceStatus] = useState<
		"checking" | "ready" | "failed"
	>("checking");
	const [wakeMessage, setWakeMessage] = useState("Starting detection service…");

	// Health check polling for Render cold start
	useEffect(() => {
		let isMounted = true;
		let attempts = 0;
		const maxAttempts = 18; // 18 * 5s = 90 seconds
		let timeoutId: ReturnType<typeof setTimeout>;

		const checkHealth = async () => {
			if (attempts >= 5) {
				setWakeMessage("Loading YOLO model…");
			} else {
				setWakeMessage("Starting detection service…");
			}

			try {
				const response = await fetch("/api/health");
				const result = await response.json();
				if (result.success && result.data?.status === "healthy") {
					if (isMounted) {
						setServiceStatus("ready");
					}
					return;
				}
			} catch (_e) {
				// Ignore and retry
			}

			attempts++;
			if (attempts >= maxAttempts) {
				if (isMounted) {
					setServiceStatus("failed");
				}
			} else {
				timeoutId = setTimeout(checkHealth, 5000);
			}
		};

		checkHealth();

		return () => {
			isMounted = false;
			clearTimeout(timeoutId);
		};
	}, []);

	// Ensure cleanup flags
	useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
			const video = videoRef.current;
			if (video && videoFrameCallbackRef.current !== null) {
				video.cancelVideoFrameCallback(videoFrameCallbackRef.current);
			}
		};
	}, []);

	// Start analysis loop once service is ready, catching cases where video auto-played
	// before the backend was healthy.
	useEffect(() => {
		if (serviceStatus === "ready") {
			const video = videoRef.current;
			if (video) {
				if (video.paused) {
					// Attempt to resume play if it was paused while waiting for backend
					video.play().catch(() => {});
				} else if (videoFrameCallbackRef.current === null) {
					// Video is already playing, but analysis loop wasn't started
					playbackGenerationRef.current += 1;
					lastCapturedMediaTimeRef.current = null;
					setDetectionFrame(null);
					setAnalysisState("analyzing");
					videoFrameCallbackRef.current =
						video.requestVideoFrameCallback(handleVideoFrame);
				}
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [serviceStatus]);

	const captureFrame = (mediaTime: number): boolean => {
		if (serviceStatus !== "ready") return false;
		if (isRequestRunningRef.current) return false;

		const video = videoRef.current;
		const canvas = offscreenCanvasRef.current;
		if (
			!video ||
			!canvas ||
			video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
		) {
			return false;
		}

		const sourceDimensions = getDownscaledDimensions(
			video.videoWidth,
			video.videoHeight,
			MAX_FRAME_DIMENSION_PX,
		);
		const playbackGeneration = playbackGenerationRef.current;

		canvas.width = sourceDimensions.width;
		canvas.height = sourceDimensions.height;
		const context = canvas.getContext("2d");
		if (!context) return false;

		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		isRequestRunningRef.current = true;
		canvas.toBlob(
			async (blob) => {
				if (!blob) {
					isRequestRunningRef.current = false;
					return;
				}

				try {
					const result = await detectImage(blob);
					const currentVideo = videoRef.current;
					const isCurrentTimeline =
						playbackGeneration === playbackGenerationRef.current &&
						currentVideo !== null &&
						currentVideo.currentTime + MEDIA_TIME_EPSILON_SECONDS >= mediaTime;

					if (isMountedRef.current && isCurrentTimeline) {
						if (result.success) {
							setDetectionFrame({
								detections: result.data,
								sourceDimensions,
							});
							setAnalysisState("ready");
						} else {
							setDetectionFrame(null);
							setAnalysisState("unavailable");
						}
					}
				} finally {
					isRequestRunningRef.current = false;
				}
			},
			"image/webp",
			FRAME_QUALITY,
		);

		return true;
	};

	const handleVideoFrame: VideoFrameRequestCallback = (_now, metadata) => {
		const video = videoRef.current;
		if (!video || video.paused || video.ended) return;

		const lastCapturedMediaTime = lastCapturedMediaTimeRef.current;
		const hasLooped =
			lastCapturedMediaTime !== null &&
			metadata.mediaTime < lastCapturedMediaTime;
		const elapsedMs =
			lastCapturedMediaTime === null || hasLooped
				? CAPTURE_INTERVAL_MS
				: (metadata.mediaTime - lastCapturedMediaTime) * 1000;

		if (elapsedMs >= CAPTURE_INTERVAL_MS && captureFrame(metadata.mediaTime)) {
			lastCapturedMediaTimeRef.current = metadata.mediaTime;
		}

		videoFrameCallbackRef.current =
			video.requestVideoFrameCallback(handleVideoFrame);
	};

	const handlePlay = () => {
		if (serviceStatus !== "ready") {
			const video = videoRef.current;
			if (video) video.pause();
			return;
		}

		const video = videoRef.current;
		if (!video) return;

		// Clear any existing video-frame callback just in case
		if (videoFrameCallbackRef.current !== null) {
			video.cancelVideoFrameCallback(videoFrameCallbackRef.current);
		}
		playbackGenerationRef.current += 1;
		lastCapturedMediaTimeRef.current = null;
		setDetectionFrame(null);
		setAnalysisState("analyzing");
		videoFrameCallbackRef.current =
			video.requestVideoFrameCallback(handleVideoFrame);
	};

	const handlePauseOrEnded = () => {
		const video = videoRef.current;
		if (video && videoFrameCallbackRef.current !== null) {
			video.cancelVideoFrameCallback(videoFrameCallbackRef.current);
			videoFrameCallbackRef.current = null;
		}
		playbackGenerationRef.current += 1;
	};

	const handleSeeked = () => {
		playbackGenerationRef.current += 1;
		lastCapturedMediaTimeRef.current = null;
		setDetectionFrame(null);
		setAnalysisState("analyzing");
	};

	const highestConfidenceDetection = useMemo(() => {
		if (detections.length === 0) return null;

		return detections.reduce((highest, detection) =>
			highest.confidence > detection.confidence ? highest : detection,
		);
	}, [detections]);

	return (
		<section
			aria-label="Video hazard simulation"
			className="relative h-dvh min-h-120 w-full overflow-hidden bg-black"
		>
			<video
				ref={videoRef}
				src="/walking.mp4"
				controls
				autoPlay
				muted
				loop
				playsInline
				onPlay={handlePlay}
				onPause={handlePauseOrEnded}
				onEnded={handlePauseOrEnded}
				onSeeked={handleSeeked}
				className="absolute inset-0 size-full object-cover object-center"
			>
				<track kind="captions" />
			</video>
			<DetectionCanvas
				targetRef={videoRef}
				detections={detections}
				sourceDimensions={detectionFrame?.sourceDimensions}
			/>

			{/* Hazard Warning UI */}
			<div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex items-end justify-between gap-3 p-4 sm:bottom-14 sm:p-6">
				<div className="min-w-0 rounded-2xl border border-white/15 bg-black/55 px-4 py-3 text-white shadow-xl backdrop-blur-xl">
					<p className="mb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-white/50 uppercase">
						Live analysis
					</p>
					{highestConfidenceDetection ? (
						<div className="flex items-center gap-2.5">
							<TriangleAlert
								aria-hidden="true"
								className="size-5 shrink-0 text-amber-400"
							/>
							<p className="truncate text-sm font-medium sm:text-base">
								<span className="capitalize">
									{highestConfidenceDetection.class}
								</span>{" "}
								<span className="text-white/55">
									{Math.round(
										highestConfidenceDetection.confidence *
											CONFIDENCE_PERCENT_MULTIPLIER,
									)}
									%
								</span>
							</p>
						</div>
					) : analysisState === "ready" ? (
						<div className="flex items-center gap-2.5">
							<ShieldCheck
								aria-hidden="true"
								className="size-5 shrink-0 text-emerald-400"
							/>
							<p className="text-sm font-medium sm:text-base">Path clear</p>
						</div>
					) : analysisState === "unavailable" ? (
						<div className="flex items-center gap-2.5">
							<WifiOff
								aria-hidden="true"
								className="size-5 shrink-0 text-rose-400"
							/>
							<p className="text-sm font-medium sm:text-base">
								Analysis unavailable
							</p>
						</div>
					) : (
						<div className="flex items-center gap-2.5">
							<LoaderCircle
								aria-hidden="true"
								className="size-5 shrink-0 animate-spin text-white/60"
							/>
							<p className="text-sm font-medium sm:text-base">Analyzing path</p>
						</div>
					)}
				</div>

				<div className="rounded-full border border-white/15 bg-black/55 px-3 py-2 text-xs font-medium text-white/70 shadow-xl backdrop-blur-xl sm:px-4 sm:text-sm">
					{detections.length} detected
				</div>
			</div>

			{/* Cold Start Overlay */}
			{serviceStatus !== "ready" && (
				<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 px-6 text-center backdrop-blur-md">
					{serviceStatus === "checking" ? (
						<div className="flex flex-col items-center gap-4">
							<LoaderCircle className="size-12 animate-spin text-amber-500" />
							<h3 className="text-xl font-semibold tracking-wide text-white">
								{wakeMessage}
							</h3>
							<p className="max-w-md text-sm text-white/60">
								Free Render instances spin down after 15 minutes of inactivity.
								Waking up the backend can take up to a minute.
							</p>
						</div>
					) : (
						<div className="flex flex-col items-center gap-4">
							<WifiOff className="size-12 text-rose-500" />
							<h3 className="text-xl font-semibold tracking-wide text-rose-400">
								Detection Service Offline
							</h3>
							<p className="max-w-md text-sm text-white/60">
								The service did not respond in time. Please refresh the page to
								try again.
							</p>
						</div>
					)}
				</div>
			)}

			{/* Off-screen canvas used purely for generating blobs */}
			<canvas ref={offscreenCanvasRef} className="hidden" />
		</section>
	);
}
