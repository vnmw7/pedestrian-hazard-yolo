import { AlertCircle, Camera, Play, Square } from "lucide-react";
import type { InferenceSession } from "onnxruntime-web";
import { useEffect, useRef, useState } from "react";
import { type Box, loadModel, postprocess, preprocess } from "./utils/yolo";

export default function App() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [session, setSession] = useState<InferenceSession | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestRef = useRef<number>(0);

	useEffect(() => {
		loadModel()
			.then((s) => {
				setSession(s);
				setLoading(false);
			})
			.catch((err) => {
				console.error("Failed to load model", err);
				setError(err.message);
				setLoading(false);
			});
	}, []);

	const detectFrame = async () => {
		if (!videoRef.current || !canvasRef.current || !session) return;
		const video = videoRef.current;
		const canvas = canvasRef.current;

		if (video.paused || video.ended) {
			setIsPlaying(false);
			return;
		}

		if (
			canvas.width !== video.videoWidth ||
			canvas.height !== video.videoHeight
		) {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
		}

		try {
			const tensor = preprocess(video, 640, 640);
			const output = await session.run({ [session.inputNames[0]]: tensor });
			const outTensor = output[session.outputNames[0]];

			const boxes = postprocess(
				outTensor,
				video.videoWidth,
				video.videoHeight,
				640,
				640,
			);
			drawBoxes(boxes, canvas);
		} catch (e) {
			console.error("Inference error:", e);
		}

		requestRef.current = requestAnimationFrame(detectFrame);
	};

	const drawBoxes = (boxes: Box[], canvas: HTMLCanvasElement) => {
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		boxes.forEach((box) => {
			const isPerson = box.classId === 0;
			ctx.strokeStyle = isPerson ? "#ef4444" : "#eab308";
			ctx.lineWidth = 3;
			ctx.strokeRect(box.x, box.y, box.w, box.h);

			ctx.fillStyle = isPerson ? "#ef4444" : "#eab308";
			ctx.font = "16px sans-serif";
			const label = `${isPerson ? "Person" : `Class ${box.classId}`} ${Math.round(box.prob * 100)}%`;

			const textWidth = ctx.measureText(label).width;
			ctx.fillRect(box.x, box.y - 24, textWidth + 8, 24);
			ctx.fillStyle = "#ffffff";
			ctx.fillText(label, box.x + 4, box.y - 6);
		});
	};

	const togglePlay = () => {
		if (!videoRef.current) return;
		if (isPlaying) {
			videoRef.current.pause();
			setIsPlaying(false);
			cancelAnimationFrame(requestRef.current);
		} else {
			videoRef.current.play();
			setIsPlaying(true);
			requestRef.current = requestAnimationFrame(detectFrame);
		}
	};

	return (
		<div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-8 font-sans">
			<div className="max-w-4xl w-full flex flex-col gap-8">
				<header className="text-center">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
						Pedestrian Hazard Detection
					</h1>
					<p className="text-neutral-400 text-lg">
						YOLOv8 ONNX real-time inference in the browser
					</p>
				</header>

				{error && (
					<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
						<AlertCircle className="w-5 h-5" />
						<p>{error}</p>
					</div>
				)}

				<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
					<div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800">
						<video
							ref={videoRef}
							src="/source_video.mp4"
							className="absolute inset-0 w-full h-full object-contain"
							loop
							muted
							playsInline
							crossOrigin="anonymous"
						/>
						<canvas
							ref={canvasRef}
							className="absolute inset-0 w-full h-full object-contain pointer-events-none"
						/>

						{loading && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
								<div className="flex flex-col items-center gap-4">
									<div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
									<p className="text-red-400 font-medium">
										Loading YOLOv8 Model...
									</p>
								</div>
							</div>
						)}
					</div>

					<div className="mt-4 flex justify-between items-center px-2">
						<div className="flex items-center gap-3">
							<Camera className="w-5 h-5 text-neutral-500" />
							<span className="text-neutral-400 font-medium">
								source_video.mp4
							</span>
						</div>

						<button
							type="button"
							onClick={togglePlay}
							disabled={loading}
							className="flex items-center gap-2 bg-neutral-100 text-neutral-900 px-6 py-2.5 rounded-full font-semibold hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
						>
							{isPlaying ? (
								<>
									<Square className="w-4 h-4 fill-current" /> Pause
								</>
							) : (
								<>
									<Play className="w-4 h-4 fill-current" /> Start Inference
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
