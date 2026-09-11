import { describe, expect, it } from "vitest";
import { dsfToWavEngine } from "../index";
import { parseDsfHeader } from "../parser";

function createMockDsf({
	channels = 2,
	samplingFrequency = 2822400, // DSD64
	blockSizePerChannel = 64, // 64 bytes per block = 512 1-bit samples
	numBlocks = 2,
	pattern = 0xaa, // 10101010
}: {
	channels?: number;
	samplingFrequency?: number;
	blockSizePerChannel?: number;
	numBlocks?: number;
	pattern?: number;
}): Uint8Array {
	const dataPayloadSize = numBlocks * channels * blockSizePerChannel;
	const totalSize = 28 + 52 + 12 + dataPayloadSize;

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	// "DSD " chunk (28 bytes)
	u8[0] = 0x44;
	u8[1] = 0x53;
	u8[2] = 0x44;
	u8[3] = 0x20;
	view.setUint32(4, 28, true);
	view.setUint32(12, totalSize, true);
	view.setUint32(20, 0, true); // metadata offset

	// "fmt " chunk (52 bytes)
	u8[28] = 0x66;
	u8[29] = 0x6d;
	u8[30] = 0x74;
	u8[31] = 0x20;
	view.setUint32(32, 52, true);
	view.setUint32(40, 1, true); // formatVersion
	view.setUint32(44, 0, true); // formatId (DSD raw)
	view.setUint32(48, channels === 1 ? 1 : 2, true); // channelType
	view.setUint32(52, channels, true);
	view.setUint32(56, samplingFrequency, true);
	view.setUint32(60, 1, true); // bitsPerSample
	view.setUint32(64, numBlocks * blockSizePerChannel * 8, true); // sampleCount
	view.setUint32(72, blockSizePerChannel, true);
	view.setUint32(76, 0, true); // reserved

	// "data" chunk (12 bytes header + audio)
	const dataChunkOffset = 28 + 52;
	u8[dataChunkOffset] = 0x64;
	u8[dataChunkOffset + 1] = 0x61;
	u8[dataChunkOffset + 2] = 0x74;
	u8[dataChunkOffset + 3] = 0x61;
	view.setUint32(dataChunkOffset + 4, 12 + dataPayloadSize, true);

	// Audio payload
	const payloadOffset = dataChunkOffset + 12;
	for (let i = 0; i < dataPayloadSize; i++) {
		u8[payloadOffset + i] = pattern;
	}

	return u8;
}

describe("dsfToWavEngine", () => {
	it("probes successfully", async () => {
		expect(await dsfToWavEngine.probe()).toBe(true);
	});

	it("parses DSF header fields correctly", () => {
		const mock = createMockDsf({
			channels: 2,
			samplingFrequency: 2822400,
			blockSizePerChannel: 4096,
		});
		const header = parseDsfHeader(mock);
		expect(header.channelCount).toBe(2);
		expect(header.samplingFrequency).toBe(2822400);
		expect(header.blockSizePerChannel).toBe(4096);
		expect(header.bitsPerSample).toBe(1);
	});

	it("decimates DSD64 stereo stream to valid 44.1kHz RIFF WAV", async () => {
		const mock = createMockDsf({
			channels: 2,
			samplingFrequency: 2822400,
			blockSizePerChannel: 64,
			numBlocks: 2,
		});

		const res = await dsfToWavEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const wav = new Uint8Array(res);
		expect(res).toBeInstanceOf(ArrayBuffer);
		expect(wav.length).toBeGreaterThan(44);

		// Verify RIFF WAV structure
		const view = new DataView(res);
		expect(wav[0]).toBe(0x52); // 'R'
		expect(wav[1]).toBe(0x49); // 'I'
		expect(wav[2]).toBe(0x46); // 'F'
		expect(wav[3]).toBe(0x46); // 'F'

		expect(wav[8]).toBe(0x57); // 'W'
		expect(wav[9]).toBe(0x41); // 'A'
		expect(wav[10]).toBe(0x56); // 'V'
		expect(wav[11]).toBe(0x45); // 'E'

		expect(view.getUint16(20, true)).toBe(1); // Linear PCM
		expect(view.getUint16(22, true)).toBe(2); // 2 channels
		expect(view.getUint32(24, true)).toBe(44100); // 44.1 kHz sample rate
		expect(view.getUint16(34, true)).toBe(16); // 16 bits per sample
	});

	it("decimates DSD mono stream correctly", async () => {
		const mock = createMockDsf({
			channels: 1,
			samplingFrequency: 2822400,
			blockSizePerChannel: 64,
			numBlocks: 1,
		});

		const res = await dsfToWavEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const view = new DataView(res);
		expect(view.getUint16(22, true)).toBe(1); // 1 channel
		expect(view.getUint32(24, true)).toBe(44100);
	});

	it("rejects non-DSF data", async () => {
		const invalid = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		await expect(
			dsfToWavEngine.run(invalid.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/Invalid DSF file/);
	});
});
