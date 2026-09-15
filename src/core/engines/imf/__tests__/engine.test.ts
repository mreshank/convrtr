import { describe, expect, it } from "vitest";
import { convertImfToWav, imfToWavEngine } from "../index";

function createMockImfType0(): Uint8Array {
	// 4 events x 4 bytes = 16 bytes
	const buffer = new Uint8Array(16);
	const view = new DataView(buffer.buffer);

	// Event 1: Set operator 0 Total Level (reg 0x40, val 0x00, delay 10)
	buffer[0] = 0x40;
	buffer[1] = 0x00;
	view.setUint16(2, 10, true);

	// Event 2: Set F-Number low (reg 0xA0, val 0x90, delay 5)
	buffer[4] = 0xa0;
	buffer[5] = 0x90;
	view.setUint16(6, 5, true);

	// Event 3: Key-on channel 0 (reg 0xB0, val 0x31, delay 20)
	buffer[8] = 0xb0;
	buffer[9] = 0x31;
	view.setUint16(10, 20, true);

	// Event 4: Key-off channel 0 (reg 0xB0, val 0x11, delay 10)
	buffer[12] = 0xb0;
	buffer[13] = 0x11;
	view.setUint16(14, 10, true);

	return buffer;
}

function createMockImfType1(): Uint8Array {
	const body = createMockImfType0();
	const buffer = new Uint8Array(2 + body.length);
	const view = new DataView(buffer.buffer);

	// Length word prefix: body length in bytes
	view.setUint16(0, body.length, true);
	buffer.set(body, 2);

	return buffer;
}

describe("IMF OPL2 Audio Engine", () => {
	it("converts a valid Type 0 IMF file into 16-bit stereo WAV", () => {
		const imfBytes = createMockImfType0();
		const result = convertImfToWav(imfBytes);

		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.format).toBe("IMF-Type0");
		expect(result.metadata.clockRate).toBe(560);
		expect(result.metadata.channels).toBe(2);
		expect(result.metadata.eventCount).toBe(4);
		expect(result.metadata.totalTicks).toBe(45); // 10 + 5 + 20 + 10 = 45

		// Check RIFF header
		const view = new DataView(result.wavBuffer);
		expect(view.getUint32(0, false)).toBe(0x52494646); // "RIFF"
		expect(view.getUint32(8, false)).toBe(0x57415645); // "WAVE"
	});

	it("converts a valid Type 1 IMF file into 16-bit stereo WAV", () => {
		const imfBytes = createMockImfType1();
		const result = convertImfToWav(imfBytes, { clockRate: 700 });

		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.format).toBe("IMF-Type1");
		expect(result.metadata.clockRate).toBe(700);
		expect(result.metadata.eventCount).toBe(4);
	});

	it("throws on invalid or truncated input", () => {
		expect(() => convertImfToWav(new Uint8Array([0, 1, 2]))).toThrow(
			"Invalid IMF file: File size is smaller than minimum 8-byte event stream.",
		);
	});

	it("runs through the engine interface", async () => {
		const imfBytes = createMockImfType0();
		const output = await imfToWavEngine.run(
			imfBytes.buffer.slice(0) as ArrayBuffer,
			{ clockRate: 560, sampleRate: 22050 },
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(44);
	});
});
