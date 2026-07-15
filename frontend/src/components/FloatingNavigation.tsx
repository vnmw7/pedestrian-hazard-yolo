/**
 * System: Pedestrian Hazard YOLO
 * Module: Mode Navigation
 * File URL: frontend/src/components/FloatingNavigation.tsx
 * Purpose: Provide compact floating navigation between video and image detection
 */
import { Link } from "@tanstack/react-router";
import { Image, Video } from "lucide-react";

const NAVIGATION_ITEMS = [
	{
		to: "/" as const,
		label: "Simulation",
		icon: Video,
	},
	{
		to: "/upload" as const,
		label: "Image upload",
		icon: Image,
	},
];

export function FloatingNavigation() {
	return (
		<nav
			aria-label="Detection mode"
			className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-black/55 p-1.5 shadow-2xl shadow-black/20 backdrop-blur-xl"
		>
			<div className="flex items-center gap-1">
				{NAVIGATION_ITEMS.map(({ to, label, icon: Icon }) => (
					<Link
						key={to}
						to={to}
						activeOptions={{ exact: true }}
						className="flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						activeProps={{
							className:
								"bg-white text-zinc-950 shadow-sm hover:bg-white hover:text-zinc-950",
						}}
					>
						<Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
						<span className="whitespace-nowrap">{label}</span>
					</Link>
				))}
			</div>
		</nav>
	);
}
