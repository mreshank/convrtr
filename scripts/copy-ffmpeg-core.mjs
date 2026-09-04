/**
 * Copies ffmpeg.wasm's core into `public/` at build time.
 *
 * The core is 31MB. Committing that to git would bloat every clone and every
 * CI checkout forever, for a file that is already pinned in the lockfile and
 * reproducible from it — so it is copied out of `node_modules` during the
 * build instead, and `public/ffmpeg` is git-ignored.
 *
 * The ESM build, not the UMD one. `@ffmpeg/ffmpeg` runs its worker as a module
 * worker, where `importScripts` does not exist; its loader tries that first,
 * then falls back to `await import(coreURL)` and reads `.default`. A UMD
 * bundle has no default export, so it fails with "failed to import
 * ffmpeg-core.js" — which names the file rather than the reason, and cost an
 * hour to work out the first time.
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const coreDir = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const wrapperDir = join(
	root,
	"node_modules",
	"@ffmpeg",
	"ffmpeg",
	"dist",
	"esm",
);
const to = join(root, "public", "ffmpeg");

const CORE_FILES = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

/**
 * The wrapper's worker, self-hosted rather than bundled.
 *
 * `@ffmpeg/ffmpeg` normally constructs its worker from a bundled `worker.js`,
 * and its own source comments say the code is duplicated there specifically so
 * webpack can bundle it. That is the problem: once webpack owns that file, the
 * worker's `await import(coreURL)` is rewritten into webpack's module loader,
 * which cannot resolve a runtime URL and fails with "Cannot find module
 * '/ffmpeg/ffmpeg-core.js'".
 *
 * Serving the worker from our own origin and passing it as `classWorkerURL`
 * keeps it a plain module worker webpack never processed, so its dynamic
 * import is a real one. `const.js` and `errors.js` are its only imports.
 */
const WRAPPER_FILES = ["worker.js", "const.js", "errors.js"];

mkdirSync(to, { recursive: true });

let total = 0;
for (const [dir, files] of [
	[coreDir, CORE_FILES],
	[wrapperDir, WRAPPER_FILES],
]) {
	for (const file of files) {
		const source = join(dir, file);
		// Fail loudly. A missing file silently produces a build whose
		// legacy-video tool fails at the moment someone tries to use it, which
		// is the worst place to discover it.
		const { size } = statSync(source);
		copyFileSync(source, join(to, file));
		total += size;
	}
}

console.log(
	`copied ffmpeg core -> public/ffmpeg (${(total / 1024 / 1024).toFixed(1)} MB)`,
);
