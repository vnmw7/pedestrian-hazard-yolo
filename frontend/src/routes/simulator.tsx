/**
 * System: Pedestrian Hazard YOLO
 * Module: Video Simulator Page
 * File URL: frontend/src/routes/simulator.tsx
 * Purpose: Demo the video playback and frame extraction for hazards
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { detectImage, type Detection } from "../api/detect";
import { DetectionCanvas } from "../components/DetectionCanvas";

export const Route = createFileRoute("/simulator")({ component: Simulator });

function Simulator() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
	const intervalRef = useRef<number | null>(null);

	const isRequestRunning = useRef(false);
	const isMounted = useRef(true);

	const [detections, setDetections] = useState<Detection[]>([]);

	// Ensure cleanup flags
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	const captureFrame = () => {
		if (isRequestRunning.current) return;

		const video = videoRef.current;
		const canvas = offscreenCanvasRef.current;
		if (!video || !canvas) return;

		// Ensure canvas matches video native resolution
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		canvas.toBlob(
			async (blob) => {
				if (blob) {
					isRequestRunning.current = true;
					try {
						const result = await detectImage(blob);
						if (isMounted.current && result.success) {
							setDetections(result.data);
						}
					} finally {
						isRequestRunning.current = false;
					}
				}
			},
			"image/webp",
			0.8,
		);
	};

	const handlePlay = () => {
		// Clear any existing interval just in case
		if (intervalRef.current) clearInterval(intervalRef.current);

		intervalRef.current = window.setInterval(captureFrame, 500);
	};

	const handlePauseOrEnded = () => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	const handleSeeked = () => {
		if (videoRef.current && videoRef.current.currentTime === 0) {
			setDetections([]);
		}
	};

	const highestConfidenceDetection = useMemo(() => {
		if (detections.length === 0) return null;
		return detections.reduce((prev, current) => {
			return prev.confidence > current.confidence ? prev : current;
		}, detections[0]);
	}, [detections]);

	return (
		<div className="max-w-4xl mx-auto p-8 flex flex-col gap-8 animate-in fade-in duration-500">
			<div className="space-y-4 text-center mb-4">
				<h1 className="text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
					Video Simulator
				</h1>
				<p className="text-lg text-slate-600 max-w-2xl mx-auto">
					Play a sample walking video. The system will automatically extract
					frames every 500ms while playing.
				</p>
			</div>

			<div className="relative w-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 shadow-lg mx-auto flex items-center justify-center min-h-[400px]">
				<video
					ref={videoRef}
					src="/walking.mp4"
					controls
					autoPlay={false}
					muted={false}
					onPlay={handlePlay}
					onPause={handlePauseOrEnded}
					onEnded={handlePauseOrEnded}
					onSeeked={handleSeeked}
					className="w-full h-auto block object-contain max-h-[70vh]"
				/>
				<DetectionCanvas targetRef={videoRef} detections={detections} />
			</div>

			{/* Hazard Warning UI */}
			<div className="flex flex-col items-center gap-4">
				<div className="flex items-center gap-4 bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200 w-full">
					<div className="flex-1">
						<h3 className="text-lg font-semibold text-slate-800">
							Live Detections: {detections.length}
						</h3>
					</div>
					{highestConfidenceDetection && (
						<div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg shadow-inner">
							Potential hazard: {highestConfidenceDetection.class} detected —{" "}
							{Math.round(highestConfidenceDetection.confidence * 100)}%
						</div>
					)}
					{!highestConfidenceDetection && (
						<div className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 font-bold rounded-lg shadow-inner">
							Clear path. No hazards detected.
						</div>
					)}
				</div>
			</div>

			{/* Off-screen canvas used purely for generating blobs */}
			<canvas ref={offscreenCanvasRef} style={{ display: "none" }} />
		</div>
	);
}
