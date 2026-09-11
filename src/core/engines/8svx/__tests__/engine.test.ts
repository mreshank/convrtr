import { describe, expect, it } from "vitest";
import { convert8svxToWav, eightSvxToWavEngine } from "../index";

function buildMock8Svx(compression = 0): Uint8Array {
	const vhdrSize = 20;
	const nameStr = "LaserZap";
	const nameSize = nameStr.length + (nameStr.length % 2); // 2-byte aligned

	let bodyData: Uint8Array;
	if (compression === 1) {
		// Fibonacci delta: initial sample (2 bytes) + 4 delta bytes (8 samples)
		bodyData = new Uint8Array([0, 10, 0x12, 0x34, 0xef, 0x00]);
	} else {
		// Linear 8-bit PCM (sine-like samples)
		bodyData = new Uint8Array([0, 64, 127, 64, 0, 192, 128, 192]);
	}

	const bodySize = bodyData.length + (bodyData.length % 2);

	const formSize =
		4 + // '8SVX'
		(8 + vhdrSize) +
		(8 + nameSize) +
		(8 + bodySize);

	const buffer = new Uint8Array(8 + formSize);
	const view = new DataView(buffer.buffer);

	// 'FORM'
	buffer[0] = 0x46;
	buffer[1] = 0x4f;
	buffer[2] = 0x52;
	buffer[3] = 0x4d;
	view.setUint32(4, formSize, false);

	// '8SVX'
	buffer[8] = 0x38;
	buffer[9] = 0x53;
	buffer[10] = 0x56;
	buffer[11] = 0x58;

	let offset = 12;

	// 'VHDR' chunk
	buffer[offset] = 0x56;
	buffer[offset + 1] = 0x48;
	buffer[offset + 2] = 0x44;
	buffer[offset + 3] = 0x52;
	view.setUint32(offset + 4, vhdrSize, false);
	view.setUint32(offset + 8, bodyData.length, false); // oneShotHiSamples
	view.setUint32(offset + 12, 0, false); // repeatHiSamples
	view.setUint32(offset + 16, 0, false); // samplesPerHiCycle
	view.setUint16(offset + 20, 16000, false); // samplesPerSec (16 kHz)
	buffer[offset + 22] = 1; // octaves
	buffer[offset + 23] = compression; // compression
	view.setInt32(offset + 24, 65536, false); // volume (1.0)
	offset += 8 + vhdrSize;

	// 'NAME' chunk
	buffer[offset] = 0x4e;
	buffer[offset + 1] = 0x41;
	buffer[offset + 2] = 0x4d;
	buffer[offset + 3] = 0x45;
	view.setUint32(offset + 4, nameSize, false);
	for (let i = 0; i < nameStr.length; i++) {
		buffer[offset + 8 + i] = nameStr.charCodeAt(i);
	}
	offset += 8 + nameSize;

	// 'BODY' chunk
	buffer[offset] = 0x42;
	buffer[offset + 1] = 0x4f;
	buffer[offset + 2] = 0x44;
	buffer[offset + 3] = 0x59;
	view.setUint32(offset + 4, bodySize, false);
	buffer.set(bodyData, offset + 8);

	return buffer;
}

describe("Commodore Amiga IFF 8SVX to WAV Engine", () => {
	it("probes successfully", async () => {
		expect(await eightSvxToWavEngine.probe()).toBe(true);
	});

	it("converts uncompressed 8-bit Amiga PCM to standard 16-bit WAV", () => {
		const bytes = buildMock8Svx(0);
		const result = convert8svxToWav(bytes);

		expect(result.metadata.name).toBe("LaserZap");
		expect(result.metadata.sampleRate).toBe(16000);
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.header.compression).toBe(0);

		// Validate RIFF header
		const wav = result.wavBytes;
		expect(wav[0]).toBe(0x52); // R
		expect(wav[1]).toBe(0x49); // I
		expect(wav[2]).toBe(0x46); // F
		expect(wav[3]).toBe(0x46); // F
		expect(wav[8]).toBe(0x57); // W
		expect(wav[9]).toBe(0x41); // A
		expect(wav[10]).toBe(0x56); // V
		expect(wav[11]).toBe(0x45); // E

		// 8 samples converted to 16-bit PCM = 16 data bytes + 44 header = 60 total
		expect(wav.length).toBe(60);
	});

	it("decodes Fibonacci-delta compressed Amiga audio", () => {
		const bytes = buildMock8Svx(1);
		const result = convert8svxToWav(bytes);

		expect(result.metadata.header.compression).toBe(1);
		expect(result.metadata.sampleCount).toBe(8);
		expect(result.wavBytes.length).toBe(44 + 8 * 2);
	});

	it("runs end-to-end via eightSvxToWavEngine interface", async () => {
		const bytes = buildMock8Svx(0);
		const output = await eightSvxToWavEngine.run(
			bytes.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const wav = new Uint8Array(output);

		expect(wav[0]).toBe(0x52); // 'RIFF'
		expect(wav[8]).toBe(0x57); // 'WAVE'
	});

	it("throws on invalid FORM container", () => {
		const corrupted = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		expect(() => convert8svxToWav(corrupted)).toThrow(
			/Missing 'FORM' container magic/,
		);
	});
});
