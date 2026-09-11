import { describe, expect, it } from "vitest";
import { xwdToPngEngine } from "../index";
import { parseXwdHeader } from "../parser";

function createMockXwd({
	width = 2,
	height = 2,
	bitsPerPixel = 32,
	ncolors = 0,
	colormap = [],
	pixelBytes = new Uint8Array(),
	byteOrder = 1, // MSBFirst
	fileVersion = 7,
	windowName = "test_window",
}: {
	width?: number;
	height?: number;
	bitsPerPixel?: number;
	ncolors?: number;
	colormap?: { r: number; g: number; b: number }[];
	pixelBytes?: Uint8Array;
	byteOrder?: number;
	fileVersion?: number;
	windowName?: string;
}): Uint8Array {
	const nameBytes = new TextEncoder().encode(`${windowName}\0`);
	const headerSize = 100 + nameBytes.length;
	const colorMapSize = ncolors * 12;
	const stride = Math.ceil((width * bitsPerPixel) / 8);
	const expectedDataSize = height * stride;
	const dataSize = pixelBytes.length > 0 ? pixelBytes.length : expectedDataSize;
	const totalSize = headerSize + colorMapSize + dataSize;

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	// Header
	view.setUint32(0, headerSize, false);
	view.setUint32(4, fileVersion, false);
	view.setUint32(8, 2, false); // ZPixmap
	view.setUint32(12, bitsPerPixel <= 8 ? bitsPerPixel : 24, false); // depth
	view.setUint32(16, width, false);
	view.setUint32(20, height, false);
	view.setUint32(24, 0, false); // xoffset
	view.setUint32(28, byteOrder, false);
	view.setUint32(32, 32, false); // bitmap_unit
	view.setUint32(36, 1, false); // bitmap_bit_order (MSBFirst)
	view.setUint32(40, 32, false); // bitmap_pad
	view.setUint32(44, bitsPerPixel, false);
	view.setUint32(48, stride, false);
	view.setUint32(52, bitsPerPixel > 8 ? 4 : 3, false); // TrueColor or PseudoColor
	view.setUint32(56, 0x00ff0000, false); // red_mask
	view.setUint32(60, 0x0000ff00, false); // green_mask
	view.setUint32(64, 0x000000ff, false); // blue_mask
	view.setUint32(68, 8, false);
	view.setUint32(72, ncolors, false);
	view.setUint32(76, ncolors, false);
	view.setUint32(80, width, false);
	view.setUint32(84, height, false);
	view.setInt32(88, 0, false);
	view.setInt32(92, 0, false);
	view.setUint32(96, 0, false);

	// Window name
	u8.set(nameBytes, 100);

	// Colormap
	let offset = headerSize;
	for (let i = 0; i < ncolors; i++) {
		const c = colormap[i] ?? { r: 0, g: 0, b: 0 };
		view.setUint32(offset, i, false);
		view.setUint16(offset + 4, c.r << 8, false);
		view.setUint16(offset + 6, c.g << 8, false);
		view.setUint16(offset + 8, c.b << 8, false);
		u8[offset + 10] = 7; // flags
		u8[offset + 11] = 0; // pad
		offset += 12;
	}

	// Pixels
	if (pixelBytes.length > 0) {
		u8.set(pixelBytes, offset);
	}

	return u8;
}

describe("xwdToPngEngine", () => {
	it("probes successfully", async () => {
		expect(await xwdToPngEngine.probe()).toBe(true);
	});

	it("parses XWD header fields correctly", () => {
		const mock = createMockXwd({
			width: 16,
			height: 8,
			bitsPerPixel: 32,
			windowName: "terminal",
		});
		const header = parseXwdHeader(mock);
		expect(header.fileVersion).toBe(7);
		expect(header.pixmapWidth).toBe(16);
		expect(header.pixmapHeight).toBe(8);
		expect(header.bitsPerPixel).toBe(32);
		expect(header.windowName).toBe("terminal");
	});

	it("converts 32-bit TrueColor XWD to valid PNG", async () => {
		// 2x2 32-bit RGBA image
		// Colors: Red (0x00FF0000), Green (0x0000FF00), Blue (0x000000FF), White (0x00FFFFFF)
		const pixels = new Uint8Array([
			0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff,
			0x00, 0xff, 0xff, 0xff,
		]);
		const mock = createMockXwd({
			width: 2,
			height: 2,
			bitsPerPixel: 32,
			pixelBytes: pixels,
		});

		const res = await xwdToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const png = new Uint8Array(res);
		expect(res).toBeInstanceOf(ArrayBuffer);
		// Standard PNG signature
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50); // 'P'
		expect(png[2]).toBe(0x4e); // 'N'
		expect(png[3]).toBe(0x47); // 'G'
	});

	it("converts 8-bit colormapped XWD to valid PNG", async () => {
		// 2x2 8-bit image with 4-color palette
		const colormap = [
			{ r: 255, g: 0, b: 0 },
			{ r: 0, g: 255, b: 0 },
			{ r: 0, g: 0, b: 255 },
			{ r: 255, g: 255, b: 0 },
		];
		const pixels = new Uint8Array([0, 1, 2, 3]);
		const mock = createMockXwd({
			width: 2,
			height: 2,
			bitsPerPixel: 8,
			ncolors: 4,
			colormap,
			pixelBytes: pixels,
		});

		const res = await xwdToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const png = new Uint8Array(res);
		expect(res).toBeInstanceOf(ArrayBuffer);
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
	});

	it("converts 1-bit monochrome XWD to valid PNG", async () => {
		// 4x2 1-bit image: row 0 = 0b10100000 (0xA0), row 1 = 0b01010000 (0x50)
		const pixels = new Uint8Array([0xa0, 0x50]);
		const mock = createMockXwd({
			width: 4,
			height: 2,
			bitsPerPixel: 1,
			pixelBytes: pixels,
		});

		const res = await xwdToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const png = new Uint8Array(res);
		expect(res).toBeInstanceOf(ArrayBuffer);
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
	});

	it("rejects non-v7 files and truncated buffers", async () => {
		const invalidVersion = createMockXwd({ fileVersion: 6 });
		await expect(
			xwdToPngEngine.run(invalidVersion.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/Unsupported XWD version/);

		const truncated = new Uint8Array([0, 0, 0, 100]);
		await expect(
			xwdToPngEngine.run(truncated.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/File size too small/);
	});
});
