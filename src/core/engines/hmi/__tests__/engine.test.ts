import { describe, expect, it } from "vitest";
import { convertHmiToWav, hmiToWavEngine } from "../index";

function createMockHmi(): Uint8Array {
	const buffer = new Uint8Array(128);
	const view = new DataView(buffer.buffer);

	// Signature: "HMI-MIDIFILE0115"
	const sig = new TextEncoder().encode("HMI-MIDIFILE0115");
	buffer.set(sig, 0);

	// Offset 0x30: Track count (1)
	view.setUint32(0x30, 1, true);
	// Offset 0x34: Division (120)
	view.setUint16(0x34, 120, true);
	// Offset 0x38: Tracks offset (0x40)
	view.setUint32(0x38, 0x40, true);

	// Track data at 0x40
	let p = 0x40;
	// Delta 0, Program Change ch 0, patch 1
	buffer[p++] = 0x00;
	buffer[p++] = 0xc0;
	buffer[p++] = 0x01;

	// Delta 0, Note On ch 0, note 60 (Middle C), vel 100
	buffer[p++] = 0x00;
	buffer[p++] = 0x90;
	buffer[p++] = 60;
	buffer[p++] = 100;

	// Delta 120 (0x78), Note Off ch 0, note 60
	buffer[p++] = 0x78;
	buffer[p++] = 0x80;
	buffer[p++] = 60;
	buffer[p++] = 0;

	// Delta 0, Meta End of Track
	buffer[p++] = 0x00;
	buffer[p++] = 0xff;
	buffer[p++] = 0x2f;
	buffer[p++] = 0x00;

	return buffer;
}

describe("Human Machine Interfaces (HMI) Audio Engine", () => {
	it("synthesizes valid HMI file into a stereo WAV", () => {
		const hmiBytes = createMockHmi();
		const result = convertHmiToWav(hmiBytes, { sampleRate: 22050 });

		expect(result.wavBuffer.byteLength).toBeGreaterThan(100);
		expect(result.metadata.version).toBe("HMI-MIDIFILE0115");
		expect(result.metadata.trackCount).toBe(1);
		expect(result.metadata.division).toBe(120);
		expect(result.metadata.sampleRate).toBe(22050);

		// WAV RIFF magic check
		const view = new DataView(result.wavBuffer);
		expect(view.getUint32(0, false)).toBe(0x52494646); // "RIFF"
		expect(view.getUint32(8, false)).toBe(0x57415645); // "WAVE"
	});

	it("throws on invalid or truncated HMI files", () => {
		expect(() => convertHmiToWav(new Uint8Array([1, 2, 3]))).toThrow(
			"Invalid HMI file: File size is smaller than the minimum 32-byte header.",
		);

		const badSig = new Uint8Array(64);
		expect(() => convertHmiToWav(badSig)).toThrow(
			"Invalid HMI file: Unrecognized signature",
		);
	});

	it("runs through the engine interface", async () => {
		const hmiBytes = createMockHmi();
		const output = await hmiToWavEngine.run(
			hmiBytes.buffer.slice(0) as ArrayBuffer,
			{ sampleRate: 22050, tempo: 140 },
			() => {},
		);

		expect(output.byteLength).toBeGreaterThan(100);
		const view = new DataView(output);
		expect(view.getUint32(0, false)).toBe(0x52494646);
	});
});
