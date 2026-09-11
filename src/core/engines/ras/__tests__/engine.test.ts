import { describe, expect, it, vi } from "vitest";
import { rasToPngEngine } from "../index";
import { convertRasToPng, getRasRowBytes, parseRasHeader } from "../parser";
import {
	RAS_MAGIC,
	RAS_MAPTYPE_EQUAL_RGB,
	RAS_MAPTYPE_NONE,
	RAS_TYPE_BYTE_ENCODED,
	RAS_TYPE_FORMAT_RGB,
	RAS_TYPE_STANDARD,
} from "../types";

function createRasBuffer(options: {
	width: number;
	height: number;
	depth: number;
	type?: number;
	maptype?: number;
	colormap?: Uint8Array;
	rasterData: Uint8Array;
}): ArrayBuffer {
	const type = options.type ?? RAS_TYPE_STANDARD;
	const maptype = options.maptype ?? RAS_MAPTYPE_NONE;
	const maplength = options.colormap ? options.colormap.length : 0;
	const length = options.rasterData.length;

	const totalSize = 32 + maplength + length;
	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	view.setUint32(0, RAS_MAGIC, false);
	view.setUint32(4, options.width, false);
	view.setUint32(8, options.height, false);
	view.setUint32(12, options.depth, false);
	view.setUint32(16, length, false);
	view.setUint32(20, type, false);
	view.setUint32(24, maptype, false);
	view.setUint32(28, maplength, false);

	if (options.colormap) {
		u8.set(options.colormap, 32);
	}
	u8.set(options.rasterData, 32 + maplength);

	return buffer;
}

describe("Sun Raster Engine (ras-to-png)", () => {
	it("probes successfully", async () => {
		expect(await rasToPngEngine.probe()).toBe(true);
	});

	it("correctly calculates scanline byte length with 16-bit padding", () => {
		// 1-bit: 10 pixels => 2 bytes unpadded => rounded up to 2 bytes (multiple of 2)
		expect(getRasRowBytes(10, 1)).toBe(2);
		// 1-bit: 17 pixels => 3 bytes unpadded => rounded up to 4 bytes
		expect(getRasRowBytes(17, 1)).toBe(4);
		// 8-bit: 3 pixels => 3 bytes => padded to 4 bytes
		expect(getRasRowBytes(3, 8)).toBe(4);
		// 8-bit: 4 pixels => 4 bytes => already even
		expect(getRasRowBytes(4, 8)).toBe(4);
		// 24-bit: 3 pixels => 9 bytes => padded to 10 bytes
		expect(getRasRowBytes(3, 24)).toBe(10);
	});

	it("throws on invalid magic or truncated buffer", () => {
		const invalid = new Uint8Array(20);
		expect(() => parseRasHeader(new DataView(invalid.buffer))).toThrow(
			"header must be at least 32 bytes",
		);

		const wrongMagic = new Uint8Array(32);
		expect(() => parseRasHeader(new DataView(wrongMagic.buffer))).toThrow(
			"Invalid Sun Raster magic number",
		);
	});

	it("converts 1-bit monochrome Sun Raster to PNG", async () => {
		const width = 4;
		const height = 2;
		const rowBytes = getRasRowBytes(width, 1); // 2 bytes per row
		const rasterData = new Uint8Array(rowBytes * height);

		// Row 0: 1 0 1 0 => byte 0 = 0xA0 (10100000)
		rasterData[0] = 0xa0;
		rasterData[1] = 0x00; // padding byte
		// Row 1: 0 1 0 1 => byte 2 = 0x50 (01010000)
		rasterData[2] = 0x50;
		rasterData[3] = 0x00; // padding byte

		const ras = createRasBuffer({
			width,
			height,
			depth: 1,
			rasterData,
		});

		const pngBuffer = convertRasToPng(ras);
		const pngBytes = new Uint8Array(pngBuffer);

		// Verify PNG signature (0x89 50 4E 47 0D 0A 1A 0A)
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(pngBytes[2]).toBe(0x4e);
		expect(pngBytes[3]).toBe(0x47);
	});

	it("converts 8-bit indexed palette Sun Raster with planar colormap", async () => {
		const width = 3;
		const height = 2;
		const rowBytes = getRasRowBytes(width, 8); // 3 -> 4 bytes
		const rasterData = new Uint8Array(rowBytes * height);

		// Colormap with 3 colors:
		// Index 0: Red (255, 0, 0)
		// Index 1: Green (0, 255, 0)
		// Index 2: Blue (0, 0, 255)
		// Planar layout: 3 reds, 3 greens, 3 blues (9 bytes total)
		const colormap = new Uint8Array([
			255,
			0,
			0, // Reds
			0,
			255,
			0, // Greens
			0,
			0,
			255, // Blues
		]);

		// Row 0: indices 0, 1, 2, pad 0
		rasterData[0] = 0;
		rasterData[1] = 1;
		rasterData[2] = 2;
		rasterData[3] = 0;

		// Row 1: indices 2, 1, 0, pad 0
		rasterData[4] = 2;
		rasterData[5] = 1;
		rasterData[6] = 0;
		rasterData[7] = 0;

		const ras = createRasBuffer({
			width,
			height,
			depth: 8,
			maptype: RAS_MAPTYPE_EQUAL_RGB,
			colormap,
			rasterData,
		});

		const onProgress = vi.fn();
		const pngBuffer = await rasToPngEngine.run(ras, {}, onProgress);
		const pngBytes = new Uint8Array(pngBuffer);

		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(onProgress).toHaveBeenCalledWith(1.0, "Complete");
	});

	it("converts 24-bit BGR and RGB truecolor Sun Raster", () => {
		const width = 2;
		const height = 1;
		const rowBytes = getRasRowBytes(width, 24); // 6 bytes (even)
		const rasterData = new Uint8Array(rowBytes * height);

		// Pixel 0: Red in BGR => [0, 0, 255]
		rasterData[0] = 0; // B
		rasterData[1] = 0; // G
		rasterData[2] = 255; // R
		// Pixel 1: Blue in BGR => [255, 0, 0]
		rasterData[3] = 255; // B
		rasterData[4] = 0; // G
		rasterData[5] = 0; // R

		const ras = createRasBuffer({
			width,
			height,
			depth: 24,
			type: RAS_TYPE_STANDARD,
			rasterData,
		});

		const pngBuffer = convertRasToPng(ras);
		expect(new Uint8Array(pngBuffer)[0]).toBe(0x89);

		// Also test RT_FORMAT_RGB
		const rgbRaster = new Uint8Array([255, 0, 0, 0, 255, 0]);
		const rasRgb = createRasBuffer({
			width,
			height,
			depth: 24,
			type: RAS_TYPE_FORMAT_RGB,
			rasterData: rgbRaster,
		});
		const pngRgb = convertRasToPng(rasRgb);
		expect(new Uint8Array(pngRgb)[0]).toBe(0x89);
	});

	it("converts RLE byte-encoded Sun Raster (RT_BYTE_ENCODED)", () => {
		const width = 4;
		const height = 1;

		// Uncompressed row should be: [12, 12, 12, 12]
		// In Sun RLE: 0x80, count, val => 0x80, 3, 12 (repeats 3 + 1 = 4 times)
		const rleData = new Uint8Array([0x80, 3, 12]);

		const ras = createRasBuffer({
			width,
			height,
			depth: 8,
			type: RAS_TYPE_BYTE_ENCODED,
			rasterData: rleData,
		});

		const pngBuffer = convertRasToPng(ras);
		expect(new Uint8Array(pngBuffer)[0]).toBe(0x89);
	});
});
