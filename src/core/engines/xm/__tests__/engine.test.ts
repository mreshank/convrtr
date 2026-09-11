import { describe, expect, it } from "vitest";
import { convertXmToWav, xmToWavEngine } from "../index";

function createMockXmFile(): Uint8Array {
	const buffer: number[] = [];

	// 17 bytes: "Extended Module: "
	const id = "Extended Module: ";
	for (let i = 0; i < 17; i++) buffer.push(id.charCodeAt(i));

	// 20 bytes: Title
	const title = "Space Chiptune      ";
	for (let i = 0; i < 20; i++) buffer.push(title.charCodeAt(i));

	// 1 byte: 0x1A
	buffer.push(0x1a);

	// 20 bytes: Tracker Name
	const tracker = "FastTracker v2.00   ";
	for (let i = 0; i < 20; i++) buffer.push(tracker.charCodeAt(i));

	// 2 bytes: Version 0x0104
	buffer.push(0x04, 0x01);

	// 4 bytes: Header size = 276
	buffer.push(0x14, 0x01, 0x00, 0x00);

	// 2 bytes: Song length = 1
	buffer.push(0x01, 0x00);
	// 2 bytes: Restart pos = 0
	buffer.push(0x00, 0x00);
	// 2 bytes: Channels = 2
	buffer.push(0x02, 0x00);
	// 2 bytes: Patterns count = 1
	buffer.push(0x01, 0x00);
	// 2 bytes: Instruments count = 1
	buffer.push(0x01, 0x00);
	// 2 bytes: Flags = 1 (linear)
	buffer.push(0x01, 0x00);
	// 2 bytes: Default tempo = 6
	buffer.push(0x06, 0x00);
	// 2 bytes: Default BPM = 125
	buffer.push(0x7d, 0x00);

	// 256 bytes: Pattern order table
	for (let i = 0; i < 256; i++) {
		buffer.push(i === 0 ? 0 : 0);
	}

	// Pattern 0
	// 4 bytes: Pattern header length = 9
	buffer.push(0x09, 0x00, 0x00, 0x00);
	// 1 byte: Packing type = 0
	buffer.push(0x00);
	// 2 bytes: Number of rows = 2
	buffer.push(0x02, 0x00);

	// Packed pattern data: 2 rows x 2 channels = 4 cells
	// Cell 0: note 49 (C-4), instrument 1
	// 0x83 = note present (0x01) + instrument present (0x02)
	const patternBytes = [
		0x83, 49, 1, // Channel 0, Row 0: Note 49, Inst 1
		0x80, // Channel 1, Row 0: Empty
		0x80, // Channel 0, Row 1: Empty
		0x80, // Channel 1, Row 1: Empty
	];

	// 2 bytes: Packed data size
	const patLen = patternBytes.length;
	buffer.push(patLen & 0xff, (patLen >> 8) & 0xff);
	for (const pb of patternBytes) buffer.push(pb);

	// Instrument 1
	// 4 bytes: Header size = 29 + 214 = 243 (or standard 263)
	// We'll write instHeaderSize = 263
	const instHeaderSize = 263;
	buffer.push(instHeaderSize & 0xff, (instHeaderSize >> 8) & 0xff, 0x00, 0x00);

	// 22 bytes: Instrument name
	const instName = "Lead Synth            ";
	for (let i = 0; i < 22; i++) buffer.push(instName.charCodeAt(i));

	// 1 byte: Type = 0
	buffer.push(0x00);
	// 2 bytes: Number of samples = 1
	buffer.push(0x01, 0x00);

	// 4 bytes: Sample header size = 40
	buffer.push(40, 0, 0, 0);

	// 96 bytes: Sample keymap (all mapped to sample 0)
	for (let i = 0; i < 96; i++) buffer.push(0);

	// 48 bytes volume envelope + 48 bytes panning envelope + envelope info (total 263 - 29 - 4 - 96 = 134 bytes)
	for (let i = 0; i < 134; i++) buffer.push(0);

	// Sample 0 Header (40 bytes)
	const sampleLength = 32;
	// 4 bytes: length
	buffer.push(sampleLength & 0xff, (sampleLength >> 8) & 0xff, 0x00, 0x00);
	// 4 bytes: loop start
	buffer.push(0x00, 0x00, 0x00, 0x00);
	// 4 bytes: loop length
	buffer.push(0x00, 0x00, 0x00, 0x00);
	// 1 byte: volume = 64
	buffer.push(64);
	// 1 byte: finetune = 0
	buffer.push(0);
	// 1 byte: type = 0 (8-bit no loop)
	buffer.push(0);
	// 1 byte: panning = 128
	buffer.push(128);
	// 1 byte: relative note = 0
	buffer.push(0);
	// 1 byte: reserved
	buffer.push(0);
	// 22 bytes: Sample name
	for (let i = 0; i < 22; i++) buffer.push(0);

	// Sample 0 Data (32 bytes delta PCM)
	// Simple square wave deltas
	let val = 0;
	for (let i = 0; i < sampleLength; i++) {
		const target = i < 16 ? 60 : -60;
		const delta = target - val;
		val = target;
		buffer.push((delta + 256) & 0xff);
	}

	return new Uint8Array(buffer);
}

