/**
 * Copies 7-Zip's WebAssembly core into `public/` at build time.
 *
 * Same reasoning as `copy-ffmpeg-core.mjs` and `copy-sqljs-wasm.mjs`: the
 * 1.6MB binary is pinned in the lockfile and reproducible from it, so it is
 * copied out of `node_modules` during the build instead of committed, and
 * `public/7z` is git-ignored.
 *
 * The cb7 engine passes an explicit `locateFile` pointing at `/7z/`, so
 * webpack never has to resolve the sibling asset.
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "7z-wasm", "7zz.wasm");
const to = join(root, "public", "7z", "7zz.wasm");

mkdirSync(dirname(to), { recursive: true });
const { size } = statSync(source);
copyFileSync(source, to);
console.log(`copied 7zz.wasm -> public/7z (${(size / 1024).toFixed(0)} KB)`);
