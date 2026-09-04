import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseWav, type WavAudio, writeWav } from "./wav";

/**
 * FLAC encode and decode — the audio pack's lossless claim.
 *
 * FLAC is to audio what PNG is to images: roughly half the size of WAV, and
 * decoding returns the identical integer samples. Not "transparent to the ear"
 * — the same numbers. That makes it the only honest answer to "make this
 * smaller without losing anything", and the round-trip test proves it rather
 * than asserting it.
 *
 * ## Why the low-level API rather than the shipped helper classes
 *
 * libflacjs also ships `lib/encoder.js` and `lib/decoder.js`, which are far
 * nicer to call. They cannot be bundled: they are UMD modules whose factory
 * takes `require` as a *parameter*, so webpack's parser sees a shadowed
 * identifier, declines to rewrite `require("./utils/data-utils")`, and the
 * build succeeds while the browser fails at runtime with "Cannot find module".
 * The package's own README points bundler users at the raw library for this
 * reason. This file therefore drives the C API directly, which is also the
 * layer the helpers themselves call.
 *
 * ## Where the WASM file comes from
 *
 * The emscripten loader resolves its `.wasm` relative to the script directory,
 * which after bundling is `_next/static/chunks/`, and the package documents no
 * override. `scripts/copy-flac-wasm.mjs` puts the file there after the build.
 *
 * The asm.js build is not the easier option it appears to be: it needs a
 * separate `.mem` memory-initializer resolved exactly the same way, so it
 * trades a 129KB `.wasm` for a larger asset and a slower decoder while solving
 * nothing.
 */

async function loadFlac() {
	const module = await import("libflacjs/dist/libflac.min.wasm.js");
	const Flac = module.default ?? (module as unknown as typeof module.default);

	// Emscripten modules are usable only after an async setup step. Calling in
	// before it finishes fails in ways that look like corrupt input rather than
	// a lifecycle mistake.
	if (!Flac.isReady()) {
		await new Promise<void>((resolve) => Flac.on("ready", () => resolve()));
	}
	return Flac;
}

function clampCompression(value: ParamValue | undefined): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 5;
	return Math.min(8, Math.max(0, Math.round(value)));
}

/**
 * Encodes samples to FLAC.
 *
 * Separated from the engine so the trim tool can cut a FLAC and write it back
 * without going through a WAV in between — which would work, but would mean
 * two extra format conversions for an operation that never leaves the
 * lossless domain.
 */
export async function encodeFlac(
	audio: WavAudio,
	options: { compression?: number; verify?: boolean } = {},
): Promise<Uint8Array> {
	const frames = audio.samples[0]?.length ?? 0;
	if (frames === 0) throw new Error("There is no audio to encode.");

	const Flac = await loadFlac();
	const encoder = Flac.create_libflac_encoder(
		audio.sampleRate,
		audio.channels,
		audio.bitsPerSample,
		clampCompression(options.compression),
		frames,
		options.verify !== false,
	);
	if (encoder === 0) {
		throw new Error(
			"The FLAC encoder could not be created for this audio format.",
		);
	}

	const chunks: Uint8Array[] = [];
	try {
		// The buffer handed to the write callback is reused between calls, so it
		// must be copied. Keeping the view would leave every chunk pointing at
		// whatever was written last.
		const status = Flac.init_encoder_stream(encoder, (data) => {
			chunks.push(new Uint8Array(data));
		});
		if (status !== 0) {
			throw new Error(`The FLAC encoder refused to start (status ${status}).`);
		}

		// The C API takes interleaved samples; the WAV reader produces one array
		// per channel, so they are woven together here.
		const interleaved = new Int32Array(frames * audio.channels);
		for (let frame = 0; frame < frames; frame++) {
			for (let channel = 0; channel < audio.channels; channel++) {
				interleaved[frame * audio.channels + channel] =
					audio.samples[channel]?.[frame] ?? 0;
			}
		}

		const ok = Flac.FLAC__stream_encoder_process_interleaved(
			encoder,
			interleaved,
			frames,
		);
		if (!ok) throw new Error("The FLAC encoder rejected this audio.");
		Flac.FLAC__stream_encoder_finish(encoder);
	} finally {
		// Always released: the encoder holds memory inside the WASM heap that
		// nothing else will reclaim.
		Flac.FLAC__stream_encoder_delete(encoder);
	}

	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	if (total === 0) {
		throw new Error(
			"The FLAC encoder produced no output, so the conversion cannot be trusted.",
		);
	}
	const output = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.length;
	}
	return output;
}

