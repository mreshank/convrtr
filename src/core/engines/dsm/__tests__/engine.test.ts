import { describe, expect, it } from "vitest";
import { convertDsmToWav, dsmToWavEngine } from "../index";

function createMockDsmFile(title = "CYBER.DSM"): Uint8Array {
	// Chunk 1: SONG (80 bytes payload)
	const songPayload = new Uint8Array(80);
	const songView = new DataView(songPayload.buffer);
	// Title at 0..31
	for (let i = 0; i < title.length; i++) songPayload[i] = title.charCodeAt(i);
	songView.setUint16(32, 1, true); // Version
	songView.setUint16(40, 1, true); // numOrders = 1
	songView.setUint16(42, 1, true); // numSamples = 1
	songView.setUint16(44, 1, true); // numPatterns = 1
	songView.setUint16(46, 4, true); // numChannels = 4
	songPayload[48] = 64; // global volume
	songPayload[49] = 6; // master speed
	songPayload[50] = 125; // master bpm
	songPayload[68] = 0; // order 0 -> pattern 0

	// Chunk 2: INST (56 header + 256 pcm bytes)
	const pcmLength = 256;
	const instPayload = new Uint8Array(56 + pcmLength);
	const instView = new DataView(instPayload.buffer);
	const sampleName = "SquareWave";
	for (let i = 0; i < sampleName.length; i++)
		instPayload[i] = sampleName.charCodeAt(i);
	instView.setUint16(34, 0, true); // Flags (unsigned 8-bit)
	instPayload[36] = 64; // Volume
	instView.setUint32(38, pcmLength, true); // Length
	instView.setUint32(42, 0, true); // Loop start
	instView.setUint32(46, 0, true); // Loop end
	instView.setUint32(50, 8363, true); // C2SPD
	for (let i = 0; i < pcmLength; i++) {
		// Generate simple square wave
		instPayload[56 + i] = i < 128 ? 200 : 50;
	}

	// Chunk 3: PATT (4 bytes header + simple rows)
	const pattPayload = new Uint8Array(32);
	const pattView = new DataView(pattPayload.buffer);
	pattView.setUint16(0, 0, true); // Pattern index 0
	pattView.setUint16(2, 4, true); // 4 rows
	// Row 0, channel 0: Note 49 (Middle C), inst 1
	pattPayload[4] = 0x80 | 0x40 | 0x00; // note & inst present on ch 0
	pattPayload[5] = 49; // Note C-4
	pattPayload[6] = 1; // Inst 1
	pattPayload[7] = 0; // End of row 0
	pattPayload[8] = 0; // End of row 1
	pattPayload[9] = 0; // End of row 2
	pattPayload[10] = 0; // End of row 3

	// Total RIFF structure
	const totalSize =
		12 +
		(8 + songPayload.length) +
		(8 + instPayload.length) +
		(8 + pattPayload.length);
	const file = new Uint8Array(totalSize);
	const fileView = new DataView(file.buffer);

	file[0] = 0x52;
	file[1] = 0x49;
	file[2] = 0x46;
	file[3] = 0x46; // "RIFF"
	fileView.setUint32(4, totalSize - 8, true);
	file[8] = 0x44;
	file[9] = 0x53;
	file[10] = 0x4d;
	file[11] = 0x46; // "DSMF"

	let ptr = 12;
	// Write SONG chunk
	file[ptr] = 0x53;
	file[ptr + 1] = 0x4f;
	file[ptr + 2] = 0x4e;
	file[ptr + 3] = 0x47; // "SONG"
	fileView.setUint32(ptr + 4, songPayload.length, true);
	file.set(songPayload, ptr + 8);
	ptr += 8 + songPayload.length;

	// Write INST chunk
	file[ptr] = 0x49;
	file[ptr + 1] = 0x4e;
	file[ptr + 2] = 0x53;
	file[ptr + 3] = 0x54; // "INST"
	fileView.setUint32(ptr + 4, instPayload.length, true);
	file.set(instPayload, ptr + 8);
	ptr += 8 + instPayload.length;

	// Write PATT chunk
	file[ptr] = 0x50;
	file[ptr + 1] = 0x41;
	file[ptr + 2] = 0x54;
	file[ptr + 3] = 0x54; // "PATT"
	fileView.setUint32(ptr + 4, pattPayload.length, true);
	file.set(pattPayload, ptr + 8);
	ptr += 8 + pattPayload.length;

	return file;
}

describe("dsmToWavEngine", () => {
	it("probes successfully", async () => {
		expect(await dsmToWavEngine.probe()).toBe(true);
	});

	it("throws on invalid file size or missing RIFF header", () => {
		const tooSmall = new Uint8Array(10);
		expect(() => convertDsmToWav(tooSmall)).toThrow(/Invalid DSM file/);

		const invalidMagic = new Uint8Array(64);
		expect(() => convertDsmToWav(invalidMagic)).toThrow(
			/Missing 'RIFF' and 'DSMF'/,
		);
	});

	it("converts mock DSM module to valid 16-bit stereo WAV", () => {
		const mockFile = createMockDsmFile("RETRO_GROOVE");
		const result = convertDsmToWav(mockFile, { maxDurationSeconds: 5 });

		expect(result.metadata.title).toBe("RETRO_GROOVE");
		expect(result.metadata.numChannels).toBe(4);
		expect(result.metadata.numSamples).toBe(1);
		expect(result.metadata.durationSeconds).toBeGreaterThan(0.4);
		expect(result.wavBuffer.byteLength).toBeGreaterThan(1000);

		// Check RIFF WAV header
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

	it("runs via engine interface with custom params and progress", async () => {
		const mockFile = createMockDsmFile("CHIP_BEAT");
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await dsmToWavEngine.run(
			mockFile.buffer as ArrayBuffer,
			{ sampleRate: 44100, stereoSeparation: 80 },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(1000);
		expect(progress.length).toBeGreaterThanOrEqual(3);
		expect(progress[progress.length - 1]?.phase).toBe("COMPLETE");
	});
});
