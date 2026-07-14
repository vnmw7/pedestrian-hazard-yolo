import type { Detection } from "../api/detect";

interface DetectionSummaryProps {
	detections: Detection[];
}

export function DetectionSummary({ detections }: DetectionSummaryProps) {
	if (detections.length === 0) return null;

	return (
		<div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2">
			<h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
				Detection Summary
				<span className="bg-indigo-100 text-indigo-700 text-xs py-0.5 px-2 rounded-full font-bold">
					{detections.length} object{detections.length !== 1 ? "s" : ""}
				</span>
			</h3>
			<ul className="space-y-3">
				{detections.map((det) => (
					<li
						key={`${det.class}-${det.bbox.join("-")}`}
						className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
					>
						<span className="font-medium text-slate-700 capitalize flex items-center gap-2">
							<span
								className="w-3 h-3 rounded-full"
								style={{ backgroundColor: getColorForClass(det.class) }}
							/>
							{det.class}
						</span>
						<span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
							{(det.confidence * 100).toFixed(1)}% confidence
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

// Simple deterministic color generator based on class name
function getColorForClass(className: string): string {
	let hash = 0;
	for (let i = 0; i < className.length; i++) {
		hash = className.charCodeAt(i) + ((hash << 5) - hash);
	}
	const c = (hash & 0x00ffffff).toString(16).toUpperCase();
	return `#${"00000".substring(0, 6 - c.length)}${c}`;
}
