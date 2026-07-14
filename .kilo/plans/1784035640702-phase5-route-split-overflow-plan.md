# Phase 5: Split Landing Hub from Upload + Overflow Hardening

## Status
Implementation-ready. (The previously submitted plan's diffs did not match the
actual files; this plan replaces them with verified, complete code.)

## Verified facts (from the repo)
- Tailwind v4 (`^4.1.18`), TanStack Start + `@tanstack/router-plugin`
  (`tanstackStart()` in `frontend/vite.config.ts:11`). Adding a route file
  auto-regenerates `frontend/src/routeTree.gen.ts` on dev/build; manual fallback
  `pnpm generate-routes`.
- `frontend/src/routes/__root.tsx` real structure: `<body>` → `<nav>` (lines
  43-58) → `{children}` (line 59) → `<TanStackDevtools>` → `<Scripts/>`. There
  is NO `<main>` and NO `<header>`. The nav links are "Image Detection" → `/`
  and "Video Simulator" → `/simulator`.
- `frontend/src/routes/index.tsx`: component `Home`, state is `file`/`setFile`
  (NOT `selectedFile`), handlers `handleFileSelected`/`handleReset`/`handleDetect`.
- `frontend/src/routes/simulator.tsx`: self-contains its own
  `max-w-4xl mx-auto p-8` wrapper; left unchanged.
- `frontend/src/styles.css` real content: `html, body, #app { min-height:100% }`
  + `body { margin:0 }`.
- Components exist: `DetectionCanvas`, `DetectionStatus`, `DetectionSummary`,
  `ImageUploader`. `detect.ts` exports `detectImage(image: Blob)` returning
  `Result<Detection[], string>`.
