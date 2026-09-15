import { describe, expect, it } from "vitest";
import { convertRolToWav, rolToWavEngine } from "../index";

function createMockRolFile(): Uint8Array {
	// 16 bytes header + track event bytes
	const buffer = new Uint8Array(32);
	const view = new DataView(buffer.buffer);

	// Header:
	// majorVer = 1, minorVer = 5 -> version 15
	view.setUint16(0, 1, true);
	view.setUint16(2, 5, true);
	// ticksPerBeat = 120
	view.setUint16(4, 120, true);
	// beatsPerMeasure = 4
	view.setUint16(6, 4, true);
	// tempo = 120 bpm
	view.setUint16(8, 120, true);
	// voiceCount / extra flags in header
	view.setUint16(10, 9, true);
	view.setUint16(12, 0, true);
	view.setUint16(14, 0, true);

	// Note event 1 at offset 16: channel 0, note 60 (C4), durTicks 60
	buffer[16] = 0; // channel 0
	buffer[17] = 60; // note 60
	view.setUint16(18, 60, true); // 60 ticks duration

	// Note event 2 at offset 20: channel 1, note 64 (E4), durTicks 60
	buffer[20] = 1;
	buffer[21] = 64;
	view.setUint16(22, 60, true);

	return buffer;
}

describe("AdLib ROL FM Audio Engine", () => {
	it("converts a valid ROL file into 16-bit stereo WAV", () => {
		const rolBytes = createMockRolFile();
		const result = convertRolToWav(rolBytes);

		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.version).toBe(15);
		expect(result.metadata.tempo).toBe(120);
		expect(result.metadata.voiceCount).toBe(9);
		expect(result.metadata.sampleRate).toBe(44100);

		// Verify RIFF WAVE header
		const view = new DataView(result.wavBuffer);
		expect(view.getUint32(0, false)).toBe(0x52494646); // "RIFF"
		expect(view.getUint32(8, false)).toBe(0x57415645); // "WAVE"
	});

	it("handles minimal 16-byte header with synthesized fallback notes", () => {
		const headerOnly = new Uint8Array(16);
		const view = new DataView(headerOnly.buffer);
		view.setUint16(0, 2, true);
		view.setUint16(2, 0, true);
		view.setUint16(8, 140, true);

		const result = convertRolToWav(headerOnly, { sampleRate: 22050 });
		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.version).toBe(20);
		expect(result.metadata.tempo).toBe(140);
		expect(result.metadata.sampleRate).toBe(22050);
	});

	it("throws on truncated input smaller than 16 bytes", () => {
		expect(() => convertRolToWav(new Uint8Array([0, 1, 2]))).toThrow(
			"Invalid ROL file: File size is smaller than the minimum 16-byte header.",
		);
	});

	it("runs through the engine interface", async () => {
		const rolBytes = createMockRolFile();
		const output = await rolToWavEngine.run(
			rolBytes.buffer.slice(0) as ArrayBuffer,
			{ tempo: 130, sampleRate: 22050 },
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(44);
	});
});
