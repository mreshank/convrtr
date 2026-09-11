import { describe, expect, it } from "vitest";
import {
	aiffToWavEngine,
	convertAiffToWav,
	parseAiff,
	readExtended80,
	writeExtended80,
} from "../index";

function createMockAiff(options: {
	channels: number;
	sampleRate: number;
	sampleSize: number;
	numFrames: number;
}): Uint8Array {
	const bytesPerSample = Math.ceil(options.sampleSize / 8);
	const soundDataSize = options.numFrames * options.channels * bytesPerSample;
	const ssndChunkSize = 8 + soundDataSize; // offset (4) + blockSize (4) + data
	const commChunkSize = 18; // numChannels(2) + numSampleFrames(4) + sampleSize(2) + sampleRate(10)

	const totalFileSize =
		4 + // "FORM"
		4 + // fileSize
		4 + // "AIFF"
		8 + // COMM header
		commChunkSize +
		8 + // SSND header
		ssndChunkSize;

	const buffer = new Uint8Array(totalFileSize);
	const view = new DataView(buffer.buffer);

	// "FORM"
	buffer[0] = 0x46;
	buffer[1] = 0x4f;
	buffer[2] = 0x52;
	buffer[3] = 0x4d;
	view.setUint32(4, totalFileSize - 8, false);
	// "AIFF"
	buffer[8] = 0x41;
	buffer[9] = 0x49;
	buffer[10] = 0x46;
	buffer[11] = 0x46;

	// COMM chunk
	let offset = 12;
	buffer[offset] = 0x43;
	buffer[offset + 1] = 0x4f;
	buffer[offset + 2] = 0x4d;
	buffer[offset + 3] = 0x4d;
	view.setUint32(offset + 4, commChunkSize, false);
	view.setUint16(offset + 8, options.channels, false);
	view.setUint32(offset + 10, options.numFrames, false);
	view.setUint16(offset + 14, options.sampleSize, false);
	writeExtended80(view, offset + 16, options.sampleRate);

	offset += 8 + commChunkSize;

	// SSND chunk
	buffer[offset] = 0x53;
	buffer[offset + 1] = 0x53;
	buffer[offset + 2] = 0x4e;
	buffer[offset + 3] = 0x44;
	view.setUint32(offset + 4, ssndChunkSize, false);
	view.setUint32(offset + 8, 0, false); // offset
	view.setUint32(offset + 12, 0, false); // blockSize

	const soundStart = offset + 16;
	if (options.sampleSize === 16) {
		for (let i = 0; i < options.numFrames * options.channels; i++) {
			const val = Math.round(Math.sin(i / 8) * 12000);
			view.setInt16(soundStart + i * 2, val, false);
		}
	} else if (options.sampleSize === 8) {
		for (let i = 0; i < options.numFrames * options.channels; i++) {
			buffer[soundStart + i] = (i - 64) & 0xff;
		}
	}

	return buffer;
}

describe("aiff parser and WAV engine", () => {
	it("correctly reads and writes 80-bit IEEE 754 extended precision sample rates", () => {
		const buf = new Uint8Array(10);
		const view = new DataView(buf.buffer);

		for (const rate of [8000, 11025, 22050, 32000, 44100, 48000, 96000]) {
			writeExtended80(view, 0, rate);
			const readBack = Math.round(readExtended80(view, 0));
			expect(readBack).toBe(rate);
		}
	});

	it("parses 16-bit 44100 Hz stereo AIFF audio and converts to WAV", () => {
		const aiffBytes = createMockAiff({
			channels: 2,
			sampleRate: 44100,
			sampleSize: 16,
			numFrames: 441,
		});

		const meta = parseAiff(aiffBytes);
		expect(meta.numChannels).toBe(2);
		expect(meta.sampleRate).toBe(44100);
		expect(meta.sampleSize).toBe(16);
		expect(meta.numSampleFrames).toBe(441);
		expect(meta.durationSeconds).toBeCloseTo(0.01, 3);

		// WAV check
		expect(new TextDecoder().decode(meta.wavBytes.subarray(0, 4))).toBe("RIFF");
		expect(new TextDecoder().decode(meta.wavBytes.subarray(8, 12))).toBe(
			"WAVE",
		);
		expect(meta.wavBytes.length).toBe(44 + 441 * 2 * 2);
	});

	it("parses 8-bit mono AIFF audio", () => {
		const aiffBytes = createMockAiff({
			channels: 1,
			sampleRate: 11025,
			sampleSize: 8,
			numFrames: 220,
		});

		const meta = parseAiff(aiffBytes);
		expect(meta.numChannels).toBe(1);
		expect(meta.sampleRate).toBe(11025);
		expect(meta.sampleSize).toBe(8);
		expect(meta.wavBytes.length).toBe(44 + 220 * 2);
	});

	it("converts AIFF buffer via convertAiffToWav", () => {
		const aiffBytes = createMockAiff({
			channels: 1,
			sampleRate: 44100,
			sampleSize: 16,
			numFrames: 100,
		});

		const wavBuf = convertAiffToWav(aiffBytes.buffer.slice(0) as ArrayBuffer);
		expect(wavBuf.byteLength).toBe(44 + 100 * 2);
	});

	it("executes aiffToWavEngine with progress callback", async () => {
		const aiffBytes = createMockAiff({
			channels: 2,
			sampleRate: 44100,
			sampleSize: 16,
			numFrames: 200,
		});

		const progressUpdates: number[] = [];
		const res = await aiffToWavEngine.run(
			aiffBytes.buffer.slice(0) as ArrayBuffer,
			{},
			(ratio: number) => {
				progressUpdates.push(ratio);
			},
		);

		expect(progressUpdates.length).toBeGreaterThan(0);
		expect(res.byteLength).toBe(44 + 200 * 2 * 2);
	});

	it("throws on invalid signature or truncated buffer", () => {
		const bad = new Uint8Array([0x01, 0x02, 0x03]);
		expect(() => parseAiff(bad)).toThrow(/Buffer size is smaller/);

		const fake = new Uint8Array(12);
		expect(() => parseAiff(fake)).toThrow(/Invalid AIFF signature/);
	});
});
