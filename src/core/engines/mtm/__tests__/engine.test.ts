import { describe, expect, it } from "vitest";
import { convertMtmToWav, mtmToWavEngine } from "../index";

function createMockMtmModule(): Uint8Array {
	const headerLen = 66;
	const smpHeaderLen = 37;
	const orderTableLen = 128;
	const trackLen = 192; // 64 rows * 3 bytes
	const patLen = 64; // 32 channels * 2 bytes
	const smpLen = 16;

	const total =
		headerLen + smpHeaderLen + orderTableLen + trackLen + patLen + smpLen;
	const buf = new Uint8Array(total);
	const view = new DataView(buf.buffer);

	// Signature: MTM\x10
	buf[0] = 0x4d; // 'M'
	buf[1] = 0x54; // 'T'
	buf[2] = 0x4d; // 'M'
	buf[3] = 0x10; // 0x10

	// Title
	const title = new TextEncoder().encode("Renaissance Song");
	buf.set(title, 4);

	view.setUint16(24, 1, true); // numTracks = 1
	buf[26] = 0; // lastPattern = 0
	buf[27] = 0; // lastOrder = 0
	view.setUint16(28, 0, true); // commentLen = 0
	buf[30] = 1; // numSamples = 1
	buf[31] = 0; // attribute
	buf[32] = 4; // beatsPerTrack
	buf[33] = 4; // numChannels = 4

	// Pan positions
	for (let i = 0; i < 32; i++) buf[34 + i] = 7;

	// Sample 1 Header at 66
	const sOffset = 66;
	const sName = new TextEncoder().encode("Lead Synth");
	buf.set(sName, sOffset);
	view.setUint32(sOffset + 22, smpLen, true); // length = 16
	view.setUint32(sOffset + 26, 0, true); // loopStart
	view.setUint32(sOffset + 30, 0, true); // loopEnd
	buf[sOffset + 34] = 0; // finetune
	buf[sOffset + 35] = 64; // volume
	buf[sOffset + 36] = 0; // attribute

	// Order table at 66 + 37 = 103 (128 bytes)
	const ordOffset = sOffset + smpHeaderLen;
	buf[ordOffset] = 0; // order 0 -> pattern 0

	// Track 1 at 103 + 128 = 231 (192 bytes)
	const trackOffset = ordOffset + orderTableLen;
	// Row 0: Note 25 (C-3), Instrument 1
	buf[trackOffset] = (25 << 2) | 0; // note 25
	buf[trackOffset + 1] = 1 << 4; // instrument 1
	buf[trackOffset + 2] = 0;

	// Pattern 0 at 231 + 192 = 423 (64 bytes)
	const patOffset = trackOffset + trackLen;
	view.setUint16(patOffset, 1, true); // channel 0 -> track 1
	// channels 1..31 -> track 0 (already 0)

	// Sample data at 423 + 64 = 487 (16 bytes)
	const smpDataOffset = patOffset + patLen;
	const unsignedPcm = [
		128, 160, 192, 224, 255, 224, 192, 160, 128, 96, 64, 32, 0, 32, 64, 96,
	];
	buf.set(unsignedPcm, smpDataOffset);

	return buf;
}

describe("MTM to WAV Engine", () => {
	it("rejects non-MTM buffer", () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => convertMtmToWav(invalid)).toThrow(/Invalid MTM file/);
	});

	it("parses mock MTM module and synthesizes 16-bit stereo WAV", () => {
		const mock = createMockMtmModule();
		const result = convertMtmToWav(mock, {
			sampleRate: 22050,
			stereoSeparation: 65,
		});

		expect(result.metadata.title).toBe("Renaissance Song");
		expect(result.metadata.numTracks).toBe(1);
		expect(result.metadata.numSamples).toBe(1);
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

	it("runs via engine interface with progress tracking", async () => {
		const mock = createMockMtmModule();
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await mtmToWavEngine.run(
			mock.buffer as ArrayBuffer,
			{ sampleRate: 22050 },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(1000);
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
