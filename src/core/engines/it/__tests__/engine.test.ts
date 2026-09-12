import { describe, expect, it } from "vitest";
import { itToWavEngine } from "../index";
import { convertItToWav } from "../parser";

function createMockIt(): Uint8Array {
	const totalSize = 1024;
	const buf = new Uint8Array(totalSize);
	const view = new DataView(buf.buffer);

	// "IMPM" magic
	buf[0] = 0x49;
	buf[1] = 0x4d;
	buf[2] = 0x50;
	buf[3] = 0x4d;

	// Song name: "Test Demoscene Chiptune"
	const name = "Test Demoscene Chiptune";
	for (let i = 0; i < name.length; i++) {
		buf[4 + i] = name.charCodeAt(i);
	}

	view.setUint16(0x20, 1, true); // OrdNum = 1
	view.setUint16(0x22, 0, true); // InsNum = 0
	view.setUint16(0x24, 1, true); // SmpNum = 1
	view.setUint16(0x26, 1, true); // PatNum = 1
	view.setUint16(0x28, 0x0214, true); // Cwtv
	view.setUint16(0x2a, 0x0214, true); // Cmwt
	view.setUint16(0x2c, 1, true); // Flags (stereo)

	buf[0x30] = 128; // Global Volume
	buf[0x31] = 48; // Mix Volume
	buf[0x32] = 6; // Initial Speed (ticks per row)
	buf[0x33] = 125; // Initial Tempo (BPM)

	// Channel Pan (64 bytes at 0x40)
	for (let i = 0; i < 64; i++) {
		buf[0x40 + i] = 32; // Center
		buf[0x80 + i] = 64; // Max Volume
	}

	// Order list (1 byte at 0xC0)
	buf[0xc0] = 0; // Pattern 0

	const sampleHeaderOffset = 0xd0;
	const patternOffset = 0x130;
	const sampleDataOffset = 0x200;

	// Sample offset at 0xC1
	view.setUint32(0xc1, sampleHeaderOffset, true);
	// Pattern offset at 0xC5
	view.setUint32(0xc5, patternOffset, true);

	// Sample Header at sampleHeaderOffset (0xD0):
	// "IMPS"
	buf[sampleHeaderOffset] = 0x49;
	buf[sampleHeaderOffset + 1] = 0x4d;
	buf[sampleHeaderOffset + 2] = 0x50;
	buf[sampleHeaderOffset + 3] = 0x53;

	// Filename "synth.raw"
	const fname = "synth.raw";
	for (let i = 0; i < fname.length; i++) {
		buf[sampleHeaderOffset + 4 + i] = fname.charCodeAt(i);
	}

	buf[sampleHeaderOffset + 0x11] = 64; // GvS
	buf[sampleHeaderOffset + 0x12] = 1; // Flags: data present, 8-bit mono
	buf[sampleHeaderOffset + 0x13] = 64; // DefVol
	buf[sampleHeaderOffset + 0x2e] = 1; // Cvt: signed
	buf[sampleHeaderOffset + 0x2f] = 0x20; // Center Pan

	const smpView = new DataView(buf.buffer, sampleHeaderOffset);
	smpView.setUint32(0x30, 64, true); // Length: 64 samples
	smpView.setUint32(0x34, 0, true); // LoopStart
	smpView.setUint32(0x38, 0, true); // LoopEnd
	smpView.setUint32(0x3c, 8363, true); // C5Speed
	smpView.setUint32(0x48, sampleDataOffset, true); // Sample pointer

	// Pattern at patternOffset (0x130):
	const patView = new DataView(buf.buffer, patternOffset);
	patView.setUint16(0x00, 32, true); // Packed Length
	patView.setUint16(0x02, 16, true); // Rows: 16

	let pPtr = patternOffset + 8;
	// Row 0: Note on channel 0
	buf[pPtr++] = 0x81; // Channel 0 + mask follows
	buf[pPtr++] = 1 | 2 | 4; // Mask: Note, Instrument, Volume
	buf[pPtr++] = 60; // Note C-5
	buf[pPtr++] = 1; // Sample 1
	buf[pPtr++] = 64; // Volume 64
	buf[pPtr++] = 0; // End of row 0

	// Rows 1 to 15: empty rows
	for (let r = 1; r < 16; r++) {
		buf[pPtr++] = 0; // End of row
	}

	// Sample PCM Data (64 samples of signed 8-bit sine-like wave at sampleDataOffset)
	for (let i = 0; i < 64; i++) {
		buf[sampleDataOffset + i] = Math.round(
			Math.sin((i / 64) * Math.PI * 2) * 100,
		);
	}

	return buf;
}

describe("Impulse Tracker IT to WAV engine", () => {
	it("synthesizes valid 16-bit linear PCM stereo WAV from mock IT module", () => {
		const mockIt = createMockIt();
		const result = convertItToWav(mockIt, {
			sampleRate: 44100,
			maxDurationSec: 2,
		});

		expect(result.metadata.title).toBe("Test Demoscene Chiptune");
		expect(result.metadata.sampleCount).toBe(1);
		expect(result.metadata.patternCount).toBe(1);
		expect(result.metadata.channelCount).toBe(64);
		expect(result.metadata.durationSec).toBeGreaterThan(0);

		// Verify RIFF WAV structure
		const wav = result.wavBytes;
		expect(wav.length).toBeGreaterThan(44);

		const dec = new TextDecoder();
		expect(dec.decode(wav.subarray(0, 4))).toBe("RIFF");
		expect(dec.decode(wav.subarray(8, 12))).toBe("WAVE");
		expect(dec.decode(wav.subarray(12, 16))).toBe("fmt ");
		expect(dec.decode(wav.subarray(36, 40))).toBe("data");

		const view = new DataView(wav.buffer);
		expect(view.getUint16(20, true)).toBe(1); // Linear PCM
		expect(view.getUint16(22, true)).toBe(2); // Stereo
		expect(view.getUint32(24, true)).toBe(44100); // 44.1 kHz
		expect(view.getUint16(34, true)).toBe(16); // 16-bit
	});

	it("reports progress across conversion phases", () => {
		const phases: string[] = [];
		const mockIt = createMockIt();

		convertItToWav(mockIt, { maxDurationSec: 1 }, (_, phase) => {
			phases.push(phase);
		});

		expect(phases).toContain("READ_HEADER");
		expect(phases).toContain("UNPACK_SAMPLES");
		expect(phases).toContain("UNPACK_PATTERNS");
		expect(phases).toContain("SYNTHESIZING_AUDIO");
		expect(phases).toContain("ENCODE_WAV");
		expect(phases).toContain("COMPLETE");
	});

	it("throws an error for truncated files", () => {
		expect(() => convertItToWav(new Uint8Array(64))).toThrow(
			/File size .* is too small/,
		);
	});

	it("throws an error for missing IMPM magic signature", () => {
		const corrupt = new Uint8Array(200);
		expect(() => convertItToWav(corrupt)).toThrow(
			/Missing 'IMPM' magic signature/,
		);
	});

	it("executes cleanly via itToWavEngine", async () => {
		const mockIt = createMockIt();
		const result = await itToWavEngine.run(
			mockIt.buffer as ArrayBuffer,
			{ sampleRate: 22050, maxDurationSec: 1 },
			() => {},
		);

		expect(result).toBeInstanceOf(ArrayBuffer);
		expect(result.byteLength).toBeGreaterThan(44);
	});
});
