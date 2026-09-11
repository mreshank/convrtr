import { describe, expect, it } from "vitest";
import { vocToWavEngine } from "../index";
import { parseVoc } from "../parser";

function createVocFile(
	blocks: Array<{ type: number; payload: Uint8Array }>,
): Uint8Array {
	const header = new Uint8Array(26);
	const sig = "Creative Voice File\x1A";
	for (let i = 0; i < sig.length; i++) {
		header[i] = sig.charCodeAt(i);
	}
	const view = new DataView(header.buffer);
	view.setUint16(20, 26, true); // Header offset
	header[22] = 0x0a; // 1.10
	header[23] = 0x01;
	view.setUint16(24, (~0x010a + 0x1234) & 0xffff, true);

	let totalPayloadLen = 0;
	for (const b of blocks) {
		totalPayloadLen += 4 + b.payload.length;
	}
	totalPayloadLen += 1; // Terminator block

	const result = new Uint8Array(26 + totalPayloadLen);
	result.set(header, 0);

	let offset = 26;
	for (const b of blocks) {
		result[offset] = b.type;
		const len = b.payload.length;
		result[offset + 1] = len & 0xff;
		result[offset + 2] = (len >> 8) & 0xff;
		result[offset + 3] = (len >> 16) & 0xff;
		result.set(b.payload, offset + 4);
		offset += 4 + len;
	}
	result[offset] = 0x00; // Terminator

	return result;
}

describe("Creative Voice (VOC) Audio Parser & Engine", () => {
	it("parses Block 0x01 8-bit unsigned PCM audio blocks", () => {
		// Time constant: 165 -> sr = 1000000 / (256 - 165) = 10989 Hz
		// Packing: 0 (8-bit PCM)
		// Samples: 128 (silence), 255 (+max), 0 (-max)
		const payload = new Uint8Array([165, 0, 128, 255, 0, 128]);
		const vocBytes = createVocFile([{ type: 0x01, payload }]);

		const metadata = parseVoc(vocBytes);
		expect(metadata.version).toBe("1.10");
		expect(metadata.sampleRate).toBe(10989);
		expect(metadata.channels).toBe(1);
		expect(metadata.totalSamples).toBe(4);
		expect(metadata.bitsPerSample).toBe(16);
		expect(metadata.wavBytes.length).toBe(44 + 4 * 2);

		// RIFF header verification
		const wav = metadata.wavBytes;
		expect(
			String.fromCharCode(wav[0] ?? 0, wav[1] ?? 0, wav[2] ?? 0, wav[3] ?? 0),
		).toBe("RIFF");
		expect(
			String.fromCharCode(wav[8] ?? 0, wav[9] ?? 0, wav[10] ?? 0, wav[11] ?? 0),
		).toBe("WAVE");
		expect(
			String.fromCharCode(
				wav[12] ?? 0,
				wav[13] ?? 0,
				wav[14] ?? 0,
				wav[15] ?? 0,
			),
		).toBe("fmt ");
		expect(
			String.fromCharCode(
				wav[36] ?? 0,
				wav[37] ?? 0,
				wav[38] ?? 0,
				wav[39] ?? 0,
			),
		).toBe("data");
	});

	it("parses Block 0x09 16-bit PCM new format audio", () => {
		// Block 9 header:
		// sr: 22050 (4 bytes LE)
		// bitsPerSample: 16 (1 byte)
		// channels: 1 (1 byte)
		// format: 0x0004 (2 bytes LE)
		// reserved: 4 bytes
		// then 2 int16 samples: 0, 1000
		const payload = new Uint8Array(12 + 4);
		const view = new DataView(payload.buffer);
		view.setUint32(0, 22050, true);
		payload[4] = 16;
		payload[5] = 1;
		view.setUint16(6, 0x0004, true);

		view.setInt16(12, 0, true);
		view.setInt16(14, 1000, true);

		const vocBytes = createVocFile([{ type: 0x09, payload }]);
		const metadata = parseVoc(vocBytes);

		expect(metadata.sampleRate).toBe(22050);
		expect(metadata.channels).toBe(1);
		expect(metadata.totalSamples).toBe(2);
		expect(metadata.wavBytes.length).toBe(44 + 4);
	});

	it("throws an error for files smaller than 26 bytes", () => {
		const invalidBytes = new Uint8Array(10);
		expect(() => parseVoc(invalidBytes)).toThrow(
			/File size is smaller than the 26-byte Creative Voice header/,
		);
	});

	it("throws an error for non-VOC signature", () => {
		const invalidBytes = new Uint8Array(30);
		expect(() => parseVoc(invalidBytes)).toThrow(/Invalid VOC signature/);
	});

	it("converts VOC to WAV via vocToWavEngine", async () => {
		const payload = new Uint8Array([165, 0, 128, 128, 128]);
		const vocBytes = createVocFile([{ type: 0x01, payload }]);

		const result = await vocToWavEngine.run(
			vocBytes.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const uint8 = new Uint8Array(result);
		expect(
			String.fromCharCode(
				uint8[0] ?? 0,
				uint8[1] ?? 0,
				uint8[2] ?? 0,
				uint8[3] ?? 0,
			),
		).toBe("RIFF");
	});
});
