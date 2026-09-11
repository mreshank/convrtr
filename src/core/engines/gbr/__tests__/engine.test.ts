import { describe, expect, it, vi } from "vitest";
import { gbrToPngEngine } from "../index";
import { parseGbr } from "../parser";

function createMockGbrV2(options: {
	width: number;
	height: number;
	bytesPerPixel: number;
	name: string;
	spacing?: number;
	pixels: number[];
}): Uint8Array {
	const nameBytes = new TextEncoder().encode(options.name);
	const nameLengthWithNull = nameBytes.length + 1;
	const headerSize = 28 + nameLengthWithNull;
	const totalPixels = options.width * options.height;
	const pixelBytesLength = totalPixels * options.bytesPerPixel;

	const buffer = new Uint8Array(headerSize + pixelBytesLength);
	const view = new DataView(buffer.buffer);

	// Header
	view.setUint32(0, headerSize, false);
	view.setUint32(4, 2, false); // version 2
	view.setUint32(8, options.width, false);
	view.setUint32(12, options.height, false);
	view.setUint32(16, options.bytesPerPixel, false);
	view.setUint32(20, 0x47494d50, false); // "GIMP"
	view.setUint32(24, options.spacing ?? 25, false);

	// Name
	buffer.set(nameBytes, 28);
	buffer[28 + nameBytes.length] = 0; // null terminator

	// Pixels
	buffer.set(options.pixels, headerSize);

	return buffer;
}

function createMockGbrV1(options: {
	width: number;
	height: number;
	bytesPerPixel: number;
	name: string;
	pixels: number[];
}): Uint8Array {
	const nameBytes = new TextEncoder().encode(options.name);
	const nameLengthWithNull = nameBytes.length + 1;
	const headerSize = 20 + nameLengthWithNull;
	const totalPixels = options.width * options.height;
	const pixelBytesLength = totalPixels * options.bytesPerPixel;

	const buffer = new Uint8Array(headerSize + pixelBytesLength);
	const view = new DataView(buffer.buffer);

	// Header
	view.setUint32(0, headerSize, false);
	view.setUint32(4, 1, false); // version 1
	view.setUint32(8, options.width, false);
	view.setUint32(12, options.height, false);
	view.setUint32(16, options.bytesPerPixel, false);

	// Name
	buffer.set(nameBytes, 20);
	buffer[20 + nameBytes.length] = 0;

	// Pixels
	buffer.set(options.pixels, headerSize);

	return buffer;
}

describe("GIMP Brush (.gbr) Parser & Engine", () => {
	it("parses a valid GBR version 2 grayscale brush", () => {
		const mockGbr = createMockGbrV2({
			width: 2,
			height: 2,
			bytesPerPixel: 1,
			name: "Charcoal Texture",
			spacing: 15,
			pixels: [0, 128, 200, 255],
		});

		const result = parseGbr(mockGbr);
		expect(result.version).toBe(2);
		expect(result.width).toBe(2);
		expect(result.height).toBe(2);
		expect(result.bytesPerPixel).toBe(1);
		expect(result.spacing).toBe(15);
		expect(result.name).toBe("Charcoal Texture");

		// Check PNG magic
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50); // P
		expect(result.pngBytes[2]).toBe(0x4e); // N
		expect(result.pngBytes[3]).toBe(0x47); // G
	});

	it("parses a legacy GBR version 1 brush", () => {
		const mockGbr = createMockGbrV1({
			width: 2,
			height: 2,
			bytesPerPixel: 1,
			name: "Vintage Splatter",
			pixels: [0, 0, 255, 255],
		});

		const result = parseGbr(mockGbr);
		expect(result.version).toBe(1);
		expect(result.width).toBe(2);
		expect(result.height).toBe(2);
		expect(result.name).toBe("Vintage Splatter");
		expect(result.pngBytes.length).toBeGreaterThan(20);
	});

	it("parses an RGBA 4-channel color brush", () => {
		const mockGbr = createMockGbrV2({
			width: 1,
			height: 1,
			bytesPerPixel: 4,
			name: "Gold Sparkle",
			pixels: [255, 215, 0, 255], // Gold RGBA
		});

		const result = parseGbr(mockGbr);
		expect(result.bytesPerPixel).toBe(4);
		expect(result.name).toBe("Gold Sparkle");
		expect(result.pngBytes[0]).toBe(0x89);
	});

	it("throws an error on truncated or corrupted headers", () => {
		expect(() => parseGbr(new Uint8Array([0, 1, 2]))).toThrow(
			"smaller than the minimum 20-byte header",
		);

		// Invalid version
		const badVersion = new Uint8Array(24);
		new DataView(badVersion.buffer).setUint32(0, 24, false);
		new DataView(badVersion.buffer).setUint32(4, 99, false); // version 99
		expect(() => parseGbr(badVersion)).toThrow(
			"Unsupported GIMP Brush version: 99",
		);

		// Invalid magic for v2
		const badMagic = new Uint8Array(28);
		const view = new DataView(badMagic.buffer);
		view.setUint32(0, 28, false);
		view.setUint32(4, 2, false);
		view.setUint32(8, 10, false);
		view.setUint32(12, 10, false);
		view.setUint32(16, 1, false);
		view.setUint32(20, 0x12345678, false); // Not "GIMP"
		expect(() => parseGbr(badMagic)).toThrow("Missing 'GIMP' magic marker");
	});

	it("throws an error when pixel data is truncated", () => {
		const truncated = createMockGbrV2({
			width: 10,
			height: 10,
			bytesPerPixel: 1,
			name: "Big Brush",
			pixels: [0, 0, 0], // Only 3 pixels instead of 100
		});
		// Slice off bytes
		const slice = truncated.subarray(0, truncated.length - 50);
		expect(() => parseGbr(slice)).toThrow("Truncated GBR file");
	});

	it("runs the full conversion engine and produces valid PNG buffer", async () => {
		const mockGbr = createMockGbrV2({
			width: 2,
			height: 2,
			bytesPerPixel: 1,
			name: "Ink Stamp",
			pixels: [0, 0, 0, 0],
		});

		const progress = vi.fn();
		const inputBuf = mockGbr.buffer.slice(
			mockGbr.byteOffset,
			mockGbr.byteOffset + mockGbr.byteLength,
		) as ArrayBuffer;
		const output = await gbrToPngEngine.run(inputBuf, {}, progress);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(progress).toHaveBeenCalledWith(1.0, "Complete");

		const bytes = new Uint8Array(output);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x4e);
		expect(bytes[3]).toBe(0x47);
	});
});
