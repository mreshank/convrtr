import { describe, expect, it } from "vitest";
import { vtfToPngEngine } from "../index";
import { parseVtf } from "../parser";

function createVtfHeader(
	width: number,
	height: number,
	format: number,
	mipmapCount = 1,
): Uint8Array {
	const header = new Uint8Array(64);
	const view = new DataView(header.buffer);

	// "VTF\0"
	header[0] = 0x56;
	header[1] = 0x54;
	header[2] = 0x46;
	header[3] = 0x00;

	view.setUint32(4, 7, true); // majorVersion 7
	view.setUint32(8, 2, true); // minorVersion 2
	view.setUint32(12, 64, true); // headerSize 64

	view.setUint16(16, width, true);
	view.setUint16(18, height, true);
	view.setUint32(20, 0, true); // flags

	view.setUint16(24, 1, true); // frames
	view.setUint16(26, 0, true); // firstFrame

	view.setUint32(52, format, true); // highResImageFormat
	header[56] = mipmapCount; // mipmapCount

	view.setInt32(57, -1, true); // lowResImageFormat (-1 = none)
	header[61] = 0; // lowResImageWidth
	header[62] = 0; // lowResImageHeight

	return header;
}

describe("Valve Texture Format (.vtf) Parser & Engine", () => {
	it("parses an uncompressed RGBA8888 VTF texture", () => {
		const header = createVtfHeader(2, 2, 0); // format 0 = RGBA8888
		const pixelData = new Uint8Array([
			255,
			0,
			0,
			255, // Red
			0,
			255,
			0,
			255, // Green
			0,
			0,
			255,
			255, // Blue
			255,
			255,
			0,
			255, // Yellow
		]);

		const vtfBytes = new Uint8Array(header.length + pixelData.length);
		vtfBytes.set(header, 0);
		vtfBytes.set(pixelData, header.length);

		const metadata = parseVtf(vtfBytes);
		expect(metadata.width).toBe(2);
		expect(metadata.height).toBe(2);
		expect(metadata.formatName).toBe("RGBA8888");
		expect(metadata.pngBytes[0]).toBe(0x89);
		expect(metadata.pngBytes[1]).toBe(0x50); // P
		expect(metadata.pngBytes[2]).toBe(0x4e); // N
		expect(metadata.pngBytes[3]).toBe(0x47); // G
	});

	it("parses an uncompressed BGRA8888 VTF texture and swizzles to RGBA", () => {
		const header = createVtfHeader(1, 1, 12); // format 12 = BGRA8888
		const pixelData = new Uint8Array([255, 0, 0, 255]); // B=255, G=0, R=0, A=255 (Blue)

		const vtfBytes = new Uint8Array(header.length + pixelData.length);
		vtfBytes.set(header, 0);
		vtfBytes.set(pixelData, header.length);

		const metadata = parseVtf(vtfBytes);
		expect(metadata.width).toBe(1);
		expect(metadata.height).toBe(1);
		expect(metadata.formatName).toBe("BGRA8888");
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
	});

	it("parses a DXT1 compressed VTF texture (4x4)", () => {
		const header = createVtfHeader(4, 4, 13); // format 13 = DXT1
		// 8-byte DXT1 solid block
		const block = new Uint8Array([
			0x00,
			0xf8, // color0: red (RGB 565: 11111 000000 00000)
			0x00,
			0x00, // color1: black
			0x00,
			0x00,
			0x00,
			0x00, // all pixels use color0
		]);

		const vtfBytes = new Uint8Array(header.length + block.length);
		vtfBytes.set(header, 0);
		vtfBytes.set(block, header.length);

		const metadata = parseVtf(vtfBytes);
		expect(metadata.width).toBe(4);
		expect(metadata.height).toBe(4);
		expect(metadata.formatName).toBe("DXT1 (BC1)");
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
	});

	it("correctly skips smaller mipmaps in multi-mipmap VTF file", () => {
		// 4x4 texture with 2 mipmaps: Mip 1 (2x2, 8 bytes DXT1) and Mip 0 (4x4, 8 bytes DXT1)
		const header = createVtfHeader(4, 4, 13, 2);
		const mip1 = new Uint8Array(8); // 2x2 DXT1 block
		const mip0 = new Uint8Array(8); // 4x4 DXT1 block
		mip0[0] = 0x00;
		mip0[1] = 0xf8; // Red

		const vtfBytes = new Uint8Array(header.length + mip1.length + mip0.length);
		vtfBytes.set(header, 0);
		vtfBytes.set(mip1, header.length);
		vtfBytes.set(mip0, header.length + mip1.length);

		const metadata = parseVtf(vtfBytes);
		expect(metadata.width).toBe(4);
		expect(metadata.height).toBe(4);
		expect(metadata.mipmapCount).toBe(2);
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
	});

	it("throws an error for non-VTF files with invalid magic marker", () => {
		const invalidBytes = new Uint8Array(64);
		expect(() => parseVtf(invalidBytes)).toThrow(/Invalid VTF signature/);
	});

	it("converts VTF to PNG via vtfToPngEngine", async () => {
		const header = createVtfHeader(2, 2, 0);
		const pixelData = new Uint8Array(16).fill(200);

		const vtfBytes = new Uint8Array(header.length + pixelData.length);
		vtfBytes.set(header, 0);
		vtfBytes.set(pixelData, header.length);

		const result = await vtfToPngEngine.run(
			vtfBytes.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const uint8 = new Uint8Array(result);
		expect(uint8[0]).toBe(0x89);
		expect(uint8[1]).toBe(0x50);
	});
});
