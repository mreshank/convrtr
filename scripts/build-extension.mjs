#!/usr/bin/env node

/**
 * convrtr — Chrome Extension Build Pipeline
 *
 * Compiles the Chrome Extension (Manifest V3) using Vite:
 * 1. Generates icons (16, 32, 48, 128 px).
 * 2. Bundles HTML entry points (sidepanel, popup, tab) and background worker.
 * 3. Copies manifest.json, icons, and WASM codecs into `dist-extension/`.
 * 4. Supports `--watch` flag for local live development.
 */

import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import { generateExtensionIcons } from "./generate-extension-icons.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..");
const srcExtension = resolve(root, "src/extension");
const outDir = resolve(root, "dist-extension");

const isWatch = process.argv.includes("--watch") || process.argv.includes("-w");

async function runBuild() {
	console.log("[convrtr:build] Building Chrome Extension...");

	// 1. Generate icons
	console.log("[convrtr:build] Generating extension icons...");
	await generateExtensionIcons();

	// 2. Run Vite build
	console.log("[convrtr:build] Bundling extension with Vite...");
	const buildResult = await build({
		configFile: false,
		root: srcExtension,
		base: "./",
		plugins: [react()],
		resolve: {
			alias: {
				"@": resolve(root, "src"),
			},
		},
		build: {
			outDir,
			emptyOutDir: true,
			target: "chrome116",
			watch: isWatch ? {} : null,
			rollupOptions: {
				input: {
					sidepanel: resolve(srcExtension, "sidepanel.html"),
					popup: resolve(srcExtension, "popup.html"),
					tab: resolve(srcExtension, "tab.html"),
					background: resolve(srcExtension, "background.ts"),
				},
				output: {
					entryFileNames: (chunkInfo) => {
						if (chunkInfo.name === "background") {
							return "background.js";
						}
						return "assets/[name]-[hash].js";
					},
					chunkFileNames: "assets/[name]-[hash].js",
					assetFileNames: "assets/[name]-[hash].[ext]",
				},
			},
		},
	});

	// 3. Post-build asset copying
	await copyStaticExtensionAssets();

	console.log(
		"[convrtr:build] Chrome Extension build complete at dist-extension/",
	);
	return buildResult;
}

async function copyStaticExtensionAssets() {
	await mkdir(outDir, { recursive: true });

	// Copy manifest.json
	const manifestSource = resolve(srcExtension, "manifest.json");
	const manifestDest = resolve(outDir, "manifest.json");
	const manifestContent = await readFile(manifestSource, "utf-8");
	await writeFile(manifestDest, manifestContent);
	console.log("  → Copied manifest.json");

	// Copy icons
	const iconsSource = resolve(srcExtension, "icons");
	const iconsDest = resolve(outDir, "icons");
	await cp(iconsSource, iconsDest, { recursive: true });
	console.log("  → Copied icons/");

	// Copy WASM codecs if present
	const silkSource = resolve(root, "public/silk.wasm");
	if (existsSync(silkSource)) {
		await cp(silkSource, resolve(outDir, "silk.wasm"));
		console.log("  → Copied silk.wasm");
	}

	const ffmpegSource = resolve(root, "public/ffmpeg");
	if (existsSync(ffmpegSource)) {
		await cp(ffmpegSource, resolve(outDir, "ffmpeg"), { recursive: true });
		console.log("  → Copied ffmpeg/");
	}
}

runBuild().catch((err) => {
	console.error("[convrtr:build] Extension build failed:", err);
	process.exit(1);
});
