import { describe, expect, it } from "vitest";
import { convertS3mToWav } from "../parser";

function createMockS3m(): Uint8Array {
	// Build a valid synthetic S3M file
	const buffer = new ArrayBuffer(1024);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// 1. Song title at offset 0
	new TextEncoder().encodeInto("Test Track", bytes.subarray(0, 28));

	// 2. EOF marker
	bytes[0x1c] = 0x1a;
	bytes[0x1d] = 16; // S3M type

	// 3. Counts at 0x20
	view.setUint16(0x20, 2, true); // ordNum = 2
	view.setUint16(0x22, 1, true); // insNum = 1
	view.setUint16(0x24, 1, true); // patNum = 1
	view.setUint16(0x28, 0x1300, true); // cwtv = 0x1300
	view.setUint16(0x2a, 1, true); // ffi = 1 (unsigned samples)

	// 4. SCRM magic at 0x2C
	bytes[0x2c] = 0x53; // 'S'
	bytes[0x2d] = 0x43; // 'C'
	bytes[0x2e] = 0x52; // 'R'
	bytes[0x2f] = 0x4d; // 'M'

	// 5. Speed and Tempo
	bytes[0x31] = 6; // Speed 6 ticks/row
	bytes[0x32] = 125; // Tempo 125 BPM
	bytes[0x33] = 0x80 | 64; // Master vol & stereo

	// 6. Channel panning (0-31)
	for (let c = 0; c < 32; c++) {
		bytes[0x40 + c] = c;
	}

	// 7. Order list at 0x60 (2 bytes)
	bytes[0x60] = 0; // Pattern 0
	bytes[0x61] = 255; // End of song marker

	// 8. Parapointers offset: 0x60 + 2 = 0x62
	const insParaOffset = 0x62;
	const insPara = 10; // offset = 160
	view.setUint16(insParaOffset, insPara, true);

	const patParaOffset = insParaOffset + 2;
	const patPara = 20; // offset = 320
	view.setUint16(patParaOffset, patPara, true);

	// 9. Instrument header at 160
	const insOffset = insPara * 16;
	bytes[insOffset] = 1; // Type 1 (sample)
	const sampleDataPara = 40; // offset = 640
	bytes[insOffset + 0x0d] = sampleDataPara & 0xff;
	bytes[insOffset + 0x0e] = (sampleDataPara >> 8) & 0xff;
	bytes[insOffset + 0x0f] = 0;
	view.setUint32(insOffset + 0x10, 64, true); // length = 64
	view.setUint32(insOffset + 0x14, 0, true); // loopStart
	view.setUint32(insOffset + 0x18, 64, true); // loopEnd
	bytes[insOffset + 0x1c] = 64; // volume = 64
	bytes[insOffset + 0x1f] = 0x01; // looped
	view.setUint32(insOffset + 0x20, 8363, true); // c4spd
	new TextEncoder().encodeInto(
		"Test Pulse",
		bytes.subarray(insOffset + 0x30, insOffset + 0x30 + 10),
	);
	// SCRS magic at insOffset + 0x4C
	bytes[insOffset + 0x4c] = 0x53;
	bytes[insOffset + 0x4d] = 0x43;
	bytes[insOffset + 0x4e] = 0x52;
	bytes[insOffset + 0x4f] = 0x53;

	// 10. Sample PCM data at 640 (square wave, unsigned 8-bit)
	const sampleOffset = sampleDataPara * 16;
	for (let s = 0; s < 64; s++) {
		bytes[sampleOffset + s] = s < 32 ? 200 : 50;
	}

	// 11. Pattern data at 320
	const patOffset = patPara * 16;
	let pPos = patOffset;
	view.setUint16(pPos, 30, true); // packed length
	pPos += 2;

	// Row 0: Note on channel 0: C-4 (note 0x40 = octave 4, note 0 = C-4)
	bytes[pPos++] = 0 | 32; // Channel 0, Note + Instrument follow
	bytes[pPos++] = 0x40; // C-4
	bytes[pPos++] = 1; // Instrument 1
	bytes[pPos++] = 0; // End of row 0

	// Remaining 63 empty rows
	for (let r = 1; r < 64; r++) {
		bytes[pPos++] = 0;
	}

	return bytes.subarray(0, Math.max(pPos, sampleOffset + 64));
}

describe("S3M to WAV engine", () => {
	it("synthesizes valid S3M tracker module into 16-bit stereo WAV audio", () => {
		const mockS3m = createMockS3m();
		const result = convertS3mToWav(mockS3m, { maxDurationSec: 5 });

		expect(result.metadata.title).toBe("Test Track");
		expect(result.metadata.channelCount).toBe(32);
		expect(result.metadata.orderCount).toBe(1);
		expect(result.metadata.patternCount).toBe(1);
		expect(result.metadata.instrumentCount).toBe(1);
		expect(result.metadata.durationSec).toBeGreaterThan(0);

		// Verify RIFF WAV container
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

	it("reports progress across synthesis phases", () => {
		const phases: string[] = [];
		const mockS3m = createMockS3m();

		convertS3mToWav(mockS3m, { maxDurationSec: 1 }, (_, phase) => {
			phases.push(phase);
		});

		expect(phases).toContain("READ_HEADER");
		expect(phases).toContain("LOAD_INSTRUMENTS");
		expect(phases).toContain("UNPACK_PATTERNS");
		expect(phases).toContain("SYNTHESIZE_AUDIO");
		expect(phases).toContain("BUILD_WAV");
		expect(phases).toContain("COMPLETE");
	});

	it("throws an error for missing SCRM signature", () => {
		const corrupted = new Uint8Array(200);
		expect(() => convertS3mToWav(corrupted)).toThrow(
			/Missing 'SCRM' magic signature/,
		);
	});

	it("throws an error for truncated file", () => {
		expect(() => convertS3mToWav(new Uint8Array(32))).toThrow(
			/too small to contain an S3M header/,
		);
	});
});
