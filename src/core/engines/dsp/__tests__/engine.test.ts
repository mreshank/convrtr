import { describe, expect, it } from "vitest";
import { convertDspToWav, dspToWavEngine } from "../index";

function buildMockDsp(sampleCount = 14): Uint8Array {
	// 96-byte header + 1 frame (8 bytes) = 104 bytes
	const buffer = new Uint8Array(104);
	const view = new DataView(buffer.buffer);

	// Big-endian fields
	view.setUint32(0, sampleCount, false); // numSamples
	view.setUint32(4, 16, false); // numNibbles
	view.setUint32(8, 32000, false); // sampleRate: 32 kHz
	view.setUint16(12, 0, false); // loopFlag: 0
	view.setUint16(14, 0, false); // format: 0
	view.setUint32(16, 0, false); // loopStart
	view.setUint32(20, 0, false); // loopEnd

	// Coefficients: identity / neutral (zeros)
	for (let i = 0; i < 16; i++) {
		view.setInt16(28 + i * 2, 0, false);
	}

	view.setInt16(64, 0, false); // initialHist1
	view.setInt16(66, 0, false); // initialHist2

	// Frame at offset 96 (8 bytes)
	// Header byte: predictor = 0, scale = 2 (shift by 2 -> 4)
	buffer[96] = 0x02;

	// 7 data bytes (14 nibbles)
	for (let i = 1; i < 8; i++) {
		buffer[96 + i] = 0x12; // nibbles 1 and 2
	}

	return buffer;
}

describe("Nintendo GameCube & Wii DSP ADPCM Audio Engine", () => {
	it("decodes DSP ADPCM stream into 16-bit linear PCM WAV", () => {
		const dsp = buildMockDsp();
		const result = convertDspToWav(dsp);

		expect(result.metadata.sampleRate).toBe(32000);
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.sampleCount).toBe(14);
		expect(result.wavBytes[0]).toBe(0x52); // 'R'
		expect(result.wavBytes[1]).toBe(0x49); // 'I'
		expect(result.wavBytes[2]).toBe(0x46); // 'F'
		expect(result.wavBytes[3]).toBe(0x46); // 'F'
		expect(result.wavBytes[8]).toBe(0x57); // 'W'
		expect(result.wavBytes[9]).toBe(0x41); // 'A'
		expect(result.wavBytes[10]).toBe(0x56); // 'V'
		expect(result.wavBytes[11]).toBe(0x45); // 'E'
		expect(result.wavBytes.length).toBe(44 + 14 * 2);
	});

	it("runs end-to-end via dspToWavEngine interface", async () => {
		const dsp = buildMockDsp();
		const output = await dspToWavEngine.run(
			dsp.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const wav = new Uint8Array(output);

		expect(wav[0]).toBe(0x52);
		expect(wav[8]).toBe(0x57);
	});

	it("throws on truncated header", () => {
		const truncated = new Uint8Array(50);
		expect(() => convertDspToWav(truncated)).toThrow(
			/smaller than the minimum/,
		);
	});

	it("throws on invalid sample rate", () => {
		const corrupted = buildMockDsp();
		const view = new DataView(corrupted.buffer);
		view.setUint32(8, 0, false); // 0 Hz
		expect(() => convertDspToWav(corrupted)).toThrow(/Invalid DSP sample rate/);
	});
});
