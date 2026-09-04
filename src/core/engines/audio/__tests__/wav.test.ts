import { describe, expect, it } from "vitest";
import { parseWav, type WavAudio, writeWav } from "../wav";

function roundTrip(audio: WavAudio): WavAudio {
	return parseWav(writeWav(audio));
}

function audio(bits: number, samples: number[][]): WavAudio {
	return {
		sampleRate: 44100,
		channels: samples.length,
		bitsPerSample: bits,
		samples: samples.map((channel) => Int32Array.from(channel)),
	};
}

describe("WAV round-trip", () => {
	for (const bits of [8, 16, 24, 32]) {
		it(`preserves every ${bits}-bit sample exactly`, () => {
			// The extremes of the range matter most: sign handling breaks at the
			// boundaries long before it breaks in the middle.
			const max = bits === 8 ? 127 : 2 ** (bits - 1) - 1;
			const min = bits === 8 ? -128 : -(2 ** (bits - 1));
			const left = [0, 1, -1, max, min, Math.floor(max / 2)];
			const right = [max, min, 0, 1, -1, Math.floor(min / 2)];

			const result = roundTrip(audio(bits, [left, right]));

			expect(Array.from(result.samples[0] ?? [])).toEqual(left);
			expect(Array.from(result.samples[1] ?? [])).toEqual(right);
			expect(result.bitsPerSample).toBe(bits);
			expect(result.channels).toBe(2);
			expect(result.sampleRate).toBe(44100);
		});
	}

	it("keeps channels separate rather than interleaving them", () => {
		// Interleaving errors produce audio that is not obviously wrong — the
		// channels simply swap or smear — so this asserts distinct content.
		const result = roundTrip(
			audio(16, [
				[100, 200, 300],
				[-100, -200, -300],
			]),
		);

		expect(Array.from(result.samples[0] ?? [])).toEqual([100, 200, 300]);
		expect(Array.from(result.samples[1] ?? [])).toEqual([-100, -200, -300]);
	});

	it("handles mono", () => {
		const result = roundTrip(audio(16, [[1, -1, 32767, -32768]]));
		expect(result.channels).toBe(1);
		expect(Array.from(result.samples[0] ?? [])).toEqual([1, -1, 32767, -32768]);
	});
});

describe("WAV parsing", () => {
	it("finds the data chunk after other chunks", () => {
		// Real files put LIST/INFO or id3 chunks between "fmt " and "data". A
		// reader assuming fixed offsets reads that metadata as audio.
		const original = writeWav(audio(16, [[1, 2, 3, 4]]));
		const extra = new Uint8Array(12);
		new DataView(extra.buffer).setUint32(0, 0x5453494c, true); // "LIST"
		new DataView(extra.buffer).setUint32(4, 4, true);

		const spliced = new Uint8Array(original.byteLength + extra.length);
		spliced.set(new Uint8Array(original, 0, 36), 0);
		spliced.set(extra, 36);
		spliced.set(new Uint8Array(original, 36), 36 + extra.length);
		// Fix the RIFF size to account for the inserted chunk.
		new DataView(spliced.buffer).setUint32(4, spliced.length - 8, true);

		const result = parseWav(spliced.buffer);
		expect(Array.from(result.samples[0] ?? [])).toEqual([1, 2, 3, 4]);
	});

	it("refuses a floating-point WAV rather than silently converting it", () => {
		const wav = new Uint8Array(writeWav(audio(16, [[1, 2]])));
		new DataView(wav.buffer).setUint16(20, 3, true); // WAVE_FORMAT_IEEE_FLOAT

		expect(() => parseWav(wav.buffer)).toThrow(/floating-point/i);
	});

	it("reads a WAVE_FORMAT_EXTENSIBLE file as the PCM it is", () => {
		// 24-bit and multichannel files are usually extensible. Rejecting them
		// would refuse exactly the high-resolution audio this tool exists for.
		//
		// Built byte by byte because the layout is the point: an extensible fmt
		// chunk is 40 bytes, and the real format tag lives in the first two
		// bytes of the SubFormat GUID at offset 44 — not in the audioFormat
		// field at 20, which reads 0xFFFE.
		const samples = [1000, -1000, 8_388_607, -8_388_608];
		const dataBytes = samples.length * 3;
		const buffer = new ArrayBuffer(60 + 8 + dataBytes);
		const view = new DataView(buffer);
		const bytes = new Uint8Array(buffer);

		bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
		view.setUint32(4, buffer.byteLength - 8, true);
		bytes.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
		bytes.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
		view.setUint32(16, 40, true); // extensible fmt chunk size
		view.setUint16(20, 0xfffe, true); // WAVE_FORMAT_EXTENSIBLE
		view.setUint16(22, 1, true); // mono
		view.setUint32(24, 48000, true);
		view.setUint32(28, 48000 * 3, true);
		view.setUint16(32, 3, true); // block align
		view.setUint16(34, 24, true); // bits per sample
		view.setUint16(36, 22, true); // cbSize
		view.setUint16(38, 24, true); // valid bits
		view.setUint32(40, 0x4, true); // channel mask
		view.setUint16(44, 1, true); // SubFormat GUID: PCM
		bytes.set([0x64, 0x61, 0x74, 0x61], 60); // "data"
		view.setUint32(64, dataBytes, true);
		samples.forEach((value, index) => {
			const at = 68 + index * 3;
			bytes[at] = value & 0xff;
			bytes[at + 1] = (value >> 8) & 0xff;
			bytes[at + 2] = (value >> 16) & 0xff;
		});

		const result = parseWav(buffer);

		expect(result.bitsPerSample).toBe(24);
		expect(result.sampleRate).toBe(48000);
		expect(Array.from(result.samples[0] ?? [])).toEqual(samples);
	});

	it("rejects a file that is not RIFF/WAVE at all", () => {
		const notWav = new Uint8Array(64);
		expect(() => parseWav(notWav.buffer)).toThrow(/not a WAV file/i);
	});
});
