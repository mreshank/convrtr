/**
 * Copies sql.js's WebAssembly binary into `public/` at build time.
 *
 * Same reasoning as `copy-ffmpeg-core.mjs`: the 658KB binary is pinned in the
 * lockfile and reproducible from it, so it is copied out of `node_modules`
 * during the build instead of committed, and `public/sql-wasm` is git-ignored.
 *
 * The sqlite engine passes an explicit `locateFile` pointing at `/sql-wasm/`,
 * so webpack never has to resolve the sibling asset and no global `Module`
 * is involved (see `copy-flac-wasm.mjs` for why that matters).
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const to = join(root, "public", "sql-wasm", "sql-wasm.wasm");

mkdirSync(dirname(to), { recursive: true });
const { size } = statSync(source);
copyFileSync(source, to);
console.log(
	`copied sql-wasm.wasm -> public/sql-wasm (${(size / 1024).toFixed(0)} KB)`,
);
