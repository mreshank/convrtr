import { describe, expect, it } from "vitest";
import { amrToWavEngine, convertAmrToWav } from "../index";

function createMockAmrNbFile(frameCount = 5, mode = 7): Uint8Array {
	// Mode 7: 12.2 kbps, 31 bytes payload + 1 byte TOC = 32 bytes per frame
	const payloadSize = 31;
	const frameSize = 1 + payloadSize;
	const totalSize = 6 + frameCount * frameSize;
	const buffer = new Uint8Array(totalSize);

	// Magic: "#!AMR\n"
	buffer.set([0x23, 0x21, 0x41, 0x4d, 0x52, 0x0a], 0);

	let offset = 6;
	for (let f = 0; f < frameCount; f++) {
		// TOC: (FT << 3) | (Q << 2) -> mode 7, Q=1
		buffer[offset++] = (mode << 3) | 0x04;
		for (let p = 0; p < payloadSize; p++) {
			buffer[offset++] = (f * 17 + p * 31) & 0xff;
		}
	}

	return buffer;
}

function createMockAmrWbFile(frameCount = 3, mode = 0): Uint8Array {
	// Mode 0: 6.60 kbps, 17 bytes payload + 1 byte TOC = 18 bytes per frame
	const payloadSize = 17;
	const frameSize = 1 + payloadSize;
	const totalSize = 9 + frameCount * frameSize;
	const buffer = new Uint8Array(totalSize);

	// Magic: "#!AMR-WB\n"
	buffer.set([0x23, 0x21, 0x41, 0x4d, 0x52, 0x2d, 0x57, 0x42, 0x0a], 0);

	let offset = 9;
	for (let f = 0; f < frameCount; f++) {
		buffer[offset++] = (mode << 3) | 0x04;
		for (let p = 0; p < payloadSize; p++) {
			buffer[offset++] = (f * 13 + p * 29) & 0xff;
		}
	}

	return buffer;
}

describe("AMR Audio Engine", () => {
	it("converts a valid AMR-NB file to 16-bit WAV", () => {
		const amrBytes = createMockAmrNbFile(10, 7);
		const result = convertAmrToWav(amrBytes);

		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.format).toBe("AMR-NB");
		expect(result.metadata.frameCount).toBe(10);
		expect(result.metadata.sampleRate).toBe(8000);
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.durationSeconds).toBe(0.2); // 10 frames * 20ms = 0.2s

		// Check RIFF header in output
		const view = new DataView(result.wavBuffer);
		expect(view.getUint32(0, false)).toBe(0x52494646); // "RIFF"
		expect(view.getUint32(8, false)).toBe(0x57415645); // "WAVE"
	});

	it("converts a valid AMR-WB file to 16-bit WAV", () => {
		const wbBytes = createMockAmrWbFile(5, 0);
		const result = convertAmrToWav(wbBytes);

		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);
		expect(result.metadata.format).toBe("AMR-WB");
		expect(result.metadata.frameCount).toBe(5);
		expect(result.metadata.sampleRate).toBe(16000);
		expect(result.metadata.durationSeconds).toBe(0.1);
	});

	it("supports custom sample rates and stereo expansion", () => {
		const amrBytes = createMockAmrNbFile(5, 7);
		const result = convertAmrToWav(amrBytes, {
			sampleRate: 44100,
			stereo: true,
		});

		expect(result.metadata.sampleRate).toBe(44100);
		expect(result.metadata.channels).toBe(2);
		expect(result.wavBuffer.byteLength).toBeGreaterThan(1000);
	});

	it("throws an error on invalid or corrupted AMR input", () => {
		expect(() => convertAmrToWav(new Uint8Array([1, 2, 3]))).toThrow(
			"Invalid AMR file: File is too short.",
		);

		expect(() =>
			convertAmrToWav(
				new Uint8Array([0x4e, 0x4f, 0x54, 0x41, 0x4d, 0x52, 0x0a]),
			),
		).toThrow(
			"Invalid AMR file: Missing '#!AMR\\n' or '#!AMR-WB\\n' header signature.",
		);
	});

	it("runs through the engine interface", async () => {
		const amrBytes = createMockAmrNbFile(4, 7);
		const output = await amrToWavEngine.run(
			amrBytes.buffer.slice(0) as ArrayBuffer,
			{ sampleRate: 8000 },
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(44);
	});
});
