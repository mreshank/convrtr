import { describe, expect, it, vi } from "vitest";
import { sgiToPngEngine } from "../index";
import { convertSgiToPng, parseSgiHeader } from "../parser";
import {
	SGI_HEADER_SIZE,
	SGI_MAGIC,
	SGI_STORAGE_RLE,
	SGI_STORAGE_VERBATIM,
} from "../types";

function createSgiBuffer(options: {
	storage?: number;
	bpc?: number;
	width: number;
	height: number;
	channels: number;
	name?: string;
	payload: Uint8Array;
	offsetTable?: number[];
	lengthTable?: number[];
}): ArrayBuffer {
	const storage = options.storage ?? SGI_STORAGE_VERBATIM;
	const bpc = options.bpc ?? 1;
	const isRle = storage === SGI_STORAGE_RLE;
	const numScanlines = options.height * options.channels;
	const tableSize = isRle ? numScanlines * 8 : 0;
	const totalSize = SGI_HEADER_SIZE + tableSize + options.payload.length;

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	view.setUint16(0, SGI_MAGIC, false);
	view.setUint8(2, storage);
	view.setUint8(3, bpc);
	view.setUint16(4, options.channels === 1 ? 2 : 3, false); // dimension
	view.setUint16(6, options.width, false);
	view.setUint16(8, options.height, false);
	view.setUint16(10, options.channels, false);
	view.setUint32(12, 0, false); // pixmin
	view.setUint32(16, bpc === 1 ? 255 : 65535, false); // pixmax

	if (options.name) {
		for (let i = 0; i < options.name.length && i < 79; i++) {
			view.setUint8(24 + i, options.name.charCodeAt(i));
		}
	}

	if (isRle && options.offsetTable && options.lengthTable) {
		for (let i = 0; i < numScanlines; i++) {
			view.setUint32(512 + i * 4, options.offsetTable[i] ?? 0, false);
			view.setUint32(
				512 + (numScanlines + i) * 4,
				options.lengthTable[i] ?? 0,
				false,
			);
		}
		u8.set(options.payload, SGI_HEADER_SIZE + tableSize);
	} else {
		u8.set(options.payload, SGI_HEADER_SIZE);
	}

	return buffer;
}

describe("SGI Engine (sgi-to-png)", () => {
	it("probes successfully", async () => {
		expect(await sgiToPngEngine.probe()).toBe(true);
	});

	it("throws on truncated or invalid header", () => {
		const small = new Uint8Array(200);
		expect(() => parseSgiHeader(new DataView(small.buffer))).toThrow(
			"header must be at least 512 bytes",
		);

		const wrongMagic = new Uint8Array(512);
		expect(() => parseSgiHeader(new DataView(wrongMagic.buffer))).toThrow(
			"Invalid SGI magic",
		);
	});

	it("converts uncompressed 1-channel Grayscale SGI (.bw)", () => {
		const width = 2;
		const height = 2;
		// 2x2 grayscale: row 0 (bottom) = [50, 100], row 1 (top) = [150, 200]
		const payload = new Uint8Array([50, 100, 150, 200]);

		const sgi = createSgiBuffer({
			width,
			height,
			channels: 1,
			payload,
		});

		const pngBuffer = convertSgiToPng(sgi);
		const u8 = new Uint8Array(pngBuffer);
		expect(u8[0]).toBe(0x89);
		expect(u8[1]).toBe(0x50);
		expect(u8[2]).toBe(0x4e);
		expect(u8[3]).toBe(0x47);
	});

	it("converts uncompressed 3-channel RGB SGI (.rgb) with vertical orientation flip", async () => {
		const width = 1;
		const height = 2;
		// Channels: Red, Green, Blue
		// Channel 0 (Red): row 0 (bottom) = 10, row 1 (top) = 255
		// Channel 1 (Green): row 0 (bottom) = 20, row 1 (top) = 128
		// Channel 2 (Blue): row 0 (bottom) = 30, row 1 (top) = 0
		const payload = new Uint8Array([
			10,
			255, // Red channel
			20,
			128, // Green channel
			30,
			0, // Blue channel
		]);

		const sgi = createSgiBuffer({
			width,
			height,
			channels: 3,
			payload,
			name: "TestRGB",
		});

		const onProgress = vi.fn();
		const pngBuffer = await sgiToPngEngine.run(sgi, {}, onProgress);
		const u8 = new Uint8Array(pngBuffer);

		expect(u8[0]).toBe(0x89);
		expect(onProgress).toHaveBeenCalledWith(1.0, "Complete");
	});

	it("converts uncompressed 4-channel RGBA SGI (.rgba)", () => {
		const width = 1;
		const height = 1;
		// 1 pixel: Red = 255, Green = 0, Blue = 128, Alpha = 200
		const payload = new Uint8Array([255, 0, 128, 200]);

		const sgi = createSgiBuffer({
			width,
			height,
			channels: 4,
			payload,
		});

		const pngBuffer = convertSgiToPng(sgi);
		expect(new Uint8Array(pngBuffer)[0]).toBe(0x89);
	});

	it("converts SGI RLE compressed image", () => {
		const width = 4;
		const height = 1;
		const channels = 1;

		// RLE compressed row of 4 identical bytes (200):
		// In SGI RLE: (count | 0x80), val, 0 (end) => (4 | 0x80) = 0x84, 200, 0
		const rleScanline = new Uint8Array([0x84, 200, 0]);

		// Table sizes: 1 scanline => 8 bytes (4 bytes offset, 4 bytes length)
		const dataOffset = SGI_HEADER_SIZE + 8;

		const sgi = createSgiBuffer({
			storage: SGI_STORAGE_RLE,
			width,
			height,
			channels,
			payload: rleScanline,
			offsetTable: [dataOffset],
			lengthTable: [rleScanline.length],
		});

		const pngBuffer = convertSgiToPng(sgi);
		expect(new Uint8Array(pngBuffer)[0]).toBe(0x89);
	});

	it("converts 16-bit per channel SGI (bpc = 2)", () => {
		const width = 1;
		const height = 1;
		const channels = 1;

		// 16-bit value: 0xFF00 (65280) => should scale down to 0xFF (255)
		const payload = new Uint8Array([0xff, 0x00]);

		const sgi = createSgiBuffer({
			bpc: 2,
			width,
			height,
			channels,
			payload,
		});

		const pngBuffer = convertSgiToPng(sgi);
		expect(new Uint8Array(pngBuffer)[0]).toBe(0x89);
	});
});
