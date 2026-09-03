import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import type { Container } from "./compatibility";

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
			const {
				Input,
				Output,
				BufferSource,
				BufferTarget,
				ALL_FORMATS,
				Conversion,
			} = await import("mediabunny");

			onProgress(0.02, "DEMUX");

			const source = new Input({
				source: new BufferSource(input),
				formats: ALL_FORMATS,
			});

			const output = new Output({
				format: await outputFormatFor(target),
				target: new BufferTarget(),
			});

			const forceTranscode = params.forceTranscode === true;

			const conversion = await Conversion.init({
				input: source,
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

			const buffer = output.target.buffer;
			if (!buffer) {
				throw new Error(
					"video conversion produced no output — the muxer returned an empty buffer",
				);
			}

			onProgress(1, "MUX");
			return buffer;
		},
	};
}
