/**
 * Places libflac's `.wasm` where its loader will look for it.
 *
 * The emscripten loader resolves sibling assets relative to the directory of
 * the script that loaded it. Once webpack has bundled that loader into a chunk,
 * that directory is `_next/static/chunks/` — confirmed by the error the asm.js
 * build produced first: "could not load memory initializer
 * /_next/static/chunks/libflac.min.js.mem".
 *
 * So the `.wasm` is copied there after the build. The alternative was to set a
 * global `Module.locateFile` before importing, which the build does honour —
 * but a global named `Module` is exactly what every other emscripten codec in
 * this project reads too, and a stray one leaking into a @jsquash load would be
 * a miserable bug to track down. Putting the file where it is already looked
 * for changes nothing else.
 *
 * The chunk's own hashed name does not matter: only the directory is used.
 */
import { copyFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(
	root,
	"node_modules",
	"libflacjs",
	"dist",
	"libflac.min.wasm.wasm",
);
const chunksDir = join(root, "out", "_next", "static", "chunks");

if (!existsSync(chunksDir)) {
	throw new Error(
		`expected ${chunksDir} to exist — run this after \`next build\`, not before`,
	);
}

const { size } = statSync(source);
copyFileSync(source, join(chunksDir, "libflac.min.wasm.wasm"));
console.log(
	`copied libflac.min.wasm.wasm -> out/_next/static/chunks (${(size / 1024).toFixed(0)} KB)`,
);
