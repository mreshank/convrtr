import { describe, expect, it } from "vitest";
import { bpgToPngEngine, convertBpgToPng } from "../index";

function createMockBpgImage(
	width = 16,
	height = 16,
	colorSpace = 1, // RGB
): Uint8Array {
	const header = [
		0x79,
		0x71,
		0x73,
		0xfb, // magic "yqs\xFB"
		0x03, // pixel_format = 4:4:4, bit_depth = 8
		colorSpace, // RGB, no extension, no alpha, no anim
	];

	// LEB128 width & height
	const wBytes = [width & 0x7f];
	const hBytes = [height & 0x7f];

	const numPixels = width * height;
	const payloadSize = numPixels * 3;
	const pBytes = [payloadSize & 0x7f, (payloadSize >> 7) & 0x7f];

	const rawData: number[] = [];
	for (let i = 0; i < numPixels; i++) {
		rawData.push((i * 13) % 256, (i * 37) % 256, (i * 71) % 256);
	}

	const allBytes = [...header, ...wBytes, ...hBytes, ...pBytes, ...rawData];

	return new Uint8Array(allBytes);
}

describe("BPG to PNG Engine", () => {
	it("rejects non-BPG file missing magic bytes", () => {
		const invalid = new Uint8Array([
			0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
		]);
		expect(() => convertBpgToPng(invalid)).toThrow(
			/Missing 'yqs\\xFB' magic signature/,
		);
	});

	it("parses mock BPG image and returns valid PNG buffer and metadata", () => {
		const mock = createMockBpgImage(16, 16);
		const result = convertBpgToPng(mock);

		expect(result.metadata.width).toBe(16);
		expect(result.metadata.height).toBe(16);
		expect(result.metadata.colorSpace).toBe("RGB");
		expect(result.metadata.bitDepth).toBe(8);

		expect(result.pngBuffer).toBeInstanceOf(ArrayBuffer);
		expect(result.pngBuffer.byteLength).toBeGreaterThan(64);

		// Validate PNG signature
		const bytes = new Uint8Array(result.pngBuffer);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50); // P
		expect(bytes[2]).toBe(0x4e); // N
		expect(bytes[3]).toBe(0x47); // G
	});

	it("runs via engine interface with progress tracking", async () => {
		const mock = createMockBpgImage(8, 8);
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await bpgToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(64);
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
