import type { ParamValue } from "@/core/quality";
import type { Engine, OutputSink } from "../types";

/**
 * Pulls the audio out of a video file without re-encoding it.
 *
 * This is the extraction case worth leading with, because it is the one almost
 * every competing tool gets wrong. "MP4 to MP3" is the phrase people search
 * for, and answering it means decoding the AAC already in the file and
 * re-encoding it to MP3 — a generation of quality lost, for a format whose
 * only advantage is being older. The AAC track can instead be copied out
 * bit-for-bit into an `.m4a`, which every player and phone made this century
 * handles.
 *
 * So this offers the lossless operation and names it honestly, rather than
 * offering the popular one and staying quiet about the cost. Where a genuine
 * MP3 is needed the answer is a re-encode, and that has to be an explicit
 * choice rather than the silent default.
 */

/**
 * Containers this can write, each holding one audio stream.
 *
 * Whether extraction is a copy or a decode depends on the source codec, not on
 * the target alone: AAC copies into `.m4a` untouched, Opus copies into `.ogg`,
 * and WAV copies a PCM source but has to decode anything compressed. The
 * engine asks the format at runtime rather than assuming.
 */
const AUDIO_TARGETS = ["m4a", "ogg", "wav"] as const;
export type AudioTarget = (typeof AUDIO_TARGETS)[number];

const TARGET_MIME: Record<AudioTarget, string> = {
	m4a: "audio/mp4",
	ogg: "audio/ogg",
	wav: "audio/wav",
};

export function audioTargetMime(target: AudioTarget): string {
	return TARGET_MIME[target];
}

type Mediabunny = typeof import("mediabunny");

async function outputFormatFor(target: AudioTarget) {
	const { Mp4OutputFormat, OggOutputFormat, WavOutputFormat } = await import(
		"mediabunny"
	);
	switch (target) {
		case "m4a":
			// An MP4 carrying only an audio track *is* an .m4a — same container,
			// conventional extension. There is no separate muxer to reach for.
			return new Mp4OutputFormat();
		case "ogg":
			return new OggOutputFormat();
		case "wav":
			return new WavOutputFormat();
	}
}

async function runExtraction(
	lib: Mediabunny,
	input: InstanceType<Mediabunny["Input"]>,
	output: InstanceType<Mediabunny["Output"]>,
	target: AudioTarget,
	params: Record<string, ParamValue>,
	onProgress: (ratio: number, phase: string) => void,
): Promise<void> {
	const audioTrack = await input.getPrimaryAudioTrack();
	if (!audioTrack) {
		throw new Error(
			"This file has no audio track, so there is nothing to extract.",
		);
	}

	// Encoder pre-roll is the reason this tool has two modes rather than one.
	//
	// AAC carries encoder-delay priming: the first packets decode to samples
	// that precede the intended start, and an MP4 records this as a negative
	// first timestamp, with an edit list telling players to skip them.
	// mediabunny's `trim.start` defaults to "the earliest track timestamp, or
	// 0, whichever is higher", so that negative value is clamped to 0 — which
	// asks for the pre-roll to be trimmed, and trimming can only be done by
	// decoding. Measured: 64kbps of AAC in, 165kbps re-encoded out.
	//
	// Passing the track's real first timestamp keeps the timeline as it is, the
	// trim becomes a no-op, and the packets copy across byte for byte. The cost
	// is that the ~23ms of pre-roll ends up inside the extracted file instead
	// of being hidden by an edit list, so the audio begins that much later than
	// it does in the video. Measured on a 44.1kHz source: 1024 extra leading
	// samples.
	//
	// Neither behaviour is unambiguously "lossless", so the choice is the
	// user's: identical bytes with a hair of pre-roll, or exact timing at the
	// cost of a re-encode. Copying is the default, because that is the one
	// nothing can be recovered from if it is taken away.
	const preserveTimeline = params.preserveTimeline !== false;
	const firstTimestamp = await audioTrack.getFirstTimestamp();

	// Ask the output format which codecs it can carry rather than keeping a
	// table here. A hand-written list was wrong on its first draft in three
	// separate ways — it claimed MP4 takes ALAC (it does not), that Ogg takes
	// FLAC (it does not), and that WAV can never copy (it carries PCM
	// perfectly well) — and it would have drifted further with every mediabunny
	// release. The format is the authority on what the format supports.
	const codec = audioTrack.codec;
	const willCopy =
		preserveTimeline &&
		codec !== null &&
		output.format.getSupportedAudioCodecs().includes(codec);
	const conversion = await lib.Conversion.init({
		input,
		output,
		// Dropping the video is the entire point here, not a compromise.
		video: { discard: true },
		audio: {},
		...(preserveTimeline && firstTimestamp < 0
			? { trim: { start: firstTimestamp } }
			: {}),
	});

	if (!conversion.isValid) {
		const reasons = conversion.discardedTracks
			.map((track) => track.reason)
			.join("; ");
		throw new Error(
			`The audio in this file cannot be extracted to ${target.toUpperCase()}: ${reasons || "no convertible audio track"}`,
		);
	}

	// The video track appears in `discardedTracks` because we asked for it to
	// go. Warning about it would be noise — the user chose an audio-only
	// output. Anything discarded for a *different* reason is still worth
	// saying, because that is a track they expected to keep and did not.
	const unexpected = conversion.discardedTracks.filter(
		(track) => track.reason !== "discarded_by_user",
	);
	if (unexpected.length > 0) {
		onProgress(0.05, `DROPPING: ${unexpected.map((t) => t.reason).join("; ")}`);
	}

	conversion.onProgress = (progress) => {
		onProgress(0.05 + progress * 0.9, willCopy ? "COPY" : "ENCODE");
	};

	await conversion.execute();
	onProgress(0.98, "MUX");
}

export function createAudioExtractionEngine(
	sourceContainer: string,
	target: AudioTarget,
): Engine {
	return {
		id: `audio:${sourceContainer}->${target}`,

		async probe() {
			// A pure copy needs no codec support at all, but the same engine
			// handles the decode path (WAV, or a codec the target cannot carry),
			// so requiring AudioEncoder keeps it from being selected on a browser
			// where that path would fail mid-conversion.
			return (
				typeof WebAssembly === "object" && typeof AudioEncoder !== "undefined"
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

			await runExtraction(lib, source, output, target, params, onProgress);

			const buffer = output.target.buffer;
			if (!buffer) {
				throw new Error(
					"audio extraction produced no output — the muxer returned an empty buffer",
				);
			}
			onProgress(1, "MUX");
			return buffer;
		},

		/**
		 * Extraction streams for the same reason conversion does: the *input* is
		 * a video file, so it can be enormous even though the audio coming out
		 * of it is small.
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

			await runExtraction(lib, source, output, target, params, onProgress);
			onProgress(1, "MUX");
		},
	};
}
