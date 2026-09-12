import { describe, expect, it } from "vitest";
import { convertFarToWav, farToWavEngine } from "../index";

function createMockFar(options: {
	title?: string;
	message?: string;
	numSamples?: number;
}): Uint8Array {
	const title = options.title ?? "Cosmic Farandole Anthem";
	const message = options.message ?? "Composed on Farandole 1.0";
	const numSamples = options.numSamples ?? 1;

	const msgBytes = new TextEncoder().encode(message);
	const samplePcmLen = 256;
	const patSize = 64 * 16 * 4; // 1 pattern, 64 rows, 16 channels, 4 bytes/cell

	// Calculate total buffer size
	// Header: 97 bytes
	// Message: msgBytes.length
	// Orders: 256 bytes
	// Order trailer: 3 bytes
	// Pattern sizes: 2 bytes
	// Pattern data: patSize
	// Sample headers: 64 * 64 bytes = 4096 bytes
	// Sample PCM: numSamples * samplePcmLen
	const totalSize =
		97 +
		msgBytes.length +
		256 +
		3 +
		2 +
		patSize +
		64 * 64 +
		numSamples * samplePcmLen;

	const buffer = new Uint8Array(totalSize);
	const view = new DataView(buffer.buffer);

	// Magic: FAR\xFE at offset 0
	buffer[0] = 0x46; // 'F'
	buffer[1] = 0x41; // 'A'
	buffer[2] = 0x52; // 'R'
	buffer[3] = 0xfe;

	// Song name: 40 bytes at offset 4
	const nameBytes = new TextEncoder().encode(title);
	buffer.set(nameBytes.subarray(0, 39), 4);

	buffer[44] = 0x1a; // DOS EOF
	view.setUint16(45, 869, true); // Header length
	buffer[47] = 0x10; // Version 1.0

	// 16 channels active (offset 48)
	for (let ch = 0; ch < 16; ch++) {
		buffer[48 + ch] = 1;
	}

	// Tempo at offset 73
	view.setUint16(73, 120, true);

	// Channel panning (offset 75..90)
	for (let ch = 0; ch < 16; ch++) {
		buffer[75 + ch] = ch % 2 === 0 ? 3 : 12;
	}

	// Text message length (offset 95)
	view.setUint16(95, msgBytes.length, true);
	buffer.set(msgBytes, 97);

	let cursor = 97 + msgBytes.length;

	// Orders table: 256 bytes
	buffer[cursor] = 0; // Order 0 -> Pattern 0
	for (let i = 1; i < 256; i++) {
		buffer[cursor + i] = 255;
	}
	cursor += 256;

	buffer[cursor] = 1; // numPatterns = 1
	buffer[cursor + 1] = 1; // songLength = 1
	buffer[cursor + 2] = 0; // loopPos = 0
	cursor += 3;

	// Pattern size table (1 pattern)
	view.setUint16(cursor, patSize, true);
	cursor += 2;

	// Write a note in Pattern 0, Row 0, Channel 0: Note 49 (A-4), Sample 1, Volume 16
	const patStart = cursor;
	buffer[patStart] = 49; // Note
	buffer[patStart + 1] = 1; // Sample 1
	buffer[patStart + 2] = 16; // Volume
	buffer[patStart + 3] = 0; // Effect

	cursor += patSize;

	// Sample headers (64 samples)
	const sampleHeadersStart = cursor;
	for (let s = 0; s < numSamples; s++) {
		const sOff = sampleHeadersStart + s * 64;
		const sName = new TextEncoder().encode(`Synth Lead ${s + 1}`);
		buffer.set(sName.subarray(0, 31), sOff);

		view.setUint32(sOff + 32, samplePcmLen, true); // Length
		buffer[sOff + 36] = 0; // Finetune
		buffer[sOff + 37] = 64; // Default volume
		view.setUint32(sOff + 38, 0, true); // Loop start
		view.setUint32(sOff + 42, samplePcmLen, true); // Loop end
		buffer[sOff + 46] = 1; // Loop enabled
	}

	cursor = sampleHeadersStart + 64 * 64;

	// Write sample PCM data (numSamples)
	for (let s = 0; s < numSamples; s++) {
		for (let i = 0; i < samplePcmLen; i++) {
			// Generate a simple sine-like wave in 8-bit signed PCM
			const sampleVal = Math.round(
				Math.sin((i / samplePcmLen) * Math.PI * 8) * 120,
			);
			buffer[cursor + i] = sampleVal & 0xff;
		}
		cursor += samplePcmLen;
	}

	return buffer;
}

describe("Farandole Composer (.far) audio synthesis engine", () => {
	it("rejects input smaller than minimum header size", () => {
		const tiny = new Uint8Array([0x46, 0x41, 0x52]);
		expect(() => convertFarToWav(tiny)).toThrow(
			/File size is smaller than the minimum 100-byte Farandole header/,
		);
	});

	it("rejects input without FAR\\xFE magic signature", () => {
		const bad = new Uint8Array(120);
		expect(() => convertFarToWav(bad)).toThrow(
			/Missing 'FAR\\xFE' magic identifier/,
		);
	});

	it("synthesizes valid 16-bit stereo WAV from synthetic FAR module", () => {
		const farBytes = createMockFar({
			title: "Adrenaline Surge",
			message: "Demoscene Tracker Test",
		});

		const result = convertFarToWav(farBytes, {
			sampleRate: 22050,
			maxDurationSeconds: 1,
		});

		expect(result.metadata.title).toBe("Adrenaline Surge");
		expect(result.metadata.channels).toBe(16);
		expect(result.metadata.message).toBe("Demoscene Tracker Test");
		expect(result.metadata.numSamples).toBe(1);
		expect(result.wavBuffer.byteLength).toBeGreaterThan(44);

		// Verify RIFF / WAVE header
		const view = new DataView(result.wavBuffer);
		const riff = new TextDecoder("ascii").decode(
			new Uint8Array(result.wavBuffer, 0, 4),
		);
		const wave = new TextDecoder("ascii").decode(
			new Uint8Array(result.wavBuffer, 8, 4),
		);
		expect(riff).toBe("RIFF");
		expect(wave).toBe("WAVE");
		expect(view.getUint16(22, true)).toBe(2); // 2 channels (stereo)
		expect(view.getUint32(24, true)).toBe(22050); // Sample rate
		expect(view.getUint16(34, true)).toBe(16); // 16-bit
	});

	it("executes through engine interface and respects custom options", async () => {
		const farBytes = createMockFar({ title: "Tracker Engine" });
		const onProgressCalls: string[] = [];

		const output = await farToWavEngine.run(
			farBytes.buffer as ArrayBuffer,
			{
				sampleRate: 44100,
				stereoSeparation: 0.5,
			},
			(_ratio, phase) => {
				onProgressCalls.push(phase);
			},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(44);
		expect(onProgressCalls).toContain("READ_HEADER");
		expect(onProgressCalls).toContain("COMPLETE");
	});

	it("handles modules with loop wrap and zero-length samples gracefully", () => {
		const farBytes = createMockFar({ numSamples: 2 });
		const result = convertFarToWav(farBytes, {
			sampleRate: 11025,
			maxDurationSeconds: 0.5,
		});

		expect(result.metadata.numSamples).toBe(2);
		expect(result.metadata.durationSeconds).toBeGreaterThan(0);
	});
});
