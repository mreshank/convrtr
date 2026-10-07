#!/usr/bin/env node

/**
 * convrtr — NPM Package Build Pipeline
 *
 * Compiles the convrtr library and CLI into ESM, CommonJS, and TypeScript declarations.
 */

import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..");
const pkgDir = resolve(root, "packages/convrtr");
const outDir = resolve(pkgDir, "dist");

async function runBuild() {
	console.log("[convrtr:npm] Building convrtr npm package...");
	await mkdir(outDir, { recursive: true });

	// 1. Bundle with Vite (ESM + CommonJS)
	console.log("[convrtr:npm] Bundling JS modules (ESM + CJS)...");
	await build({
		configFile: false,
		resolve: {
			alias: {
				"@": resolve(root, "src"),
			},
		},
		build: {
			outDir,
			emptyOutDir: true,
			target: "node18",
			minify: false,
			lib: {
				entry: {
					index: resolve(pkgDir, "src/index.ts"),
					cli: resolve(pkgDir, "src/cli.ts"),
					registry: resolve(root, "src/core/registry/index.ts"),
					engines: resolve(root, "src/core/engines/index.ts"),
				},
				formats: ["es", "cjs"],
				fileName: (format, entryName) =>
					`${entryName}.${format === "es" ? "js" : "cjs"}`,
			},
			rollupOptions: {
				external: [
					/^node:/,
					"fs",
					"path",
					"child_process",
					"crypto",
					"stream",
					"buffer",
					"util",
					"url",
					"os",
					"zod",
					"apache-arrow",
					"sql.js",
					"7z-wasm",
					"hyparquet",
					"mediabunny",
					"pdf-lib",
					"svgo",
					"@breezystack/lamejs",
					"@ffmpeg/ffmpeg",
					"@ffmpeg/util",
					"@jsquash/avif",
					"@jsquash/jpeg",
					"@jsquash/jxl",
					"@jsquash/oxipng",
					"@jsquash/png",
					"@jsquash/resize",
					"@jsquash/webp",
					"exifr",
					"fflate",
					"gifenc",
					"libflacjs",
					"libheif-js",
					"silk-wasm",
					"three",
				],
			},
		},
	});

	// 2. Generate TypeScript type declarations
	console.log("[convrtr:npm] Emitting TypeScript type declarations (.d.ts)...");
	try {
		execFileSync(
			"npx",
			[
				"tsc",
				"--project",
				resolve(pkgDir, "tsconfig.json"),
				"--declaration",
				"--emitDeclarationOnly",
				"--outDir",
				outDir,
			],
			{ cwd: root, stdio: "inherit" },
		);
	} catch (err) {
		console.warn("[convrtr:npm] tsc note:", err);
	}

	// 3. Link and normalize declaration files for package distribution
	console.log(
		"[convrtr:npm] Normalizing declaration files for distribution...",
	);
	try {
		const rawIndexDtsPath = resolve(outDir, "packages/convrtr/src/index.d.ts");
		const rawCliDtsPath = resolve(outDir, "packages/convrtr/src/cli.d.ts");

		const rawIndexDts = await readFile(rawIndexDtsPath, "utf-8");
		const normalizedIndexDts = rawIndexDts.replace(/@\//g, "./src/");
		await writeFile(resolve(outDir, "index.d.ts"), normalizedIndexDts, "utf-8");
		await writeFile(
			resolve(outDir, "index.d.cts"),
			normalizedIndexDts,
			"utf-8",
		);

		const rawCliDts = await readFile(rawCliDtsPath, "utf-8");
		const normalizedCliDts = rawCliDts.replace(/@\//g, "./src/");
		await writeFile(resolve(outDir, "cli.d.ts"), normalizedCliDts, "utf-8");
		await writeFile(resolve(outDir, "cli.d.cts"), normalizedCliDts, "utf-8");

		// Registry and Engines declarations
		const registryDts = `export * from "./src/core/registry/index";\n`;
		await writeFile(resolve(outDir, "registry.d.ts"), registryDts, "utf-8");
		await writeFile(resolve(outDir, "registry.d.cts"), registryDts, "utf-8");

		const enginesDts = `export * from "./src/core/engines/index";\n`;
		await writeFile(resolve(outDir, "engines.d.ts"), enginesDts, "utf-8");
		await writeFile(resolve(outDir, "engines.d.cts"), enginesDts, "utf-8");

		console.log(
			"[convrtr:npm] Successfully emitted index.d.ts, cli.d.ts, registry.d.ts, engines.d.ts",
		);
	} catch (err) {
		console.warn("[convrtr:npm] Declaration normalization error:", err);
	}

	// 4. Copy LICENSE
	try {
		await cp(resolve(root, "LICENSE"), resolve(pkgDir, "LICENSE"));
		console.log("[convrtr:npm] Copied LICENSE");
	} catch {
		// Ignore if LICENSE copy fails
	}

	console.log("[convrtr:npm] Package build complete at packages/convrtr/dist/");
}

runBuild().catch((err) => {
	console.error("[convrtr:npm] Package build failed:", err);
	process.exit(1);
});
