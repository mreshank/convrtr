import { describe, expect, it } from "vitest";
import { adxToWavEngine } from "../index";

function buildMockAdx(
	channels: number,
	sampleRate: number,
	sampleCount: number,
): Uint8Array {
	const blockSize = 18;
	const frameSize = blockSize * channels;
	const blockCount = Math.ceil(sampleCount / 32);
	const dataSize = blockCount * frameSize;
	const copyrightOffset = 0x14; // data starts at 0x18
	const headerSize = copyrightOffset + 4; // 24 bytes
	const totalSize = headerSize + dataSize;

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// Signature: 0x80 0x00
	bytes[0] = 0x80;
	bytes[1] = 0x00;

	// Copyright offset: 0x0014 (data starts at 0x0018)
	view.setUint16(2, copyrightOffset, false);

	// Encoding type: 3 (standard ADX)
	bytes[4] = 3;
	// Block size: 18
	bytes[5] = blockSize;
	// Bit depth: 4
	bytes[6] = 4;
	// Channel count
	bytes[7] = channels;

	// Sample rate (BE)
	view.setUint32(8, sampleRate, false);
	// Total samples (BE)
	view.setUint32(12, sampleCount, false);
	// Highpass frequency (BE): 500 Hz
	view.setUint16(16, 500, false);
	// Version: 3, flags: 0
	bytes[18] = 3;
	bytes[19] = 0;

	// Copyright string: "(c)CRI"
	const cri = new TextEncoder().encode("(c)CRI");
	bytes.set(cri, copyrightOffset - 2);

	// Fill audio frames with valid scale and nibbles
	for (let b = 0; b < blockCount; b++) {
		for (let ch = 0; ch < channels; ch++) {
			const offset = headerSize + b * frameSize + ch * blockSize;
			// Scale factor: e.g. 100
			view.setUint16(offset, 100, false);
			// Fill 16 bytes of nibbles (e.g. alternating small deltas)
			for (let i = 0; i < 16; i++) {
				bytes[offset + 2 + i] = 0x12; // nibble 1, nibble 2
			}
		}
	}

	return bytes;
}

describe("adxToWavEngine", () => {
	it("probes successfully", async () => {
		const supported = await adxToWavEngine.probe();
		expect(supported).toBe(true);
	});

	it("decodes mono CRIWARE ADX to standard WAV", async () => {
		const mockAdx = buildMockAdx(1, 44100, 64);
		const progress: string[] = [];

		const result = await adxToWavEngine.run(
			mockAdx.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(44);
		const view = new DataView(result);
		// Check "RIFF" and "WAVE"
		const riff = String.fromCharCode(...new Uint8Array(result.slice(0, 4)));
		const wave = String.fromCharCode(...new Uint8Array(result.slice(8, 12)));
		expect(riff).toBe("RIFF");
		expect(wave).toBe("WAVE");

		// Channels = 1
		expect(view.getUint16(22, true)).toBe(1);
		// Sample rate = 44100
		expect(view.getUint32(24, true)).toBe(44100);
		// Bits per sample = 16
		expect(view.getUint16(34, true)).toBe(16);

		expect(progress).toContain("HEADER");
		expect(progress).toContain("DECODE");
		expect(progress).toContain("DONE");
	});

	it("decodes stereo CRIWARE ADX to standard WAV", async () => {
		const mockAdx = buildMockAdx(2, 48000, 32);
		const result = await adxToWavEngine.run(
			mockAdx.buffer as ArrayBuffer,
			{},
			() => {},
		);

		expect(result.byteLength).toBeGreaterThan(44);
		const view = new DataView(result);
		// Channels = 2
		expect(view.getUint16(22, true)).toBe(2);
		// Sample rate = 48000
		expect(view.getUint32(24, true)).toBe(48000);
		// Bits per sample = 16
		expect(view.getUint16(34, true)).toBe(16);
	});

	it("rejects non-ADX or corrupt files", async () => {
		const tooSmall = new Uint8Array([1, 2, 3]);
		await expect(
			adxToWavEngine.run(tooSmall.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/too small/i);

		const badMagic = new Uint8Array(40);
		badMagic[0] = 0x00;
		badMagic[1] = 0x00;
		await expect(
			adxToWavEngine.run(badMagic.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/invalid adx header signature/i);
	});
});
