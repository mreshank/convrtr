/**
 * Reads and writes WAV, the container FLAC is measured against.
 *
 * Written here rather than pulled in as a dependency because the part that
 * matters is small and exact: find the format and data chunks, and hand back
 * integer samples per channel. What a library would add is breadth of format
 * support, and breadth is precisely where a lossless claim goes wrong — a
 * decoder that quietly coerces 24-bit to 16-bit, or float to integer, would
 * make this project's central promise false while looking like it worked.
 *
 * So this supports exactly what FLAC can carry losslessly — 8, 16, 24 and
 * 32-bit integer PCM — and refuses everything else by name rather than
 * approximating it.
 */

export type WavAudio = {
	sampleRate: number;
	channels: number;
	bitsPerSample: number;
	/** One Int32Array per channel, samples sign-extended to 32 bits. */
	samples: Int32Array[];
};

const RIFF = 0x46464952; // "RIFF" little-endian
const WAVE = 0x45564157; // "WAVE"
const FMT = 0x20746d66; // "fmt "
const DATA = 0x61746164; // "data"

const FORMAT_PCM = 1;
const FORMAT_FLOAT = 3;
const FORMAT_EXTENSIBLE = 0xfffe;

export function parseWav(input: ArrayBuffer): WavAudio {
	const view = new DataView(input);
	if (input.byteLength < 12) {
		throw new Error("This file is too short to be a WAV file.");
	}
	if (view.getUint32(0, true) !== RIFF || view.getUint32(8, true) !== WAVE) {
		throw new Error(
			"This is not a WAV file — it does not begin with a RIFF/WAVE header.",
		);
	}

	let format = 0;
	let channels = 0;
	let sampleRate = 0;
	let bitsPerSample = 0;
	let dataOffset = -1;
	let dataLength = 0;

	// Walk the chunks rather than assuming "fmt " then "data" at fixed offsets.
	// Real files carry LIST/INFO, id3 and padding chunks between them, and a
	// fixed-offset reader silently reads metadata as audio.
	let offset = 12;
	while (offset + 8 <= input.byteLength) {
		const id = view.getUint32(offset, true);
		const size = view.getUint32(offset + 4, true);
		const body = offset + 8;

		if (id === FMT && body + 16 <= input.byteLength) {
			format = view.getUint16(body, true);
			channels = view.getUint16(body + 2, true);
			sampleRate = view.getUint32(body + 4, true);
			bitsPerSample = view.getUint16(body + 14, true);
			// WAVE_FORMAT_EXTENSIBLE stores the real format in a GUID whose first
			// two bytes are the format tag. Without this, every 24-bit and
			// multichannel file — which are usually extensible — is rejected.
			if (format === FORMAT_EXTENSIBLE && body + 26 <= input.byteLength) {
				format = view.getUint16(body + 24, true);
			}
		} else if (id === DATA) {
			dataOffset = body;
			dataLength = Math.min(size, input.byteLength - body);
		}

		// Chunks are word-aligned: an odd size is followed by a pad byte.
		offset = body + size + (size % 2);
	}

	if (dataOffset < 0 || channels === 0 || sampleRate === 0) {
		throw new Error("This WAV file is missing its format or audio data.");
	}
	if (format === FORMAT_FLOAT) {
		throw new Error(
			"This is a floating-point WAV file. FLAC stores integer samples, so converting it would mean changing every value — convrtr will not do that silently.",
		);
	}
	if (format !== FORMAT_PCM) {
		throw new Error(
			`This WAV file uses compressed audio (format ${format}) rather than plain PCM, which convrtr cannot read.`,
		);
	}
	if (![8, 16, 24, 32].includes(bitsPerSample)) {
		throw new Error(
			`${bitsPerSample}-bit audio is not something FLAC can carry losslessly.`,
		);
	}

	const bytesPerSample = bitsPerSample / 8;
	const frameCount = Math.floor(dataLength / (bytesPerSample * channels));
	const samples: Int32Array[] = Array.from(
		{ length: channels },
		() => new Int32Array(frameCount),
	);

	const bytes = new Uint8Array(input, dataOffset, dataLength);
	// Channel outer, frame inner: this hoists the per-channel array lookup out
	// of the hot loop and removes the non-null assertion that `samples[channel]`
	// otherwise needs on every single sample.
	for (let channel = 0; channel < channels; channel++) {
		const target = samples[channel];
		if (!target) continue;
		for (let frame = 0; frame < frameCount; frame++) {
			const at = (frame * channels + channel) * bytesPerSample;
			target[frame] = readSample(bytes, at, bitsPerSample);
		}
	}

	return { sampleRate, channels, bitsPerSample, samples };
}

/**
 * Reads one little-endian sample.
 *
 * 8-bit WAV is *unsigned* with a 128 midpoint while every wider depth is
 * signed two's complement — an inconsistency in the format itself, and the
 * classic way an 8-bit file comes back as loud noise.
 */
function readSample(bytes: Uint8Array, at: number, bits: number): number {
	switch (bits) {
		case 8:
			return (bytes[at] ?? 0) - 128;
		case 16: {
			const value = (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
			return (value << 16) >> 16;
		}
		case 24: {
			const value =
				(bytes[at] ?? 0) |
				((bytes[at + 1] ?? 0) << 8) |
				((bytes[at + 2] ?? 0) << 16);
			return (value << 8) >> 8;
		}
		default: {
			return (
				(bytes[at] ?? 0) |
				((bytes[at + 1] ?? 0) << 8) |
				((bytes[at + 2] ?? 0) << 16) |
				((bytes[at + 3] ?? 0) << 24) |
				0
			);
		}
	}
}

/** Serialises integer PCM back into a canonical WAV file. */
export function writeWav(audio: WavAudio): ArrayBuffer {
	const { sampleRate, channels, bitsPerSample, samples } = audio;
	const bytesPerSample = bitsPerSample / 8;
	const frameCount = samples[0]?.length ?? 0;
	const dataLength = frameCount * channels * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(buffer);

	view.setUint32(0, RIFF, true);
	view.setUint32(4, 36 + dataLength, true);
	view.setUint32(8, WAVE, true);
	view.setUint32(12, FMT, true);
	view.setUint32(16, 16, true);
	view.setUint16(20, FORMAT_PCM, true);
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * bytesPerSample, true);
	view.setUint16(32, channels * bytesPerSample, true);
	view.setUint16(34, bitsPerSample, true);
	view.setUint32(36, DATA, true);
	view.setUint32(40, dataLength, true);

	const bytes = new Uint8Array(buffer, 44);
	for (let frame = 0; frame < frameCount; frame++) {
		for (let channel = 0; channel < channels; channel++) {
			const at = (frame * channels + channel) * bytesPerSample;
			writeSample(bytes, at, bitsPerSample, samples[channel]?.[frame] ?? 0);
		}
	}

	return buffer;
}

function writeSample(
	bytes: Uint8Array,
	at: number,
	bits: number,
	value: number,
): void {
	switch (bits) {
		case 8:
			bytes[at] = (value + 128) & 0xff;
			return;
		case 16:
			bytes[at] = value & 0xff;
			bytes[at + 1] = (value >> 8) & 0xff;
			return;
		case 24:
			bytes[at] = value & 0xff;
			bytes[at + 1] = (value >> 8) & 0xff;
			bytes[at + 2] = (value >> 16) & 0xff;
			return;
		default:
			bytes[at] = value & 0xff;
			bytes[at + 1] = (value >> 8) & 0xff;
			bytes[at + 2] = (value >> 16) & 0xff;
			bytes[at + 3] = (value >> 24) & 0xff;
	}
}
