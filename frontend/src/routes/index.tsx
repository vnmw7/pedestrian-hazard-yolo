/**
 * System: Pedestrian Hazard YOLO
 * Module: Landing Page
 * File URL: frontend/src/routes/index.tsx
 * Purpose: Navigation hub linking to the simulator and image upload features
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Image as ImageIcon, Video } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="max-w-4xl mx-auto p-8 flex flex-col gap-12 animate-in fade-in duration-500">
			<div className="space-y-4 text-center">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
					Pedestrian Hazard Detection
				</h1>
				<p className="text-lg text-slate-600 max-w-2xl mx-auto">
					YOLO-powered AI object detection to identify pedestrians, vehicles,
					and potential hazards in your path.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
				<Link
					to="/simulator"
					className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all group min-w-0"
				>
					<div className="p-4 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
						<Video className="w-12 h-12" />
					</div>
					<div className="space-y-2 text-center min-w-0">
						<h2 className="text-2xl font-bold text-slate-900">
							Walking Simulator
						</h2>
						<p className="text-slate-500 text-sm">
							Experience real-time hazard detection through a pre-recorded
							walking scenario.
						</p>
					</div>
					<span className="mt-4 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg group-hover:bg-indigo-700 w-full text-center transition-colors">
						Start Simulator
					</span>
				</Link>

				<Link
					to="/upload"
					className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all group min-w-0"
				>
					<div className="p-4 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
						<ImageIcon className="w-12 h-12" />
					</div>
					<div className="space-y-2 text-center min-w-0">
						<h2 className="text-2xl font-bold text-slate-900">Upload Image</h2>
						<p className="text-slate-500 text-sm">
							Upload your own street-level images to test the YOLO model's
							capabilities.
						</p>
					</div>
					<span className="mt-4 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg group-hover:bg-indigo-700 w-full text-center transition-colors">
						Analyze Image
					</span>
				</Link>
			</div>
		</div>
	);
}
