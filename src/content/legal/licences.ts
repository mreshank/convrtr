import {
	existsSync,
	readdirSync,
	readFileSync,
	realpathSync,
	statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import rootPkg from "../../../package.json";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NODE_MODULES = join(ROOT, "node_modules");

/**
 * The engine dependencies, found by grepping `src/core/engines/**` for
 * import specifiers (static and dynamic) plus the one engine that is
 * referenced only by a runtime URL rather than an import: `@ffmpeg/core`'s
 * `.wasm` is fetched from `${origin}/ffmpeg/ffmpeg-core.wasm`
 * (`src/core/engines/video/legacy.ts`) after `scripts/copy-ffmpeg-core.mjs`
 * vendors it into `public/` at build time.
 *
 * This list is the one hand-maintained fact in this module — package.json
 * cannot say which of its dependencies are conversion engines versus
 * tooling (`zod`, `next`, `typescript`, the MDX toolchain) — but everything
 * that *follows* from a name being on it (installed version, declared
 * licence, whether it ships a WebAssembly binary, and which files those
 * are) is read from disk, not typed here. Re-derive by running:
 *
 *   grep -rhoE "(from|import\\()[[:space:]]*['\"][^./][^'\"]*['\"]" src/core/engines
 *
 * and checking the result still matches.
 */
const ENGINE_DEPENDENCIES = [
	"@breezystack/lamejs",
	"@ffmpeg/core",
	"@ffmpeg/ffmpeg",
	"@jsquash/avif",
	"@jsquash/jpeg",
	"@jsquash/jxl",
	"@jsquash/oxipng",
	"@jsquash/png",
	"@jsquash/resize",
	"@jsquash/webp",
	"fflate",
	"gifenc",
	"libflacjs",
	"libheif-js",
	"mediabunny",
	"pdf-lib",
	"svgo",
] as const;

/**
 * The one other fact package.json cannot state: which native/Rust/C
 * project a WASM-shipping npm package wraps. Every value here is quoted
 * from that package's own README or its installed `package.json`
 * `description` field — cited in `source` so this table can be checked
 * against the package it describes, not just trusted. A dependency that
 * ships WebAssembly but has no entry here is surfaced as incomplete by
 * `getLicenceReport`, rather than silently omitted.
 */
const NATIVE_LIBRARY: Record<
	string,
	{ library: string; upstream: string; source: string }
> = {
	"@jsquash/jpeg": {
		library: "MozJPEG",
		upstream: "https://github.com/mozilla/mozjpeg",
		source: '@jsquash/jpeg README: "Uses the MozJPEG library."',
	},
	"@jsquash/webp": {
		library: "libwebp",
		upstream: "https://github.com/webmproject/libwebp",
		source: '@jsquash/webp README: "Uses the libwebp library."',
	},
	"@jsquash/avif": {
		library: "libavif",
		upstream: "https://github.com/AOMediaCodec/libavif",
		source: '@jsquash/avif README: "Uses the libavif library."',
	},
	"@jsquash/jxl": {
		library: "libjxl",
		upstream: "https://github.com/libjxl/libjxl",
		source: '@jsquash/jxl README: "Uses the libjxl library."',
	},
	"@jsquash/oxipng": {
		library: "Oxipng",
		upstream: "https://github.com/shssoichiro/oxipng",
		source:
			'@jsquash/oxipng README: "Uses the lovely Oxipng for png optimisation."',
	},
	"@jsquash/png": {
		library: "the Rust `png` crate",
		upstream: "https://docs.rs/png",
		source: '@jsquash/png README: "Uses the rust PNG crate."',
	},
	"@jsquash/resize": {
		library: "resize, wasmboy-rs's hqx port, and magic-kernel-rust",
		upstream: "https://github.com/GoogleChromeLabs/squoosh",
		source:
			"@jsquash/resize README lists PistonDevelopers/resize, CryZe/wasmboy-rs (hqx) and SevInf/magic-kernel-rust as composed sources.",
	},
	"libheif-js": {
		library: "libheif",
		upstream: "https://github.com/strukturag/libheif",
		source:
			'libheif-js package.json description: "Emscripten distribution of libheif for Node.JS and the browser."',
	},
	"@ffmpeg/core": {
		library: "FFmpeg",
		upstream: "https://ffmpeg.org",
		source:
			'@ffmpeg/core package.json description: "FFmpeg WebAssembly version (single thread)."',
	},
	libflacjs: {
		library: "libFLAC (Xiph.Org)",
		upstream: "https://github.com/xiph/flac",
		source:
			'libflacjs package.json description: "FLAC data stream encoder and decoder compiled in JavaScript using emscripten." The compiled libFLAC C sources are Xiph.Org’s own, separately licensed BSD-3-Clause upstream; libflacjs’s own MIT licence (below) covers its JS/wasm packaging, not the original C library.',
	},
};

export type LicenceEntry = {
	dependency: string;
	/** The version actually installed (from the dependency's own package.json), not the semver range convrtr declares. */
	version: string;
	license: string;
	library: string | null;
	upstream: string | null;
	/** Paths of .wasm files found under this dependency's install directory, relative to it. Empty for a pure-JS/TS engine. */
	wasmFiles: string[];
};

export type LicenceReport = {
	entries: LicenceEntry[];
	/**
	 * Anything this derivation could not establish mechanically: a
	 * dependency missing from node_modules, an unreadable package.json, or
	 * a WASM-shipping dependency with no entry in `NATIVE_LIBRARY`. Rendered
	 * on the page verbatim rather than silently dropped, per the brief: an
	 * attribution page that is wrong is worse than none.
	 */
	incomplete: string[];
};

/** Recursive, symlink-safe (pnpm's `node_modules/<pkg>` is a symlink into `.pnpm/`), cycle-safe .wasm finder. */
function findWasmFiles(
	dir: string,
	seen: Set<string>,
	depthLeft = 10,
): string[] {
	if (depthLeft <= 0) return [];
	let real: string;
	try {
		real = realpathSync(dir);
	} catch {
		return [];
	}
	if (seen.has(real)) return [];
	seen.add(real);

	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return [];
	}

	const found: string[] = [];
	for (const entry of entries) {
		if (entry === "node_modules") continue; // a codec's own nested deps, not its own build
		const full = join(dir, entry);
		let isDirectory: boolean;
		try {
			isDirectory = statSync(full).isDirectory();
		} catch {
			continue;
		}
		if (isDirectory) {
			found.push(...findWasmFiles(full, seen, depthLeft - 1));
		} else if (entry.toLowerCase().endsWith(".wasm")) {
			found.push(full);
		}
	}
	return found;
}

