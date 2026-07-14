import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
	Link,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Pedestrian Hazard YOLO",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-slate-50 min-h-screen text-slate-900">
				<nav className="bg-slate-900 text-white p-4 flex gap-6 shadow-md mb-8 px-8">
					<Link
						to="/"
						className="hover:text-indigo-300 font-medium transition-colors"
						activeProps={{ className: "text-indigo-400 font-bold" }}
					>
						Image Detection
					</Link>
					<Link
						to="/simulator"
						className="hover:text-indigo-300 font-medium transition-colors"
						activeProps={{ className: "text-indigo-400 font-bold" }}
					>
						Video Simulator
					</Link>
				</nav>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