- Design system actually in use: **slate** palette, `indigo` accent,
  `rounded-xl`/`rounded-2xl`, `shadow-sm`/`shadow-lg`, `animate-in fade-in ...`,
  `tracking-tight`, `drop-shadow-sm`. (Plan's `gray` palette was inconsistent.)
- `AGENTS_2.md` (cited by the prior plan) does NOT exist; standards followed are
  `AGENTS.md` / `DEVELOPMENT_STANDARDS.md`.

## Decisions
- **PHE-15**: Extract upload feature into `routes/upload.tsx`; rewrite
  `routes/index.tsx` as a 2-card landing hub.
- **PHE-16**: No disclaimer component (omitted as instructed).
- **PHE-17 (overflow)**: Root-cause fixes are PRIMARY; a body-level guard is a
  defensive safety net, not the sole mechanism.
  - Responsive nav that wraps instead of overflowing.
  - `min-w-0` on flex/grid children that hold text.
  - `max-w-full` on the preview image.
  - `overflow-x: hidden` on `html, body, #app` (guard only).
  - Wrap `{children}` in `<main className="overflow-hidden">` (new node; no
    max-w/padding added so it does not conflict with each route's own container).
- **Nav (decision made — question was dismissed; using recommended default)**:
  three text links: Home `/`, Image Upload `/upload`, Video Simulator
  `/simulator`; nav wraps on small screens (no hamburger).

## Tasks (ordered)

### 1. `frontend/src/styles.css` — add body overflow guard
In the `html, body, #app` block, add `overflow-x: hidden;`:
```css
html,
body,
#app {
  min-height: 100%;
  overflow-x: hidden;
}
```

### 2. `frontend/src/routes/__root.tsx` — responsive nav + `<main>` guard
Edit the `<nav>` (currently `bg-slate-900 text-white p-4 flex gap-6 shadow-md mb-8 px-8`)
to wrap and use responsive padding:
```tsx
<nav className="bg-slate-900 text-white flex flex-wrap gap-x-6 gap-y-2 px-4 md:px-8 py-4 shadow-md mb-8">
```
Update the link block to three links (relabel `/` to "Home", add `/upload`):
```tsx
<Link
  to="/"
  className="hover:text-indigo-300 font-medium transition-colors"
  activeProps={{ className: "text-indigo-400 font-bold" }}
>
  Home
</Link>
<Link
  to="/upload"
  className="hover:text-indigo-300 font-medium transition-colors"
  activeProps={{ className: "text-indigo-400 font-bold" }}
>
  Image Upload
</Link>
<Link
  to="/simulator"
  className="hover:text-indigo-300 font-medium transition-colors"
  activeProps={{ className: "text-indigo-400 font-bold" }}
>
  Video Simulator
</Link>
```
Wrap `{children}` (the bare reference in `<body>`) with a guard:
```tsx
<main className="overflow-hidden">{children}</main>
```
Do NOT add max-width/padding to this `<main>` (routes own their containers).

### 3. `frontend/src/routes/upload.tsx` — NEW (complete, not a stub)
Port the current `index.tsx` body verbatim. Only changes: route `/upload`,
component `Upload`, header title `Image Detection`, and `max-w-full` on the
preview image. Full file:
```tsx
/**
 * System: Pedestrian Hazard YOLO
 * Module: Image Upload Page
 * File URL: frontend/src/routes/upload.tsx
 * Purpose: Upload an image and run YOLO pedestrian hazard detection
 */
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search } from "lucide-react";
import { useRef, useState } from "react";
import { type Detection, detectImage } from "../api/detect";
import { DetectionCanvas } from "../components/DetectionCanvas";
import {
	type DetectionState,
	DetectionStatus,
} from "../components/DetectionStatus";
import { DetectionSummary } from "../components/DetectionSummary";
import { ImageUploader } from "../components/ImageUploader";

export const Route = createFileRoute("/upload")({ component: Upload });

function Upload() {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [detections, setDetections] = useState<Detection[]>([]);
	const [status, setStatus] = useState<DetectionState>("idle");
	const [errorMessage, setErrorMessage] = useState<string>();

	const imageRef = useRef<HTMLImageElement>(null);
	const activeUrlRef = useRef<string | null>(null);

	const handleFileSelected = (selectedFile: File) => {
		setFile(selectedFile);
		// Cleanup previous object URL to avoid memory leaks safely
		if (activeUrlRef.current) {
			URL.revokeObjectURL(activeUrlRef.current);
			activeUrlRef.current = null;
		}
		const url = URL.createObjectURL(selectedFile);
		activeUrlRef.current = url;
		setPreviewUrl(url);
		setDetections([]);
		setStatus("idle");
		setErrorMessage(undefined);
	};

	const handleReset = () => {
		setFile(null);
		if (activeUrlRef.current) {
			URL.revokeObjectURL(activeUrlRef.current);
			activeUrlRef.current = null;
		}
		setPreviewUrl(null);
		setDetections([]);
		setStatus("idle");
		setErrorMessage(undefined);
	};

	const handleDetect = async () => {
		if (!file) return;

		setStatus("loading");
		const result = await detectImage(file);

		if (result.success) {
			setDetections(result.data);
			if (result.data.length > 0) {
				setStatus("success");
			} else {
				setStatus("no-detections");
			}
		} else {
			setStatus("error");
			setErrorMessage(result.error);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-8 flex flex-col gap-8 animate-in fade-in duration-500">
			<div className="space-y-4 text-center mb-4">
				<h1 className="text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
					Image Detection
				</h1>
				<p className="text-lg text-slate-600 max-w-2xl mx-auto">
					Upload an image to identify pedestrian hazards using our YOLO
					detection system.
				</p>
			</div>

			<div className="flex flex-col gap-8">
				{!file ? (
					<ImageUploader onFileSelected={handleFileSelected} />
				) : (
					<div className="flex flex-col gap-6">
						<div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
							<div className="flex items-center gap-3 overflow-hidden">
								<div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
									<img
										src={previewUrl ?? ""}
										alt="Thumbnail"
										className="w-10 h-10 object-cover rounded"
									/>
								</div>
								<div className="min-w-0">
									<p className="font-semibold text-slate-800 truncate">
										{file.name}
									</p>
									<p className="text-sm text-slate-500">
										{(file.size / (1024 * 1024)).toFixed(2)} MB
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={handleReset}
									disabled={status === "loading"}
									className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
									title="Choose Another Image"
								>
									<RefreshCw className="w-5 h-5" />
								</button>
								{status === "idle" && (
									<button
										type="button"
										onClick={handleDetect}
										className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95"
									>
										<Search className="w-4 h-4" />
										Examine Image
									</button>
								)}
							</div>
						</div>

						<DetectionStatus status={status} errorMessage={errorMessage} />

						{previewUrl && (
							<div className="animate-in fade-in slide-in-from-bottom-4">
								<div className="relative w-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
									<img
										ref={imageRef}
										src={previewUrl}
										alt="Preview"
										className="w-full h-auto block object-contain max-h-[70vh] max-w-full"
									/>
									<DetectionCanvas
										targetRef={imageRef}
										detections={detections}
									/>
								</div>

								<DetectionSummary detections={detections} />
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
```

### 4. `frontend/src/routes/index.tsx` — rewrite as landing hub
Complete new file (slate palette to match codebase). NOTE: CTA is a `<span>`,
NOT a `<button>` — nesting a `<button>` inside `<Link>` (an `<a>`) is invalid
HTML and the original plan had that bug.
```tsx
/**
 * System: Pedestrian Hazard YOLO
 * Module: Landing Page
 * File URL: frontend/src/routes/index.tsx
 * Purpose: Navigation hub linking to the simulator and image upload features
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Video, Image as ImageIcon } from "lucide-react";

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
```

### 5. Regenerate route tree + validate
- `pnpm generate-routes` (or start `pnpm dev`) so `routeTree.gen.ts` picks up
  `/upload`. Confirm `routeTree.gen.ts` now lists the UploadRoute import.
- `pnpm check` (biome lint/format) — fix any reported issues.
- `pnpm build` (also surfaces TS errors via the build).

## Validation checklist
- [ ] `/`, `/upload`, `/simulator` all render without 404/blank.
- [ ] `routeTree.gen.ts` regenerated and contains the `/upload` route.
- [ ] No horizontal scrollbar at 320px width and at desktop width.
- [ ] Nav wraps on narrow viewports; all three links reachable.
- [ ] Upload flow works end-to-end (select → examine → detections render → reset).
- [ ] No invalid-DOM warnings (e.g., `<button>` inside `<a>`) in console.
- [ ] `pnpm check` and `pnpm build` pass.

## Risks / notes
- If `/upload` route is not picked up automatically, run `pnpm generate-routes`
  explicitly (router-plugin handles it on dev/build, but a manual regen is the
  safe fallback).
- The `<main className="overflow-hidden">` guard intentionally adds no padding /
  max-width so it does not double-pad against each route's own container.
- `overflow-x: hidden` can mask genuine layout bugs; root-cause fixes above are
  the primary defense and should be re-audited if new overflow appears later.

## Out of scope
- PHE-16 disclaimer component (removed per instruction).
- Mobile hamburger / icon nav (chose responsive wrap instead).
- Any backend changes (none required).