/** Decodes FLAC into samples. */
export async function decodeFlac(input: ArrayBuffer): Promise<WavAudio> {
	const Flac = await loadFlac();
	const bytes = new Uint8Array(input);

	const decoder = Flac.create_libflac_decoder(true);
	if (decoder === 0) throw new Error("The FLAC decoder could not be created.");

	let sampleRate = 0;
	let channels = 0;
	let bitsPerSample = 0;
	const perChannel: Uint8Array[][] = [];
	let readOffset = 0;
	let failure: string | null = null;

	try {
		const status = Flac.init_decoder_stream(
			decoder,
			// Pull model: the decoder asks for up to `size` bytes at a time.
			(size) => {
				const remaining = bytes.length - readOffset;
				if (remaining <= 0) {
					return { buffer: undefined, readDataLength: 0, error: false };
				}
				const length = Math.min(size, remaining);
				const slice = bytes.subarray(readOffset, readOffset + length);
				readOffset += length;
				return { buffer: slice, readDataLength: length, error: false };
			},
			(channelBuffers) => {
				// Copied for the same reason as the encoder's chunks: these views
				// are reused between frames.
				perChannel.push(channelBuffers.map((b) => new Uint8Array(b)));
			},
			(code, description) => {
				failure = `${description} (code ${code})`;
			},
			(metadata) => {
				sampleRate = metadata.sampleRate;
				channels = metadata.channels;
				bitsPerSample = metadata.bitsPerSample;
			},
		);
		if (status !== 0) {
			throw new Error(`The FLAC decoder refused to start (status ${status}).`);
		}

		Flac.FLAC__stream_decoder_process_until_end_of_stream(decoder);
		Flac.FLAC__stream_decoder_finish(decoder);
	} finally {
		Flac.FLAC__stream_decoder_delete(decoder);
	}

	if (failure) {
		throw new Error(`This FLAC file could not be decoded: ${failure}`);
	}
	if (!channels || !sampleRate || !bitsPerSample) {
		throw new Error(
			"This does not look like a FLAC file — no stream information was found in it.",
		);
	}

	// Frames arrive in blocks; each block carries one buffer per channel, holding
	// raw little-endian samples at the stream's own bit depth.
	const bytesPerSample = bitsPerSample / 8;
	const totals = new Array<number>(channels).fill(0);
	for (const block of perChannel) {
		for (let channel = 0; channel < channels; channel++) {
			totals[channel] =
				(totals[channel] ?? 0) +
				Math.floor((block[channel]?.length ?? 0) / bytesPerSample);
		}
	}

	const samples = totals.map((count) => new Int32Array(count));
	const cursors = new Array<number>(channels).fill(0);
	for (const block of perChannel) {
		for (let channel = 0; channel < channels; channel++) {
			const source = block[channel];
			const target = samples[channel];
			if (!source || !target) continue;
			const count = Math.floor(source.length / bytesPerSample);
			let cursor = cursors[channel] ?? 0;
			for (let i = 0; i < count; i++) {
				target[cursor++] = readLittleEndian(
					source,
					i * bytesPerSample,
					bitsPerSample,
				);
			}
			cursors[channel] = cursor;
		}
	}

	return { sampleRate, channels, bitsPerSample, samples };
}

/** WAV in, FLAC out: same samples, roughly half the bytes. */
export function createFlacEncodeEngine(): Engine {
	return {
		id: "flac:encode",

		async probe() {
			// asm.js: nothing to feature-detect.
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

			onProgress(0.15, "ENCODE");
			const output = await encodeFlac(audio, {
				compression:
					typeof params.compression === "number"
						? params.compression
						: undefined,
				verify: params.verify !== false,
			});
			const total = output.length;

			onNotice?.(
				`Compressed to ${((total / input.byteLength) * 100).toFixed(0)}% of the original size with no loss — decoding this FLAC returns exactly the samples that were in the WAV.`,
			);
			onProgress(1, "ENCODE");
			return output.buffer as ArrayBuffer;
		},
	};
}

/** FLAC in, WAV out: the same samples the encoder was given. */
export function createFlacDecodeEngine(): Engine {
	return {
		id: "flac:decode",

		async probe() {
			return true;
		},

		async run(
			input: ArrayBuffer,
			_params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
		) {
			onProgress(0.1, "DECODE");
			const audio = await decodeFlac(input);
			onProgress(0.7, "WRITE");

			const wav = writeWav(audio);
			onProgress(1, "WRITE");
			return wav;
		},
	};
}

function readLittleEndian(bytes: Uint8Array, at: number, bits: number): number {
	switch (bits) {
		case 8:
			// FLAC stores 8-bit signed, unlike WAV's unsigned convention. The WAV
			// writer applies its own offset, so this must stay signed here.
			return ((bytes[at] ?? 0) << 24) >> 24;
		case 16:
			return (((bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8)) << 16) >> 16;
		case 24:
			return (
				(((bytes[at] ?? 0) |
					((bytes[at + 1] ?? 0) << 8) |
					((bytes[at + 2] ?? 0) << 16)) <<
					8) >>
				8
			);
		default:
			return (
				(bytes[at] ?? 0) |
				((bytes[at + 1] ?? 0) << 8) |
				((bytes[at + 2] ?? 0) << 16) |
				((bytes[at + 3] ?? 0) << 24) |
				0
			);
	}
}
