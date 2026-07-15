/**
 * System: Pedestrian Hazard YOLO
 * Module: Frontend Vite Configuration
 * File URL: frontend/vite.config.ts
 * Purpose: Vite configuration with Tailwind CSS, TanStack Start, React and Cloudflare plugin
 */

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		cloudflare({
			viteEnvironment: {
				name: "ssr",
			},
		}),
		devtools(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
