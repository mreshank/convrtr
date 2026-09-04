import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Converts the containers mediabunny cannot read — AVI, FLV, WMV — using
 * ffmpeg compiled to WebAssembly.
 *
 * ## Why this tier is separate, and opt-in
 *
 * The core is 31MB. Every other engine in this project is a few hundred
 * kilobytes at most, downloads without asking, and is worth it. This one is
 * not: the overwhelming majority of visitors never open a legacy-video tool,
 * and making them pay 31MB on the chance they might would be indefensible. So
 * it is excluded from the service worker's precache, loaded only when someone
 * converts one of these formats, and the UI asks first.
 *
 * The cost is real but bounded: it is a one-time download the browser then
 * caches, and it buys formats no browser API can read at all.
 *
 * ## Copy first, transcode only if that fails
 *
 * The same principle as the mediabunny tier. An AVI usually holds MPEG-4 video
 * and MP3 audio, both of which are legal in MP4, so the streams can be copied
 * into the new container untouched — instant, and lossless. Only when ffmpeg
 * rejects that (because a codec genuinely cannot be carried) does it re-encode,
 * and it says which happened.
 *
 * Attempting the copy costs one extra ffmpeg invocation in the fallback case.
 * That is a good trade: the copy path is both the common case and the one
 * where getting it wrong costs the user quality they cannot get back.
 */

/**
 * Absolute URLs, built from the worker's own origin.
 *
 * Root-relative paths do not survive the trip: `@ffmpeg/ffmpeg` resolves them
 * with `new URL(path, import.meta.url)`, and inside a webpack-bundled worker
 * `import.meta.url` is a `file:` URL — so "/ffmpeg/worker.js" became
 * "file:///ffmpeg/worker.js" and the browser refused it as cross-origin.
 * Resolving against `self.location.origin` here removes the ambiguity
 * entirely.
 *
 * Served from our own origin rather than a CDN, which the offline story and
 * the no-cross-origin-requests test both depend on.
 */
function coreUrls() {
	const origin = self.location.origin;
	return {
		coreURL: `${origin}/ffmpeg/ffmpeg-core.js`,
		wasmURL: `${origin}/ffmpeg/ffmpeg-core.wasm`,
		classWorkerURL: `${origin}/ffmpeg/worker.js`,
	};
}

export type LegacyContainer = "avi" | "flv" | "wmv" | "mpg" | "m4v";

export function createLegacyConversionEngine(
	from: LegacyContainer,
	to: "mp4",
): Engine {
	return {
		id: `ffmpeg:${from}->${to}`,

		async probe() {
			// Deliberately does not check `crossOriginIsolated`. The
			// single-threaded core runs without SharedArrayBuffer, so requiring
			// isolation here would refuse on browsers where this works fine.
			return typeof WebAssembly === "object";
		},

		async run(
			input: ArrayBuffer,
			_params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.01, "DOWNLOAD");
			const { FFmpeg } = await import("@ffmpeg/ffmpeg");
			const ffmpeg = new FFmpeg();

			// Surfaced only on failure. ffmpeg's log is far too noisy to show
			// while it runs, but it is the only thing that explains a failure,
			// so the tail is kept and attached to the error.
			const log: string[] = [];
			ffmpeg.on("log", ({ message }) => {
				log.push(message);
				if (log.length > 60) log.shift();
			});

			// The self-hosted worker matters as much as the core: webpack
			// rewrites the bundled worker's `await import(coreURL)` into its own
			// module loader, which cannot resolve a runtime URL and fails with
			// "Cannot find module '/ffmpeg/ffmpeg-core.js'".
			await ffmpeg.load(coreUrls());

			const inputName = `input.${from}`;
			const outputName = `output.${to}`;
			await ffmpeg.writeFile(inputName, new Uint8Array(input));

			ffmpeg.on("progress", ({ progress }) => {
				if (Number.isFinite(progress) && progress > 0) {
					onProgress(0.1 + Math.min(1, progress) * 0.85, "COPY");
				}
			});

			// The lossless attempt.
			let copied = true;
			let code = await ffmpeg.exec(["-i", inputName, "-c", "copy", outputName]);

			if (code !== 0) {
				copied = false;
				onProgress(0.15, "ENCODE");
				onNotice?.(
					"The streams in this file cannot be carried into MP4 unchanged, so the video was re-encoded. Some quality is lost — that is unavoidable for this combination of formats.",
				);
				code = await ffmpeg.exec([
					"-i",
					inputName,
					"-c:v",
					"libx264",
					"-preset",
					"medium",
					"-crf",
					"20",
					"-c:a",
					"aac",
					"-b:a",
					"192k",
					outputName,
				]);
			}

			if (code !== 0) {
				throw new Error(
					`ffmpeg could not convert this file (exit ${code}). ${log.slice(-3).join(" ")}`,
				);
			}

			const output = await ffmpeg.readFile(outputName);
			const bytes =
				typeof output === "string" ? new TextEncoder().encode(output) : output;

			if (bytes.length === 0) {
				throw new Error(
					"ffmpeg reported success but produced an empty file, so the conversion cannot be trusted.",
				);
			}

			if (copied) {
				onNotice?.(
					"The video and audio streams were copied into the new container without being re-encoded, so the picture and sound are identical to the original.",
				);
			}

			onProgress(1, "MUX");
			// `slice()` detaches from ffmpeg's heap, which is reused and would
			// otherwise be mutated underneath the returned buffer.
			return bytes.slice().buffer as ArrayBuffer;
		},
	};
}
