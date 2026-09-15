import { describe, expect, it } from "vitest";
import { convertRadToWav, radToWavEngine } from "../index";

function createMockRadModule(): Uint8Array {
	// 16-byte signature
	const sig = "RAD by REALITY\0\0";
	const buffer = new Uint8Array(256);

	for (let i = 0; i < 16; i++) {
		buffer[i] = sig.charCodeAt(i);
	}

	buffer[16] = 0x10; // version 1.0
	buffer[17] = 6; // default speed 6
	buffer[18] = 1; // 1 instrument

	// Instrument 1: 11 bytes + 16-byte name
	// Modulator
	buffer[19] = 0x21; // mult 1, vib
	buffer[20] = 0x00; // ksl 0, level max
	buffer[21] = 0xf2; // attack 15, decay 2
	buffer[22] = 0xa4; // sustain 10, release 4
	buffer[23] = 0x00; // sine wave
	// Carrier
	buffer[24] = 0x21; // mult 1
	buffer[25] = 0x00; // ksl 0, level max
	buffer[26] = 0xf2; // attack 15, decay 2
	buffer[27] = 0xa4; // sustain 10, release 4
	buffer[28] = 0x00; // sine wave
	// Conn / FB
	buffer[29] = 0x00; // FM mode

	// Instrument name
	const instName = "AdLib Lead\0";
	for (let i = 0; i < instName.length; i++) {
		buffer[30 + i] = instName.charCodeAt(i);
	}

	let ptr = 46;
	buffer[ptr++] = 1; // 1 order
	buffer[ptr++] = 0; // order 0 -> pattern 0

	// Pattern 0: row 0 trigger note on channel 0
	buffer[ptr++] = 0x80 | 0x40 | 0x00; // ch 0, note & inst present
	buffer[ptr++] = 49; // Note C-4
	buffer[ptr++] = 1; // Instrument 1
	buffer[ptr++] = 0; // End of row 0

	// Fill remaining 63 rows with end-of-row 0
	for (let r = 1; r < 64; r++) {
		buffer[ptr++] = 0;
	}

	return buffer.subarray(0, ptr);
}

describe("RAD to WAV Engine", () => {
	it("rejects non-RAD buffer", () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => convertRadToWav(invalid)).toThrow(/Invalid RAD file/);
	});

	it("parses mock RAD module and synthesizes 16-bit stereo WAV", () => {
		const mock = createMockRadModule();
		const result = convertRadToWav(mock, {
			sampleRate: 22050,
			stereoSeparation: 60,
		});

		expect(result.metadata.title).toBe("RAD by REALITY");
		expect(result.metadata.numInstruments).toBe(1);
		expect(result.metadata.numOrders).toBe(1);
		expect(result.metadata.durationSeconds).toBeGreaterThan(0.5);

		expect(result.wavBuffer).toBeInstanceOf(ArrayBuffer);
		expect(result.wavBuffer.byteLength).toBeGreaterThan(1000);

		// Verify RIFF and WAVE signatures
		const wavBytes = new Uint8Array(result.wavBuffer);
		expect(
			String.fromCharCode(
				wavBytes[0] ?? 0,
				wavBytes[1] ?? 0,
				wavBytes[2] ?? 0,
				wavBytes[3] ?? 0,
			),
		).toBe("RIFF");
		expect(
			String.fromCharCode(
				wavBytes[8] ?? 0,
				wavBytes[9] ?? 0,
				wavBytes[10] ?? 0,
				wavBytes[11] ?? 0,
			),
		).toBe("WAVE");
	});

	it("runs via engine interface with options and progress tracking", async () => {
		const mock = createMockRadModule();
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await radToWavEngine.run(
			mock.buffer as ArrayBuffer,
			{ sampleRate: 22050 },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(1000);
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
