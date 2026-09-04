import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseWav } from "./wav";

/**
 * WAV to Opus, in an Ogg container.
 *
 * Opus is what MP3 would be if it were designed now: at 96kbps it is
 * comparable to MP3 at 192, it handles speech and music equally well, and it is
 * an open standard with no licensing question attached. It is also encoded by
 * the browser itself — no library ships with this tool at all, which is why
 * this page loads faster than the MP3 one despite doing more.
 *
 * It is still lossy, and says so. The reason to offer it beside MP3 is not that
 * it is "the good one" but that a person converting audio deserves to know a
 * better option exists before they spend quality on the familiar one.
 *
 * ## Composition rather than another codec
 *
 * Nothing here decodes or encodes directly: the WAV reader produces samples,
 * WebCodecs encodes them through mediabunny's `AudioSampleSource`, and
 * mediabunny muxes the result into Ogg. Each of those already existed for
 * other tools.
 */

/** Encoded in blocks so the encoder is fed steadily rather than in one lump. */
const BLOCK = 4096;

function clampBitrate(value: ParamValue | undefined): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 96_000;
	return Math.min(320_000, Math.max(32_000, Math.round(value / 8) * 8));
}

export function createOpusEncodeEngine(): Engine {
	return {
		id: "opus:encode",

		async probe() {
			if (typeof AudioEncoder === "undefined") return false;
			// Ask the browser rather than assume: Opus encoding is widely but not
			// universally available, and a tool that fails at conversion time is
			// worse than one that never offered itself.
			try {
				const { supported } = await AudioEncoder.isConfigSupported({
					codec: "opus",
					sampleRate: 48000,
					numberOfChannels: 2,
					bitrate: 96_000,
				});
				return supported === true;
			} catch {
				return false;
			}
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

			const bitrate = clampBitrate(params.bitrate);
			onProgress(0.15, "ENCODE");

			const lib = await import("mediabunny");
			const output = new lib.Output({
				format: new lib.OggOutputFormat(),
				target: new lib.BufferTarget(),
			});
			const source = new lib.AudioSampleSource({
				codec: "opus",
				bitrate,
			});
			output.addAudioTrack(source);
			await output.start();

			// Interleaved signed 16-bit, which is what the 's16' sample format
			// means and what every supported source depth is normalised to.
			const interleaved = new Int16Array(BLOCK * audio.channels);
			for (let offset = 0; offset < frames; offset += BLOCK) {
				const size = Math.min(BLOCK, frames - offset);
				for (let frame = 0; frame < size; frame++) {
					for (let channel = 0; channel < audio.channels; channel++) {
						const value = audio.samples[channel]?.[offset + frame] ?? 0;
						interleaved[frame * audio.channels + channel] = narrowTo16(
							value,
							audio.bitsPerSample,
						);
					}
				}

				const sample = new lib.AudioSample({
					// A copy, not a view: the sample is handed to the encoder
					// asynchronously and the scratch buffer is rewritten on the next
					// iteration.
					data: interleaved.slice(0, size * audio.channels),
					format: "s16",
					numberOfChannels: audio.channels,
					sampleRate: audio.sampleRate,
					timestamp: offset / audio.sampleRate,
				});
				// Awaited to respect encoder backpressure — without it a long file
				// queues every block at once and the encoder runs out of memory.
				await source.add(sample);
				sample.close();

				onProgress(0.15 + (offset / frames) * 0.75, "ENCODE");
			}

			source.close();
			await output.finalize();

			const buffer = output.target.buffer;
			if (!buffer || buffer.byteLength === 0) {
				throw new Error(
					"The Opus encoder produced no output, so the conversion cannot be trusted.",
				);
			}

			onNotice?.(
				`Encoded at ${Math.round(bitrate / 1000)}kbps — ${((buffer.byteLength / input.byteLength) * 100).toFixed(0)}% of the original size. Opus discards audio permanently, like MP3, but needs roughly half the bitrate for comparable quality. Use FLAC if you want the audio kept exactly.`,
			);
			onProgress(1, "MUX");
			return buffer;
		},
	};
}

function narrowTo16(value: number, bits: number): number {
	if (bits === 16) return value;
	if (bits === 8) return value * 256;
	return value >> (bits - 16);
}