/**
 * Builds the licences page's data by reading `package.json` and the
 * installed packages on disk, rather than typing a list of dependencies and
 * versions by hand. Spec §5.3: a hand-written attribution list goes stale
 * silently the moment a dependency is upgraded or dropped; this cannot,
 * because it has no independent copy of the fact to go stale against.
 */
export function getLicenceReport(): LicenceReport {
	const declared = {
		...(rootPkg.dependencies as Record<string, string>),
		...(rootPkg.devDependencies as Record<string, string>),
	};

	const entries: LicenceEntry[] = [];
	const incomplete: string[] = [];

	for (const name of ENGINE_DEPENDENCIES) {
		if (!(name in declared)) {
			incomplete.push(
				`${name}: listed as an engine dependency but not found in package.json — the engine list in licences.ts is stale`,
			);
			continue;
		}

		const dir = join(NODE_MODULES, ...name.split("/"));
		if (!existsSync(dir)) {
			incomplete.push(
				`${name}: not present in node_modules (run pnpm install)`,
			);
			continue;
		}

		let installed: { version?: string; license?: string };
		try {
			installed = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
		} catch {
			incomplete.push(`${name}: could not read its installed package.json`);
			continue;
		}

		const wasmFiles = findWasmFiles(dir, new Set()).map((f) =>
			relative(dir, f),
		);
		const native = NATIVE_LIBRARY[name] ?? null;

		if (wasmFiles.length > 0 && !native) {
			incomplete.push(
				`${name}: ships WebAssembly (${wasmFiles.length} file(s)) but the native library it wraps has not been identified — see the package's own README`,
			);
		}

		entries.push({
			dependency: name,
			version: installed.version ?? "unknown",
			license: installed.license ?? "not declared in its package.json",
			library: native?.library ?? null,
			upstream: native?.upstream ?? null,
			wasmFiles,
		});
	}

	return { entries, incomplete };
}
