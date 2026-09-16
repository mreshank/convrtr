import { describe, expect, it } from "vitest";
import { convertXmiToWav, xmiToWavEngine } from "../index";

function createMockXmiFile(): Uint8Array {
	// IFF container: FORM (4) + len (4) + XMID (4) + EVNT (4) + evntLen (4) + event bytes
	const buffer = new Uint8Array(48);
	const view = new DataView(buffer.buffer);

	// "FORM"
	buffer[0] = 0x46; // F
	buffer[1] = 0x4f; // O
	buffer[2] = 0x52; // R
	buffer[3] = 0x4d; // M
	view.setUint32(4, 40, false); // Length 40 BE

	// "XMID"
	buffer[8] = 0x58; // X
	buffer[9] = 0x4d; // M
	buffer[10] = 0x49; // I
	buffer[11] = 0x44; // D

	// "EVNT"
	buffer[12] = 0x45; // E
	buffer[13] = 0x56; // V
	buffer[14] = 0x4e; // N
	buffer[15] = 0x54; // T
	view.setUint32(16, 24, false); // Length 24 BE

	// Events:
	// Event 1 at offset 20:
	// Delay 10 ticks (0x0A)
	buffer[20] = 0x0a;
	// Status Note On Channel 0: 0x90
	buffer[21] = 0x90;
	// Note: 60 (Middle C)
	buffer[22] = 60;
	// Duration: 30 ticks
	buffer[23] = 30;
	// Velocity: 100
	buffer[24] = 100;

	// Event 2 at offset 25:
	// Delay 30 ticks
	buffer[25] = 30;
	// Status Note On Channel 0: 0x90
	buffer[26] = 0x90;
	// Note: 64 (E4)
	buffer[27] = 64;
	// Duration: 30 ticks
	buffer[28] = 30;
	// Velocity: 100
	buffer[29] = 100;

	// End of track: 0xFF, 0x2F, 0x00
	buffer[30] = 0x00; // 0 delay
	buffer[31] = 0xff;
	buffer[32] = 0x2f;
	buffer[33] = 0x00;

	return buffer;
}

describe("Miles Sound System XMI Audio Engine", () => {
	it("converts a valid XMI file into 16-bit stereo WAV", () => {
		const xmiBytes = createMockXmiFile();
		const result = convertXmiToWav(xmiBytes);

		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.formType).toBe("XMID");
		expect(result.metadata.sampleRate).toBe(44100);
		expect(result.metadata.trackCount).toBeGreaterThanOrEqual(1);

		// Check RIFF WAVE header
		const view = new DataView(result.wavBuffer);
		expect(view.getUint32(0, false)).toBe(0x52494646); // "RIFF"
		expect(view.getUint32(8, false)).toBe(0x57415645); // "WAVE"
	});

	it("handles minimal 16-byte header with synthesized fallback notes", () => {
		const header = new Uint8Array(16);
		header[0] = 0x46; // F
		header[1] = 0x4f; // O
		header[2] = 0x52; // R
		header[3] = 0x4d; // M
		header[8] = 0x58; // X
		header[9] = 0x4d; // M
		header[10] = 0x49; // I
		header[11] = 0x44; // D

		const result = convertXmiToWav(header, { sampleRate: 22050 });
		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.sampleRate).toBe(22050);
	});

	it("throws error on truncated input smaller than 16 bytes", () => {
		expect(() => convertXmiToWav(new Uint8Array([1, 2, 3]))).toThrow(
			"Invalid XMI file: File size is smaller than the minimum 16-byte header.",
		);
	});

	it("runs through the engine interface", async () => {
		const xmiBytes = createMockXmiFile();
		const output = await xmiToWavEngine.run(
			xmiBytes.buffer.slice(0) as ArrayBuffer,
			{ tempo: 130, sampleRate: 22050 },
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(44);
	});
});
