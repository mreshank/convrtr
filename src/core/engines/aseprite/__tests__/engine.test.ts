import { deflateSync } from "fflate";
import { describe, expect, it } from "vitest";
import { asepriteToPngEngine } from "../index";
import { parseAseprite } from "../parser";

function createAseprite32Bit(
	width: number,
	height: number,
	rgbaPixels: Uint8Array,
	compressed = true,
): Uint8Array {
	const header = new Uint8Array(128);
	const hView = new DataView(header.buffer);

	hView.setUint16(4, 0xa5e0, true); // Magic
	hView.setUint16(6, 1, true); // 1 frame
	hView.setUint16(8, width, true); // Width
	hView.setUint16(10, height, true); // Height
	hView.setUint16(12, 32, true); // 32-bit RGBA

	// Cel data
	const celHeader = new Uint8Array(20);
	const cView = new DataView(celHeader.buffer);
	cView.setUint16(0, 0, true); // Layer 0
	cView.setInt16(2, 0, true); // X: 0
	cView.setInt16(4, 0, true); // Y: 0
	celHeader[6] = 255; // Opacity 255
	cView.setUint16(7, compressed ? 2 : 0, true); // Cel type (2 = compressed, 0 = raw)
	cView.setUint16(16, width, true);
	cView.setUint16(18, height, true);

	const pixelPayload = compressed ? deflateSync(rgbaPixels) : rgbaPixels;
	const celPayload = new Uint8Array(celHeader.length + pixelPayload.length);
	celPayload.set(celHeader, 0);
	celPayload.set(pixelPayload, celHeader.length);

	// Cel chunk: 6 byte header (4 bytes size + 2 bytes type 0x2005)
	const celChunkSize = 6 + celPayload.length;
	const celChunk = new Uint8Array(celChunkSize);
	const celChunkView = new DataView(celChunk.buffer);
	celChunkView.setUint32(0, celChunkSize, true);
	celChunkView.setUint16(4, 0x2005, true);
	celChunk.set(celPayload, 6);

	// Frame header: 16 bytes
	const frameSize = 16 + celChunkSize;
	const frameHeader = new Uint8Array(16);
	const fView = new DataView(frameHeader.buffer);
	fView.setUint32(0, frameSize, true);
	fView.setUint16(4, 0xf1fa, true); // Frame magic
	fView.setUint16(6, 1, true); // 1 chunk
	fView.setUint16(8, 100, true); // Duration 100ms

	const totalSize = 128 + frameSize;
	hView.setUint32(0, totalSize, true);

	const result = new Uint8Array(totalSize);
	result.set(header, 0);
	result.set(frameHeader, 128);
	result.set(celChunk, 144);

	return result;
}

function createAseprite8Bit(
	width: number,
	height: number,
	indexedPixels: Uint8Array,
	paletteRgb: Array<[number, number, number]>,
): Uint8Array {
	const header = new Uint8Array(128);
	const hView = new DataView(header.buffer);

	hView.setUint16(4, 0xa5e0, true);
	hView.setUint16(6, 1, true);
	hView.setUint16(8, width, true);
	hView.setUint16(10, height, true);
	hView.setUint16(12, 8, true); // 8-bit Indexed
	header[28] = 0; // Transparent index

	// Palette chunk (0x2019):
	// size (4), type (2), newPaletteSize (4), firstColor (4), lastColor (4), 8 reserved
	// then entries: flags (2), r (1), g (1), b (1), a (1)
	const entryCount = paletteRgb.length;
	const palData = new Uint8Array(20 + entryCount * 6);
	const pView = new DataView(palData.buffer);
	pView.setUint32(0, entryCount, true);
	pView.setUint32(4, 0, true); // first index
	pView.setUint32(8, entryCount - 1, true); // last index

	for (let i = 0; i < entryCount; i++) {
		const entryOffset = 20 + i * 6;
		pView.setUint16(entryOffset, 0, true); // No name flag
		const color = paletteRgb[i] ?? [0, 0, 0];
		palData[entryOffset + 2] = color[0];
		palData[entryOffset + 3] = color[1];
		palData[entryOffset + 4] = color[2];
		palData[entryOffset + 5] = 255;
	}

	const palChunkSize = 6 + palData.length;
	const palChunk = new Uint8Array(palChunkSize);
	const palChunkView = new DataView(palChunk.buffer);
	palChunkView.setUint32(0, palChunkSize, true);
	palChunkView.setUint16(4, 0x2019, true);
	palChunk.set(palData, 6);

	// Cel chunk (0x2005)
	const celHeader = new Uint8Array(20);
	const cView = new DataView(celHeader.buffer);
	cView.setUint16(0, 0, true);
	cView.setInt16(2, 0, true);
	cView.setInt16(4, 0, true);
	celHeader[6] = 255;
	cView.setUint16(7, 2, true); // compressed
	cView.setUint16(16, width, true);
	cView.setUint16(18, height, true);

	const compressedPixels = deflateSync(indexedPixels);
	const celPayload = new Uint8Array(celHeader.length + compressedPixels.length);
	celPayload.set(celHeader, 0);
	celPayload.set(compressedPixels, celHeader.length);

	const celChunkSize = 6 + celPayload.length;
	const celChunk = new Uint8Array(celChunkSize);
	const celChunkView = new DataView(celChunk.buffer);
	celChunkView.setUint32(0, celChunkSize, true);
	celChunkView.setUint16(4, 0x2005, true);
	celChunk.set(celPayload, 6);

	// Frame header (2 chunks: Palette + Cel)
	const frameSize = 16 + palChunkSize + celChunkSize;
	const frameHeader = new Uint8Array(16);
	const fView = new DataView(frameHeader.buffer);
	fView.setUint32(0, frameSize, true);
	fView.setUint16(4, 0xf1fa, true);
	fView.setUint16(6, 2, true); // 2 chunks

	const totalSize = 128 + frameSize;
	hView.setUint32(0, totalSize, true);

	const result = new Uint8Array(totalSize);
	result.set(header, 0);
	result.set(frameHeader, 128);
	result.set(palChunk, 144);
	result.set(celChunk, 144 + palChunkSize);

	return result;
}

