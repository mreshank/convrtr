import type { ParamValue } from "@/core/quality";
import type { Engine, OutputSink } from "../types";
import type { Container } from "./compatibility";

/**
 * Type-only handle on the library so the shared conversion routine below can
 * be typed without importing mediabunny at module scope — the dynamic import
 * inside each method is what keeps ~200KB of muxer out of every page bundle.
 */
type Mediabunny = typeof import("mediabunny");

/**
 * Container conversion built on mediabunny.
 *
 * mediabunny's `Conversion` already copies encoded samples wherever the
 * target container can carry them, only re-encoding when it cannot — its
 * `forceTranscode` flag exists precisely to opt *out* of that. So the remux
 * behaviour this pack is built around comes from the library rather than
 * being reimplemented here, which is the right call: muxing is exacting work
 * with a long tail of container edge cases, and a hand-rolled version would
 * be worse in ways that only show up on unusual files.
 *
 * What this layer adds is honesty. `compatibility.ts` predicts, before any
 * work starts, whether the conversion will be a pure copy or a re-encode, so
 * the UI can say which one is about to happen and the fidelity score can
 * reflect it. A remux genuinely scores 100; a silent transcode presented as
 * a conversion is the dishonesty this whole pack exists to avoid.
 */

/** Containers this engine can write. */
const OUTPUT_FORMATS = ["mp4", "webm", "mkv"] as const;
export type OutputContainer = (typeof OUTPUT_FORMATS)[number];

async function outputFormatFor(container: OutputContainer) {
	const { Mp4OutputFormat, WebMOutputFormat, MkvOutputFormat } = await import(
		"mediabunny"
	);
	switch (container) {
		case "mp4":
			return new Mp4OutputFormat();
		case "webm":
			return new WebMOutputFormat();
		case "mkv":
			return new MkvOutputFormat();
	}
}

/**
 * Runs the conversion and reports on it, shared by the buffered and streaming
 * paths.
 *
 * Both paths make identical decisions about what is copyable, what must be
 * re-encoded, and what cannot be carried at all — only where the bytes come
 * from and go to differs. Keeping this in one place is what stops the
 * streaming path quietly drifting into weaker guarantees than the buffered
 * one, which would be the worst outcome: large files are exactly where a
 * silent re-encode costs the most and is least likely to be noticed.
 */
async function executeConversion(
	lib: Mediabunny,
	input: InstanceType<Mediabunny["Input"]>,
	output: InstanceType<Mediabunny["Output"]>,
	target: OutputContainer,
	forceTranscode: boolean,
	onProgress: (ratio: number, phase: string) => void,
): Promise<void> {
	const conversion = await lib.Conversion.init({
		input,
		output,
		video: { forceTranscode },
		audio: { forceTranscode },
	});

	// A conversion that cannot run must fail loudly rather than emit a
	// file missing the streams the user cared about.
	if (!conversion.isValid) {
		const reasons = conversion.discardedTracks
			.map((track) => track.reason)
			.join("; ");
		throw new Error(
			`This file cannot be converted to ${target.toUpperCase()}: ${reasons || "no convertible tracks"}`,
		);
	}

	// Say plainly when tracks are being dropped. Silently discarding a
	// subtitle or a second audio track and reporting success would hand
	// someone an incomplete file they believe is complete.
	if (conversion.discardedTracks.length > 0) {
		const dropped = conversion.discardedTracks
			.map((track) => track.reason)
			.join("; ");
		onProgress(0.05, `DROPPING: ${dropped}`);
	}

	conversion.onProgress = (progress) => {
		// mediabunny reports 0-1 across the whole conversion; reserve the
		// head and tail for demux setup and muxing the final structure.
		onProgress(0.05 + progress * 0.9, forceTranscode ? "ENCODE" : "COPY");
	};

	await conversion.execute();
	onProgress(0.98, "MUX");
}

export function createVideoConversionEngine(
	target: OutputContainer,
	sourceContainer: Container,
): Engine {
	return {
		id: `video:${sourceContainer}->${target}`,

		async probe() {
			// mediabunny leans on WebCodecs for anything it cannot copy. Demuxing
			// and muxing alone do not need it, but probing for it here keeps the
			// engine from being selected on a browser that would fail the moment
			// a file needed re-encoding.
			return (
				typeof WebAssembly === "object" && typeof VideoEncoder !== "undefined"
			);
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
		) {
			const lib = await import("mediabunny");
			onProgress(0.02, "DEMUX");

			const source = new lib.Input({
				source: new lib.BufferSource(input),
				formats: lib.ALL_FORMATS,
			});

			const output = new lib.Output({
				format: await outputFormatFor(target),
				target: new lib.BufferTarget(),
			});

			await executeConversion(
				lib,
				source,
				output,
				target,
				params.forceTranscode === true,
				onProgress,
			);

			const buffer = output.target.buffer;
			if (!buffer) {
				throw new Error(
					"video conversion produced no output — the muxer returned an empty buffer",
				);
			}

			onProgress(1, "MUX");
			return buffer;
		},

		/**
		 * The same conversion, with neither side of it resident.
		 *
		 * `BlobSource` reads the input in slices as the demuxer asks for byte
		 * ranges, so a 3GB file is never a 3GB allocation. `StreamTarget` writes
		 * each muxed chunk onward as it is produced, including the backwards
		 * seeks MP4 needs to patch its header, so the output is never assembled
		 * whole either. Peak memory becomes a function of chunk size and the
		 * codec's own buffering rather than of file size.
		 *
		 * `chunked: true` batches writes into 16MiB blocks. Muxers emit a great
		 * many small writes, and each one that reaches the sink unbatched is a
		 * separate positioned write to disk; batching trades a little latency
		 * for far fewer syscalls on exactly the files where the write volume is
		 * large enough to matter.
		 */
		async runStream(
			input: Blob,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			sink: OutputSink,
		) {
			const lib = await import("mediabunny");
			onProgress(0.02, "DEMUX");

			const source = new lib.Input({
				source: new lib.BlobSource(input),
				formats: lib.ALL_FORMATS,
			});

			const output = new lib.Output({
				format: await outputFormatFor(target),
				target: new lib.StreamTarget(sink, { chunked: true }),
			});

			await executeConversion(
				lib,
				source,
				output,
				target,
				params.forceTranscode === true,
				onProgress,
			);

			// No buffer to check and nothing to return: the bytes are already at
			// their destination. Whether they are *committed* is the caller's
			// call, because the muxer closes its target on failure too.
			onProgress(1, "MUX");
		},
	};
}
