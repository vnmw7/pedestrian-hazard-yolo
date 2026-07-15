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

const CAPTURE_INTERVAL_MS = 500;
const FRAME_QUALITY = 0.8;
const CONFIDENCE_PERCENT_MULTIPLIER = 100;
type AnalysisState = "analyzing" | "ready" | "unavailable";

export function VideoSimulator() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
	const intervalRef = useRef<number | null>(null);
	const isRequestRunningRef = useRef(false);
	const isMountedRef = useRef(true);
	const [detections, setDetections] = useState<Detection[]>([]);
	const [analysisState, setAnalysisState] =
		useState<AnalysisState>("analyzing");

	// Ensure cleanup flags
	useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
			if (intervalRef.current !== null) {
				window.clearInterval(intervalRef.current);
			}
		};
	}, []);

	const captureFrame = () => {
		if (isRequestRunningRef.current) return;

		const video = videoRef.current;
		const canvas = offscreenCanvasRef.current;
		if (
			!video ||
			!canvas ||
			video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
		) {
			return;
		}

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const context = canvas.getContext("2d");
		if (!context) return;

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
					if (isMountedRef.current) {
						if (result.success) {
							setDetections(result.data);
							setAnalysisState("ready");
						} else {
							setDetections([]);
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
	};

	const handlePlay = () => {
		// Clear any existing interval just in case
		if (intervalRef.current !== null) {
			window.clearInterval(intervalRef.current);
		}
		setDetections([]);
		setAnalysisState("analyzing");
		captureFrame();
		intervalRef.current = window.setInterval(captureFrame, CAPTURE_INTERVAL_MS);
	};

	const handlePauseOrEnded = () => {
		if (intervalRef.current !== null) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	const handleSeeked = () => {
		if (videoRef.current?.currentTime === 0) {
			setDetections([]);
			setAnalysisState("analyzing");
		}
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
			<DetectionCanvas targetRef={videoRef} detections={detections} />

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

			{/* Off-screen canvas used purely for generating blobs */}
			<canvas ref={offscreenCanvasRef} className="hidden" />
		</section>
	);
}
