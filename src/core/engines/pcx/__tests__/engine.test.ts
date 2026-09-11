import { describe, expect, it } from "vitest";
import { pcxToPngEngine } from "../index";
import { parsePcx } from "../parser";

function createPcx8Bit(
	width: number,
	height: number,
	pixelValues: number[],
	palette: number[],
): Uint8Array {
	// bytesPerLine must be even
	const bytesPerLine = width % 2 === 0 ? width : width + 1;
	const header = new Uint8Array(128);
	const view = new DataView(header.buffer);

	header[0] = 0x0a; // Manufacturer ID
	header[1] = 5; // Version 3.0+
	header[2] = 1; // RLE encoding
	header[3] = 8; // 8 bits per pixel

	view.setUint16(4, 0, true); // xMin
	view.setUint16(6, 0, true); // yMin
	view.setUint16(8, width - 1, true); // xMax
	view.setUint16(10, height - 1, true); // yMax

	header[65] = 1; // 1 plane
	view.setUint16(66, bytesPerLine, true);

	const scanlines: number[] = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < bytesPerLine; x++) {
			if (x < width) {
				scanlines.push(pixelValues[y * width + x] ?? 0);
			} else {
				scanlines.push(0); // padding
			}
		}
	}

	// RLE encode scanlines
	const rleData: number[] = [];
	let i = 0;
	while (i < scanlines.length) {
		const val = scanlines[i] ?? 0;
		let run = 1;
		while (
			i + run < scanlines.length &&
			scanlines[i + run] === val &&
			run < 63
		) {
			run++;
		}

		if (run > 1 || (val & 0xc0) === 0xc0) {
			rleData.push(0xc0 | run);
			rleData.push(val);
		} else {
			rleData.push(val);
		}
		i += run;
	}

	const palData = new Uint8Array(769);
	palData[0] = 0x0c; // Marker
	for (let p = 0; p < Math.min(palette.length, 768); p++) {
		palData[1 + p] = palette[p] ?? 0;
	}

	const result = new Uint8Array(
		header.length + rleData.length + palData.length,
	);
	result.set(header, 0);
	result.set(rleData, header.length);
	result.set(palData, header.length + rleData.length);

	return result;
}

function createPcx24Bit(
	width: number,
	height: number,
	rgbPixels: Array<[number, number, number]>,
): Uint8Array {
	const bytesPerLine = width % 2 === 0 ? width : width + 1;
	const header = new Uint8Array(128);
	const view = new DataView(header.buffer);

	header[0] = 0x0a;
	header[1] = 5;
	header[2] = 1;
	header[3] = 8;

	view.setUint16(4, 0, true);
	view.setUint16(6, 0, true);
	view.setUint16(8, width - 1, true);
	view.setUint16(10, height - 1, true);

	header[65] = 3; // 3 planes (R, G, B)
	view.setUint16(66, bytesPerLine, true);

	const scanlines: number[] = [];
	for (let y = 0; y < height; y++) {
		// Plane 0: Red
		for (let x = 0; x < bytesPerLine; x++) {
			scanlines.push(x < width ? (rgbPixels[y * width + x]?.[0] ?? 0) : 0);
		}
		// Plane 1: Green
		for (let x = 0; x < bytesPerLine; x++) {
			scanlines.push(x < width ? (rgbPixels[y * width + x]?.[1] ?? 0) : 0);
		}
		// Plane 2: Blue
		for (let x = 0; x < bytesPerLine; x++) {
			scanlines.push(x < width ? (rgbPixels[y * width + x]?.[2] ?? 0) : 0);
		}
	}

	const rleData: number[] = [];
	for (const val of scanlines) {
		if ((val & 0xc0) === 0xc0) {
			rleData.push(0xc1);
			rleData.push(val);
		} else {
			rleData.push(val);
		}
	}

	const result = new Uint8Array(header.length + rleData.length);
	result.set(header, 0);
	result.set(rleData, header.length);

	return result;
}

