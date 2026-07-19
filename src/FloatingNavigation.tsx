/**
 * System: Pedestrian Hazard YOLO
 * Module: Detection Mode Navigation
 * File URL: src/FloatingNavigation.tsx
 * Purpose: Provide the floating island switch between video and image detection
 */

import { Image as ImageIcon, Video } from "lucide-react";

export type DetectionMode = "video" | "image";

interface FloatingNavigationProps {
	mode: DetectionMode;
	onModeChange: (mode: DetectionMode) => void;
}

const NAVIGATION_ITEMS = [
	{
		mode: "video" as const,
		label: "Simulation",
		icon: Video,
	},
	{
		mode: "image" as const,
		label: "Image upload",
		icon: ImageIcon,
	},
];

export function FloatingNavigation({
	mode,
	onModeChange,
}: FloatingNavigationProps) {
	return (
		<nav className="floating-navigation" aria-label="Detection mode">
			<div className="navigation-items">
				{NAVIGATION_ITEMS.map(({ mode: itemMode, label, icon: Icon }) => (
					<button
						key={itemMode}
						type="button"
						className={`navigation-button ${mode === itemMode ? "is-active" : ""}`}
						onClick={() => onModeChange(itemMode)}
						aria-pressed={mode === itemMode}
					>
						<Icon
							aria-hidden="true"
							className="navigation-icon"
							strokeWidth={1.8}
						/>
						<span>{label}</span>
					</button>
				))}
			</div>
		</nav>
	);
}
