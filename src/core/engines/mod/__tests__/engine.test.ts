import { describe, expect, it } from "vitest";
import { convertModToWav, parseMod } from "../parser";

function createMockMod(): Uint8Array {
	// 1084-byte header + 1 pattern (64 rows * 4 channels * 4 bytes = 1024 bytes) + 1 sample (64 bytes)
	const totalSize = 1084 + 1024 + 64;
	const buf = new Uint8Array(totalSize);

	// 0..19: Title
	const encoder = new TextEncoder();
	buf.set(encoder.encode("SPACE DEBRIS"), 0);

	// Instrument 1 at byte 20..49
	// Name (22 bytes)
	buf.set(encoder.encode("LEAD SYNTH"), 20);
	// Length in words (2 bytes BE) -> 32 words = 64 bytes
	buf[42] = 0;
	buf[43] = 32;
	// Finetune: 0
	buf[44] = 0;
	// Volume: 64
	buf[45] = 64;
	// Repeat offset: 0
	buf[46] = 0;
	buf[47] = 0;
	// Repeat length: 32 words = 64 bytes (loops)
	buf[48] = 0;
	buf[49] = 32;

	// 950: Song length = 1
	buf[950] = 1;
	// 951: Restart pos = 0
	buf[951] = 0;
	// 952: Pattern table [0, 0, ...]
	buf[952] = 0;

	// 1080..1083: Format tag "M.K."
	buf.set(encoder.encode("M.K."), 1080);

	// Pattern 0 data starts at 1084
	// Row 0, Channel 0: Play instrument 1, Period 428 (C-2), Effect C (Set Volume) 64
	// Byte 0: sampleHigh (0x10) | periodHigh (0x01) = 0x11
	buf[1084] = 0x11;
	// Byte 1: periodLow = 0xAC (428 = 0x01AC)
	buf[1085] = 0xac;
	// Byte 2: sampleLow (0x00) | effect (0x0C) = 0x0C
	buf[1086] = 0x0c;
	// Byte 3: effectParam = 64 (0x40)
	buf[1087] = 0x40;

	// Row 1, Channel 1: Play instrument 1, Period 320 (E-2), Effect F (Set Speed) 3
	const row1Offset = 1084 + 16; // Row 1 is 16 bytes later
	// Channel 1 is 4 bytes inside row 1
	buf[row1Offset + 4] = 0x11;
	buf[row1Offset + 5] = 0x40; // Period 320 = 0x0140
	buf[row1Offset + 6] = 0x0f; // Effect F
	buf[row1Offset + 7] = 0x03; // Speed = 3 ticks

	// Sample 1 PCM data starts at 1084 + 1024 = 2108
	const sampleOffset = 1084 + 1024;
	for (let i = 0; i < 64; i++) {
		// Generate simple square wave
		buf[sampleOffset + i] = i < 32 ? 60 : -60 & 0xff;
	}

	return buf;
}

describe("Amiga ProTracker MOD Engine", () => {
	it("parses module header, instruments, and pattern data", () => {
		const mod = createMockMod();
		const { header, patterns } = parseMod(mod);

		expect(header.title).toBe("SPACE DEBRIS");
		expect(header.formatTag).toBe("M.K.");
		expect(header.channels).toBe(4);
		expect(header.songLength).toBe(1);
		expect(header.samples[0]?.name).toBe("LEAD SYNTH");
		expect(header.samples[0]?.length).toBe(64);
		expect(header.samples[0]?.volume).toBe(64);
		expect(patterns.length).toBe(1);
		expect(patterns[0]?.rows.length).toBe(64);

		// Check row 0 note
		const row0Ch0 = patterns[0]?.rows[0]?.[0];
		expect(row0Ch0?.sampleNumber).toBe(1);
		expect(row0Ch0?.period).toBe(428);
		expect(row0Ch0?.effect).toBe(0x0c);
		expect(row0Ch0?.param).toBe(64);
	});

	it("renders 4-channel MOD module to 16-bit stereo RIFF WAV", () => {
		const mod = createMockMod();
		const result = convertModToWav(mod, { sampleRate: 22050 });

		expect(result.title).toBe("SPACE DEBRIS");
		expect(result.channels).toBe(4);
		expect(result.sampleRate).toBe(22050);
		expect(result.durationSeconds).toBeGreaterThan(0);
		expect(result.wavBuffer.length).toBeGreaterThan(44);

		// Check WAV header magic
		const magicRiff = new TextDecoder().decode(result.wavBuffer.subarray(0, 4));
		const magicWave = new TextDecoder().decode(
			result.wavBuffer.subarray(8, 12),
		);
		expect(magicRiff).toBe("RIFF");
		expect(magicWave).toBe("WAVE");

		// Check audio samples are synthesized and not dead silence
		let nonZero = 0;
		for (let i = 44; i < result.wavBuffer.length; i++) {
			if (result.wavBuffer[i] !== 0) nonZero++;
		}
		expect(nonZero).toBeGreaterThan(500);
	});

	it("prevents infinite playback loops and respects maxDurationSeconds", () => {
		const mod = createMockMod();
		// Test safety timeout
		const result = convertModToWav(mod, {
			sampleRate: 11025,
			maxDurationSeconds: 1,
		});
		expect(result.durationSeconds).toBeLessThanOrEqual(1.1);
	});

	it("throws on truncated or invalid MOD file", () => {
		const tiny = new Uint8Array(100);
		expect(() => parseMod(tiny)).toThrow(/Invalid MOD file/);
	});
});