describe("PCX Bitmap Parser & Engine", () => {
	it("parses an 8-bit paletted PCX file with trailing 256-color palette", () => {
		const palette = new Array(768).fill(0);
		// Color 1: Red (255, 0, 0)
		palette[3] = 255;
		palette[4] = 0;
		palette[5] = 0;
		// Color 2: Blue (0, 0, 255)
		palette[6] = 0;
		palette[7] = 0;
		palette[8] = 255;

		const pixels = [1, 2, 2, 1]; // 2x2 image
		const pcxBytes = createPcx8Bit(2, 2, pixels, palette);

		const metadata = parsePcx(pcxBytes);
		expect(metadata.width).toBe(2);
		expect(metadata.height).toBe(2);
		expect(metadata.bitsPerPixel).toBe(8);
		expect(metadata.planes).toBe(1);
		expect(metadata.colorCount).toBe(256);
		expect(metadata.pngBytes.length).toBeGreaterThan(0);

		// PNG header signature verification
		expect(metadata.pngBytes[0]).toBe(0x89);
		expect(metadata.pngBytes[1]).toBe(0x50); // P
		expect(metadata.pngBytes[2]).toBe(0x4e); // N
		expect(metadata.pngBytes[3]).toBe(0x47); // G
	});

	it("parses a 24-bit TrueColor PCX file with 3 color planes", () => {
		const pixels: Array<[number, number, number]> = [
			[255, 0, 0], // Red
			[0, 255, 0], // Green
			[0, 0, 255], // Blue
			[255, 255, 0], // Yellow
		];
		const pcxBytes = createPcx24Bit(2, 2, pixels);

		const metadata = parsePcx(pcxBytes);
		expect(metadata.width).toBe(2);
		expect(metadata.height).toBe(2);
		expect(metadata.bitsPerPixel).toBe(8);
		expect(metadata.planes).toBe(3);
		expect(metadata.colorCount).toBe(16777216);
		expect(metadata.pngBytes[0]).toBe(0x89);
	});

	it("parses a 1-bit monochrome PCX image", () => {
		const header = new Uint8Array(128);
		const view = new DataView(header.buffer);
		header[0] = 0x0a;
		header[1] = 5;
		header[2] = 1;
		header[3] = 1; // 1 bpp
		view.setUint16(4, 0, true);
		view.setUint16(6, 0, true);
		view.setUint16(8, 7, true); // width = 8
		view.setUint16(10, 0, true); // height = 1
		header[65] = 1; // 1 plane
		view.setUint16(66, 2, true); // bytesPerLine = 2

		// Scanline: 0b10101010, 0x00
		const rle = [0xaa, 0x00];
		const pcxBytes = new Uint8Array(128 + rle.length);
		pcxBytes.set(header, 0);
		pcxBytes.set(rle, 128);

		const metadata = parsePcx(pcxBytes);
		expect(metadata.width).toBe(8);
		expect(metadata.height).toBe(1);
		expect(metadata.colorCount).toBe(2);
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
	});

	it("throws an error for files smaller than 128 bytes", () => {
		const invalidBytes = new Uint8Array(64);
		expect(() => parsePcx(invalidBytes)).toThrow(
			/File size is smaller than the 128-byte PCX header/,
		);
	});

	it("throws an error for non-PCX files with wrong signature", () => {
		const invalidBytes = new Uint8Array(128);
		invalidBytes[0] = 0x55; // Not 0x0A
		expect(() => parsePcx(invalidBytes)).toThrow(/Invalid PCX signature/);
	});

	it("converts PCX to PNG via pcxToPngEngine", async () => {
		const palette = new Array(768).fill(128);
		const pcxBytes = createPcx8Bit(2, 2, [0, 0, 0, 0], palette);

		const result = await pcxToPngEngine.run(
			pcxBytes.buffer as ArrayBuffer,
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
