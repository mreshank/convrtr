import { describe, expect, it } from "vitest";
import { acbmToPngEngine, convertAcbmToPng } from "../index";

function createAcbm(
	width: number,
	height: number,
	nPlanes: number,
	paletteRgb: Array<[number, number, number]>,
	bitmapData: Uint8Array,
	options: {
		compression?: number;
		masking?: number;
		chunkTag?: string;
	} = {},
): Uint8Array {
	const compression = options.compression ?? 0;
	const masking = options.masking ?? 0;
	const chunkTag = options.chunkTag ?? "ABMP";

	const chunks: Array<{ id: string; data: Uint8Array }> = [];

	// BMHD
	const bmhd = new Uint8Array(20);
	const bView = new DataView(bmhd.buffer);
	bView.setUint16(0, width, false); // Big-Endian width
	bView.setUint16(2, height, false); // Big-Endian height
	bView.setInt16(4, 0, false);
	bView.setInt16(6, 0, false);
	bmhd[8] = nPlanes;
	bmhd[9] = masking;
	bmhd[10] = compression;
	bmhd[11] = 0;
	bView.setUint16(12, 0, false); // transparent color
	bmhd[14] = 10;
	bmhd[15] = 11;
	bView.setInt16(16, width, false);
	bView.setInt16(18, height, false);
	chunks.push({ id: "BMHD", data: bmhd });

	// CMAP
	if (paletteRgb.length > 0) {
		const cmap = new Uint8Array(paletteRgb.length * 3);
		for (let i = 0; i < paletteRgb.length; i++) {
			const color = paletteRgb[i] ?? [0, 0, 0];
			cmap[i * 3] = color[0];
			cmap[i * 3 + 1] = color[1];
			cmap[i * 3 + 2] = color[2];
		}
		chunks.push({ id: "CMAP", data: cmap });
	}

	// ABMP / BODY
	chunks.push({ id: chunkTag, data: bitmapData });

	// Total FORM payload size: 4 bytes ("ACBM") + chunks
	let formPayloadSize = 4;
	for (const chunk of chunks) {
		formPayloadSize +=
			8 + chunk.data.length + (chunk.data.length % 2 !== 0 ? 1 : 0);
	}

	const totalSize = 8 + formPayloadSize;
	const result = new Uint8Array(totalSize);
	const rView = new DataView(result.buffer);

	// FORM
	result[0] = 0x46; // F
	result[1] = 0x4f; // O
	result[2] = 0x52; // R
	result[3] = 0x4d; // M
	rView.setUint32(4, formPayloadSize, false);
	result[8] = 0x41; // A
	result[9] = 0x43; // C
	result[10] = 0x42; // B
	result[11] = 0x4d; // M

	let offset = 12;
	for (const chunk of chunks) {
		for (let i = 0; i < 4; i++) {
			result[offset + i] = chunk.id.charCodeAt(i);
		}
		rView.setUint32(offset + 4, chunk.data.length, false);
		result.set(chunk.data, offset + 8);
		offset += 8 + chunk.data.length;
		if (chunk.data.length % 2 !== 0) {
			result[offset] = 0; // Pad byte
			offset++;
		}
	}

	return result;
}

