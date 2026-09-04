import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseWav } from "./wav";

/**
 * WAV to MP3.
 *
 * The most-requested audio conversion there is, and the one where being honest
 * costs something: MP3 permanently discards audio, and no setting here changes
 * that. What the settings choose is how much. The tool says so plainly and
 * points at FLAC for anyone who wanted "smaller" rather than "smaller and
 * lossy" — which, judging by how often MP3 is asked for by name, is a fair
 * number of people who have never been told there is another option.
 *
 * ## Sample rates
 *
 * MP3 supports a fixed set of sample rates. A 96kHz master is not one of them,
 * and the fix would be to resample — which changes every sample by
 * interpolation, on top of the codec's own loss. This refuses instead and says
 * what to do, because silently resampling is precisely the kind of unannounced
 * damage this project exists to avoid.
 *
 * ## Bit depth
 *
 * LAME takes 16-bit samples. A 24-bit source is therefore truncated, which is
 * disclosed — though it is worth keeping in proportion: the codec's own loss is
 * far larger than the eight bits dropped on the way in.
 */

/** Sample rates MPEG-1/2/2.5 Layer III can actually store. */
const MP3_SAMPLE_RATES = [
	8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000,
];

/** LAME's natural block size; feeding it this keeps the encoder's own framing. */
const BLOCK = 1152;

function clampBitrate(value: ParamValue | undefined): number {
	const allowed = [64, 96, 128, 160, 192, 256, 320];
	if (typeof value !== "number" || !Number.isFinite(value)) return 192;
	// Snap to the nearest real bitrate rather than rejecting: the advanced
	// stepper can land between two, and quietly encoding at something LAME did
	// not accept would be worse than moving to the closest it did.
	return allowed.reduce((best, option) =>
		Math.abs(option - value) < Math.abs(best - value) ? option : best,
	);
}

/** Widens or narrows a sample of any supported depth to signed 16-bit. */
function toInt16(value: number, bits: number): number {
	if (bits === 16) return value;
	if (bits === 8) return value * 256;
	return value >> (bits - 16);
}

export function createMp3EncodeEngine(): Engine {
	return {
		id: "mp3:encode",

		async probe() {
			// Pure JavaScript: nothing to feature-detect.
			return true;
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.05, "READ");
			const audio = parseWav(input);
			const frames = audio.samples[0]?.length ?? 0;
			if (frames === 0) throw new Error("This WAV file contains no audio.");

			if (!MP3_SAMPLE_RATES.includes(audio.sampleRate)) {
				throw new Error(
					`MP3 cannot store ${audio.sampleRate}Hz audio. It supports ${MP3_SAMPLE_RATES.join(", ")}Hz — converting yours would mean resampling, which changes every sample, so convrtr will not do it silently. Convert to FLAC to keep this rate exactly.`,
				);
			}
			if (audio.channels > 2) {
				throw new Error(
					`MP3 carries at most two channels, and this file has ${audio.channels}.`,
				);
			}

			if (audio.bitsPerSample > 16) {
				onNotice?.(
					`This is ${audio.bitsPerSample}-bit audio and MP3 stores 16, so the extra detail is dropped before encoding. The codec's own loss is much larger than this, but it is worth knowing the file was not 24-bit by the time it reached the encoder.`,
				);
			}

			const bitrate = clampBitrate(params.bitrate);
			onProgress(0.15, "ENCODE");

			const { Mp3Encoder } = await import("@breezystack/lamejs");
			const encoder = new Mp3Encoder(audio.channels, audio.sampleRate, bitrate);

			const left = new Int16Array(BLOCK);
			const right = new Int16Array(BLOCK);
			const chunks: Uint8Array[] = [];
			const leftSource = audio.samples[0];
			const rightSource = audio.samples[1];

			for (let offset = 0; offset < frames; offset += BLOCK) {
				const size = Math.min(BLOCK, frames - offset);
				for (let i = 0; i < size; i++) {
					left[i] = toInt16(leftSource?.[offset + i] ?? 0, audio.bitsPerSample);
					if (audio.channels > 1) {
						right[i] = toInt16(
							rightSource?.[offset + i] ?? 0,
							audio.bitsPerSample,
						);
					}
				}

				// The final block is usually short; passing the full-length array
				// would encode whatever the previous iteration left in its tail.
				const encoded =
					audio.channels > 1
						? encoder.encodeBuffer(
								left.subarray(0, size),
								right.subarray(0, size),
							)
						: encoder.encodeBuffer(left.subarray(0, size));
				if (encoded.length > 0) chunks.push(encoded);

				if (offset % (BLOCK * 64) === 0) {
					onProgress(0.15 + (offset / frames) * 0.8, "ENCODE");
				}
			}

			const tail = encoder.flush();
			if (tail.length > 0) chunks.push(tail);

			const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
			if (total === 0) {
				throw new Error(
					"The MP3 encoder produced no output, so the conversion cannot be trusted.",
				);
			}
			const output = new Uint8Array(total);
			let cursor = 0;
			for (const chunk of chunks) {
				output.set(chunk, cursor);
				cursor += chunk.length;
			}

			onNotice?.(
				`Encoded at ${bitrate}kbps — ${((total / input.byteLength) * 100).toFixed(0)}% of the original size. MP3 discards audio permanently, so keep the original if you may want to edit or re-encode it later; FLAC would store it losslessly at roughly half the WAV's size.`,
			);
			onProgress(1, "ENCODE");
			return output.buffer as ArrayBuffer;
		},
	};
}
