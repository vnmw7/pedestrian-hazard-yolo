import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		viteStaticCopy({
			targets: [
				{
					src: "node_modules/onnxruntime-web/dist/*.wasm",
					dest: ".",
					rename: { stripBase: true },
				},
				{
					src: "node_modules/onnxruntime-web/dist/*.mjs",
					dest: ".",
					rename: { stripBase: true },
				},
			],
		}),
	],
	optimizeDeps: {
		exclude: ["onnxruntime-web"],
	},
});
