import { describe, expect, it } from "vitest";
import { vagToWavEngine } from "../index";
import { convertVagToWav } from "../parser";

function createSyntheticVag(
	options: {
		sampleRate?: number;
		numBlocks?: number;
		name?: string;
		littleEndian?: boolean;
	} = {},
): Uint8Array {
	const numBlocks = options.numBlocks ?? 4;
	const dataSize = numBlocks * 16;
	const totalSize = 48 + dataSize;
	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	const isLE = options.littleEndian === true;

	if (isLE) {
		// "pGAV"
		bytes[0] = 0x70;
		bytes[1] = 0x47;
		bytes[2] = 0x41;
		bytes[3] = 0x56;
		view.setUint32(4, 3, true); // version 3
		view.setUint32(12, dataSize, true);
		view.setUint32(16, options.sampleRate ?? 22050, true);
	} else {
		// "VAGp"
		bytes[0] = 0x56;
		bytes[1] = 0x41;
		bytes[2] = 0x47;
		bytes[3] = 0x70;
		view.setUint32(4, 3, false); // version 3
		view.setUint32(12, dataSize, false);
		view.setUint32(16, options.sampleRate ?? 44100, false);
	}

	// Name at 32..47
	const name = options.name ?? "TEST_SAMPLE";
	for (let i = 0; i < name.length && i < 15; i++) {
		bytes[32 + i] = name.charCodeAt(i);
	}

	// ADPCM Blocks
	for (let b = 0; b < numBlocks; b++) {
		const blockOffset = 48 + b * 16;
		const shift = b % 4;
		const filter = b % 3;
		bytes[blockOffset] = (filter << 4) | shift;
		bytes[blockOffset + 1] = b === numBlocks - 1 ? 1 : 0; // loop end on last block

		for (let i = 2; i < 16; i++) {
			bytes[blockOffset + i] = ((i * 3) & 0x0f) | (((i * 7) & 0x0f) << 4);
		}
	}

	return bytes;
}

describe("Sony PlayStation VAG Parser & Engine", () => {
	it("decodes a standard big-endian VAGp file into valid 16-bit WAV", () => {
		const vagBytes = createSyntheticVag({ sampleRate: 44100, numBlocks: 4 });
		const result = convertVagToWav(vagBytes);

		expect(result.metadata.sampleRate).toBe(44100);
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.sampleCount).toBe(4 * 28);
		expect(result.metadata.name).toBe("TEST_SAMPLE");

		// Check RIFF WAVE header
		const wav = result.wavBytes;
		const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe("RIFF");
		expect(new TextDecoder().decode(wav.subarray(8, 12))).toBe("WAVE");
		expect(new TextDecoder().decode(wav.subarray(12, 16))).toBe("fmt ");
		expect(view.getUint16(20, true)).toBe(1); // Linear PCM
		expect(view.getUint16(22, true)).toBe(1); // 1 Channel
		expect(view.getUint32(24, true)).toBe(44100);
		expect(view.getUint16(34, true)).toBe(16); // 16-bit
		expect(new TextDecoder().decode(wav.subarray(36, 40))).toBe("data");
		expect(view.getUint32(40, true)).toBe(4 * 28 * 2);
	});

	it("decodes little-endian pGAV variant", () => {
		const vagBytes = createSyntheticVag({
			sampleRate: 22050,
			littleEndian: true,
		});
		const result = convertVagToWav(vagBytes);

		expect(result.metadata.sampleRate).toBe(22050);
		expect(result.metadata.sampleCount).toBe(4 * 28);
		expect(new TextDecoder().decode(result.wavBytes.subarray(0, 4))).toBe(
			"RIFF",
		);
	});

	it("supports audio normalization", () => {
		const vagBytes = createSyntheticVag({ sampleRate: 44100, numBlocks: 4 });
		const unnormalized = convertVagToWav(vagBytes, { normalize: false });
		const normalized = convertVagToWav(vagBytes, { normalize: true });

		expect(unnormalized.wavBytes.length).toBe(normalized.wavBytes.length);
	});

	it("throws on truncated or corrupted files", () => {
		const badBytes = new Uint8Array(20);
		expect(() => convertVagToWav(badBytes)).toThrow(/too small/);

		const fakeHeader = new Uint8Array(50);
		fakeHeader[0] = 0x58; // 'X'
		expect(() => convertVagToWav(fakeHeader)).toThrow(
			/Missing 'VAGp' signature/,
		);
	});

	it("executes cleanly via vagToWavEngine", async () => {
		const vagBytes = createSyntheticVag();
		const outputBuffer = await vagToWavEngine.run(
			vagBytes.buffer as ArrayBuffer,
			{ normalize: "true" },
			() => {},
		);

		const outBytes = new Uint8Array(outputBuffer);
		expect(new TextDecoder().decode(outBytes.subarray(0, 4))).toBe("RIFF");
	});
});