describe("FastTracker II XM to WAV Engine", () => {
	it("synthesizes valid 16-bit stereo linear PCM WAV from XM module", () => {
		const xmBytes = createMockXmFile();
		const result = convertXmToWav(xmBytes, { maxDurationSeconds: 2 });

		expect(result.metadata.title).toBe("Space Chiptune");
		expect(result.metadata.trackerName).toBe("FastTracker v2.00");
		expect(result.metadata.channels).toBe(2);
		expect(result.metadata.patternsCount).toBe(1);
		expect(result.metadata.instrumentsCount).toBe(1);

		// WAV Header
		const wav = result.wavBuffer;
		expect(wav[0]).toBe(0x52); // R
		expect(wav[1]).toBe(0x49); // I
		expect(wav[2]).toBe(0x46); // F
		expect(wav[3]).toBe(0x46); // F
		expect(wav[8]).toBe(0x57); // W
		expect(wav[9]).toBe(0x41); // A
		expect(wav[10]).toBe(0x56); // V
		expect(wav[11]).toBe(0x45); // E

		// Check linear PCM format
		const wavView = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		expect(wavView.getUint16(20, true)).toBe(1); // PCM
		expect(wavView.getUint16(22, true)).toBe(2); // Stereo
		expect(wavView.getUint32(24, true)).toBe(44100); // 44.1 kHz
	});

	it("throws error for file too small to be an XM module", () => {
		const tooShort = new Uint8Array(100);
		expect(() => convertXmToWav(tooShort)).toThrow(
			"Invalid XM file: File size (100 bytes) is too small",
		);
	});

	it("throws error for file missing Extended Module signature", () => {
		const invalidSig = new Uint8Array(400);
		expect(() => convertXmToWav(invalidSig)).toThrow(
			"Invalid XM file: Missing 'Extended Module: ' signature",
		);
	});

	it("runs through engine execution runner with progress updates", async () => {
		const xmBytes = createMockXmFile();
		const phases: string[] = [];

		const outputBuffer = await xmToWavEngine.run(
			xmBytes.buffer as ArrayBuffer,
			{ sampleRate: "44100" },
			(_ratio, phase) => {
				phases.push(phase);
			},
		);

		const wavBytes = new Uint8Array(outputBuffer);
		expect(wavBytes[0]).toBe(0x52); // 'R'
		expect(wavBytes[1]).toBe(0x49); // 'I'
		expect(phases).toContain("PARSE_PATTERNS");
		expect(phases).toContain("SYNTHESIZING_AUDIO");
		expect(phases).toContain("BUILD_WAV");
	});
});
