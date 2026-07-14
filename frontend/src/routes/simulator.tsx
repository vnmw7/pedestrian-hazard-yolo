/**
 * System: Pedestrian Hazard YOLO
 * Module: Video Simulator Page
 * File URL: frontend/src/routes/simulator.tsx
 * Purpose: Demo the video playback and frame extraction for hazards
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/simulator")({ component: Simulator });

function Simulator() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
	const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
	const intervalRef = useRef<number | null>(null);
	const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

	const captureFrame = () => {
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
			(blob) => {
				if (blob) {
					console.log("Captured frame blob size (bytes):", blob.size);
					// Future integration: send blob to detectImage(blob)
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

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	const handleLoadedMetadata = () => {
		if (videoRef.current) {
			setVideoSize({
				width: videoRef.current.videoWidth,
				height: videoRef.current.videoHeight,
			});
		}
	};

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
					onLoadedMetadata={handleLoadedMetadata}
					className="w-full h-auto block object-contain max-h-[70vh]"
				/>
				<canvas
					ref={canvasOverlayRef}
					className="absolute top-0 left-0 w-full h-full pointer-events-none"
					width={videoSize.width}
					height={videoSize.height}
				/>
			</div>

			{/* Off-screen canvas used purely for generating blobs */}
			<canvas ref={offscreenCanvasRef} style={{ display: "none" }} />
		</div>
	);
}