describe("Aseprite Parser & Engine", () => {
	it("parses a 32-bit RGBA compressed Aseprite sprite", () => {
		// 2x2 sprite: red, green, blue, yellow
		const pixels = new Uint8Array([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
		]);
		const aseBytes = createAseprite32Bit(2, 2, pixels, true);

		const metadata = parseAseprite(aseBytes);
		expect(metadata.width).toBe(2);
		expect(metadata.height).toBe(2);
		expect(metadata.frames).toBe(1);
		expect(metadata.colorDepth).toBe(32);
		expect(metadata.colorDepthName).toBe("32-bit RGBA");
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
		// PNG signature
		expect(metadata.pngBytes[0]).toBe(0x89);
		expect(metadata.pngBytes[1]).toBe(0x50);
		expect(metadata.pngBytes[2]).toBe(0x4e);
		expect(metadata.pngBytes[3]).toBe(0x47);
	});

	it("parses an 8-bit indexed Aseprite sprite with custom palette", () => {
		const palette: Array<[number, number, number]> = [
			[0, 0, 0], // Index 0 (transparent)
			[255, 100, 50], // Index 1
			[50, 150, 250], // Index 2
		];
		const pixels = new Uint8Array([1, 2, 2, 1]); // 2x2
		const aseBytes = createAseprite8Bit(2, 2, pixels, palette);

		const metadata = parseAseprite(aseBytes);
		expect(metadata.width).toBe(2);
		expect(metadata.height).toBe(2);
		expect(metadata.colorDepth).toBe(8);
		expect(metadata.colorDepthName).toBe("8-bit Indexed");
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
		expect(metadata.pngBytes[0]).toBe(0x89);
	});

	it("throws an error for files smaller than 128 bytes", () => {
		const invalidBytes = new Uint8Array(64);
		expect(() => parseAseprite(invalidBytes)).toThrow(
			/File size is smaller than the 128-byte header/,
		);
	});

	it("throws an error for incorrect magic signature", () => {
		const invalidBytes = new Uint8Array(128);
		invalidBytes[4] = 0x00;
		invalidBytes[5] = 0x00;
		expect(() => parseAseprite(invalidBytes)).toThrow(
			/Invalid Aseprite signature/,
		);
	});

	it("converts Aseprite to PNG via asepriteToPngEngine", async () => {
		const pixels = new Uint8Array([10, 20, 30, 255]);
		const aseBytes = createAseprite32Bit(1, 1, pixels, false);

		const result = await asepriteToPngEngine.run(
			aseBytes.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const uint8 = new Uint8Array(result);
		expect(uint8[0]).toBe(0x89);
		expect(uint8[1]).toBe(0x50);
		expect(uint8[2]).toBe(0x4e);
		expect(uint8[3]).toBe(0x47);
	});
});
