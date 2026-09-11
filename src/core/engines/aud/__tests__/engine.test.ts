import { describe, expect, it } from "vitest";
import { audToWavEngine, convertAudToWav } from "../index";

function createMockAudFile(options: {
	sampleRate?: number;
	flags?: number;
	compressionType?: number;
	chunked?: boolean;
	payload?: Uint8Array;
}): Uint8Array {
	const sampleRate = options.sampleRate ?? 22050;
	const flags = options.flags ?? 2; // 16-bit mono
	const compressionType = options.compressionType ?? 1; // WS-ADPCM
	const payload = options.payload ?? new Uint8Array([0x12, 0x34, 0x56, 0x78]);

	const header = new Uint8Array(12);
	const view = new DataView(header.buffer);
	view.setUint16(0, sampleRate, true);
	view.setUint32(2, payload.length, true);
	view.setUint32(6, payload.length * 4, true);
	view.setUint8(10, flags);
	view.setUint8(11, compressionType);

	if (options.chunked) {
		const chunkHeader = new Uint8Array(4);
		const chunkView = new DataView(chunkHeader.buffer);
		chunkView.setUint16(0, payload.length, true);
		chunkView.setUint16(2, payload.length * 4, true);

		const full = new Uint8Array(12 + 4 + payload.length);
		full.set(header, 0);
		full.set(chunkHeader, 12);
		full.set(payload, 16);
		return full;
	}

	const full = new Uint8Array(12 + payload.length);
	full.set(header, 0);
	full.set(payload, 12);
	return full;
}

describe("Westwood AUD to WAV Engine", () => {
	it("decodes 16-bit IMA/WS-ADPCM chunked AUD file into linear PCM WAV", () => {
		const audData = createMockAudFile({
			sampleRate: 22050,
			flags: 2, // 16-bit mono
			compressionType: 1,
			chunked: true,
			payload: new Uint8Array([0x11, 0x22, 0x33, 0x44]),
		});

		const result = convertAudToWav(audData);

		expect(result.metadata.sampleRate).toBe(22050);
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.compressionType).toBe(1);
		expect(result.metadata.compressionName).toBe("Westwood WS-ADPCM");

		// WAV RIFF header verification
		const wav = result.wavBytes;
		expect(wav[0]).toBe(0x52); // R
		expect(wav[1]).toBe(0x49); // I
		expect(wav[2]).toBe(0x46); // F
		expect(wav[3]).toBe(0x46); // F
		expect(wav[8]).toBe(0x57); // W
		expect(wav[9]).toBe(0x41); // A
		expect(wav[10]).toBe(0x56); // V
		expect(wav[11]).toBe(0x45); // E

		// Check audio format = 1 (linear PCM)
		const wavView = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		expect(wavView.getUint16(20, true)).toBe(1);
		expect(wavView.getUint16(22, true)).toBe(1); // mono
		expect(wavView.getUint32(24, true)).toBe(22050);
	});

	it("decodes 8-bit WS-ADPCM AUD file", () => {
		const audData = createMockAudFile({
			sampleRate: 11025,
			flags: 0, // 8-bit mono
			compressionType: 1,
			chunked: false,
			payload: new Uint8Array([0x01, 0x23, 0x45, 0x67]),
		});

		const result = convertAudToWav(audData);
		expect(result.metadata.sampleRate).toBe(11025);
		expect(result.metadata.bitsPerSample).toBe(8);
		expect(result.metadata.sampleCount).toBe(8); // 4 bytes * 2 nibbles
	});

	it("decodes uncompressed PCM AUD file", () => {
		const pcmBytes = new Uint8Array([0x00, 0x10, 0x00, 0x20]);
		const audData = createMockAudFile({
			sampleRate: 44100,
			flags: 2, // 16-bit
			compressionType: 0, // uncompressed
			chunked: false,
			payload: pcmBytes,
		});

		const result = convertAudToWav(audData);
		expect(result.metadata.compressionName).toBe("Uncompressed PCM");
		expect(result.metadata.sampleCount).toBe(2); // 4 bytes / 2
	});

	it("applies sampleRateOverride option", () => {
		const audData = createMockAudFile({
			sampleRate: 22050,
			payload: new Uint8Array([0x10, 0x20]),
		});

		const result = convertAudToWav(audData, { sampleRateOverride: 44100 });
		expect(result.metadata.sampleRate).toBe(44100);
	});

	it("throws error if AUD file is smaller than 12 bytes", () => {
		const shortData = new Uint8Array([1, 2, 3]);
		expect(() => convertAudToWav(shortData)).toThrow(
			"Invalid AUD file: File size (3 bytes) is too small",
		);
	});

	it("runs through engine runner with progress updates", async () => {
		const audData = createMockAudFile({
			sampleRate: 22050,
			payload: new Uint8Array([0x11, 0x22, 0x33, 0x44]),
		});

		const phases: string[] = [];
		const wavBuffer = await audToWavEngine.run(
			audData.buffer as ArrayBuffer,
			{ sampleRate: "22050" },
			(_ratio, phase) => {
				phases.push(phase);
			},
		);

		const wavBytes = new Uint8Array(wavBuffer);
		expect(wavBytes[0]).toBe(0x52); // 'R'
		expect(wavBytes[1]).toBe(0x49); // 'I'
		expect(phases).toContain("DECODE_BLOCKS");
		expect(phases).toContain("BUILD_WAV");
	});
});