describe("Commodore Amiga Continuous Bitmap (ACBM) Engine", () => {
	it("throws an error on invalid or truncated data", () => {
		expect(() => convertAcbmToPng(new Uint8Array(6))).toThrow(
			/smaller than the 12-byte IFF header/,
		);

		const fakeForm = new Uint8Array([
			0x46, 0x4f, 0x52, 0x4d, 0, 0, 0, 4, 0x49, 0x4c, 0x42, 0x4d,
		]);
		expect(() => convertAcbmToPng(fakeForm)).toThrow(
			/Expected 'ACBM', found 'ILBM'/,
		);
	});

	it("converts uncompressed 4-color ACBM image to PNG", () => {
		const width = 16;
		const height = 4;
		const nPlanes = 2;
		const bytesPerRow = 2; // 16 pixels = 2 bytes
		const planeSize = bytesPerRow * height; // 8 bytes per plane
		const totalBytes = planeSize * nPlanes; // 16 bytes

		const bitmap = new Uint8Array(totalBytes);
		// Plane 0: Set bits for row 0: 0b10100000 0b00000000
		bitmap[0] = 0b10100000;
		// Plane 1: Set bits for row 0: 0b11000000 0b00000000
		bitmap[planeSize + 0] = 0b11000000;

		const palette: Array<[number, number, number]> = [
			[0, 0, 0], // color 0: black
			[255, 0, 0], // color 1: red (plane 0 bit only)
			[0, 255, 0], // color 2: green (plane 1 bit only)
			[0, 0, 255], // color 3: blue (plane 0 & 1 bits)
		];

		const acbmBytes = createAcbm(width, height, nPlanes, palette, bitmap);
		const result = convertAcbmToPng(acbmBytes);

		expect(result.metadata.width).toBe(16);
		expect(result.metadata.height).toBe(4);
		expect(result.metadata.nPlanes).toBe(2);
		expect(result.metadata.colorCount).toBe(4);
		expect(result.pngBytes.length).toBeGreaterThan(0);

		// PNG signature check
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50); // 'P'
		expect(result.pngBytes[2]).toBe(0x4e); // 'N'
		expect(result.pngBytes[3]).toBe(0x47); // 'G'
	});

	it("decompresses and decodes ByteRun1 compressed ACBM images", () => {
		const width = 16;
		const height = 2;
		const nPlanes = 1;
		const bytesPerRow = 2;
		const _planeSize = bytesPerRow * height; // 4 bytes

		// ByteRun1 compressed stream for 4 bytes of 0xFF:
		// b = 257 - 4 = 253, followed by 0xFF
		const compressed = new Uint8Array([253, 0xff]);

		const palette: Array<[number, number, number]> = [
			[0, 0, 0],
			[255, 255, 255],
		];

		const acbmBytes = createAcbm(width, height, nPlanes, palette, compressed, {
			compression: 1,
		});

		const result = convertAcbmToPng(acbmBytes);
		expect(result.metadata.compression).toBe(1);
		expect(result.metadata.width).toBe(16);
		expect(result.metadata.height).toBe(2);
		expect(result.pngBytes.length).toBeGreaterThan(0);
	});

	it("handles 24-bit deep truecolor ACBM files", () => {
		const width = 16;
		const height = 1;
		const nPlanes = 24;
		const bytesPerRow = 2;
		const planeSize = bytesPerRow * height; // 2 bytes per plane
		const totalBytes = planeSize * 24;

		const bitmap = new Uint8Array(totalBytes);
		// Plane 7 (MSB of Red): set bit 7 of pixel 0
		bitmap[7 * planeSize + 0] = 0x80;
		// Plane 15 (MSB of Green): set bit 6 of pixel 1
		bitmap[15 * planeSize + 0] = 0x40;
		// Plane 23 (MSB of Blue): set bit 5 of pixel 2
		bitmap[23 * planeSize + 0] = 0x20;

		const acbmBytes = createAcbm(width, height, nPlanes, [], bitmap);
		const result = convertAcbmToPng(acbmBytes);

		expect(result.metadata.nPlanes).toBe(24);
		expect(result.metadata.width).toBe(16);
		expect(result.metadata.height).toBe(1);
		expect(result.pngBytes[0]).toBe(0x89);
	});

	it("converts through Engine interface", async () => {
		const width = 16;
		const height = 2;
		const nPlanes = 1;
		const bitmap = new Uint8Array(4);

		const acbmBytes = createAcbm(width, height, nPlanes, [], bitmap);
		const output = await acbmToPngEngine.run(
			acbmBytes.buffer as ArrayBuffer,
			{},
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const u8 = new Uint8Array(output);
		expect(u8[0]).toBe(0x89);
		expect(u8[1]).toBe(0x50);
	});
});
