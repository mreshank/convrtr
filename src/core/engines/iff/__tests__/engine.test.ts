import { describe, expect, it } from "vitest";
import { iffToPngEngine } from "../index";
import { decompressByteRun1, parseIff } from "../parser";

function createIffIlbm(
	width: number,
	height: number,
	nPlanes: number,
	paletteRgb: Array<[number, number, number]>,
	planeData: Uint8Array,
	compression = 0,
	camg = 0,
	masking = 0,
): Uint8Array {
	const chunks: Array<{ id: string; data: Uint8Array }> = [];

	// BMHD
	const bmhd = new Uint8Array(20);
	const bView = new DataView(bmhd.buffer);
	bView.setUint16(0, width, false); // Big-Endian
	bView.setUint16(2, height, false);
	bView.setInt16(4, 0, false);
	bView.setInt16(6, 0, false);
	bmhd[8] = nPlanes;
	bmhd[9] = masking;
	bmhd[10] = compression;
	bmhd[11] = 0;
	bView.setUint16(12, 0, false); // transparentColor
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

	// CAMG
	if (camg !== 0) {
		const camgBuf = new Uint8Array(4);
		new DataView(camgBuf.buffer).setUint32(0, camg, false);
		chunks.push({ id: "CAMG", data: camgBuf });
	}

	// BODY
	chunks.push({ id: "BODY", data: planeData });

	// Calculate total FORM size
	let formPayloadSize = 4; // 'ILBM'
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
	result[8] = 0x49; // I
	result[9] = 0x4c; // L
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

describe("IFF-ILBM Image Parser & Engine", () => {
	it("decompresses ByteRun1 RLE byte stream correctly", () => {
		// Literal run: 2 bytes (b = 1), followed by repeat run: 3 bytes of 0x42 (b = 257 - 3 = 254)
		const compressed = new Uint8Array([1, 10, 20, 254, 0x42]);
		const decompressed = decompressByteRun1(compressed, 5);
		expect(Array.from(decompressed)).toEqual([10, 20, 0x42, 0x42, 0x42]);
	});

	it("parses an uncompressed 2-plane (4-color) ILBM image", () => {
		// 16x1 image (rowBytes = 2 per plane)
		// Plane 0: 0b11000000 00000000 (0xc0, 0x00)
		// Plane 1: 0b10100000 00000000 (0xa0, 0x00)
		// Pixel 0: plane0=1, plane1=1 -> Color 3
		// Pixel 1: plane0=1, plane1=0 -> Color 1
		// Pixel 2: plane0=0, plane1=1 -> Color 2
		const rowBytes = 2;
		const planeData = new Uint8Array(rowBytes * 2);
		planeData[0] = 0xc0;
		planeData[1] = 0x00;
		planeData[2] = 0xa0;
		planeData[3] = 0x00;

		const palette: Array<[number, number, number]> = [
			[0, 0, 0],
			[255, 0, 0],
			[0, 255, 0],
			[0, 0, 255],
		];

		const iffBytes = createIffIlbm(16, 1, 2, palette, planeData);
		const metadata = parseIff(iffBytes);

		expect(metadata.width).toBe(16);
		expect(metadata.height).toBe(1);
		expect(metadata.nPlanes).toBe(2);
		expect(metadata.format).toBe("ILBM");
		expect(metadata.colorCount).toBe(4);
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
		expect(metadata.pngBytes[0]).toBe(0x89);
		expect(metadata.pngBytes[1]).toBe(0x50);
	});

	it("parses an EHB (Extra Half-Brite) 6-plane ILBM image", () => {
		const rowBytes = 2;
		// 6 planes * 2 bytes = 12 bytes
		const planeData = new Uint8Array(rowBytes * 6);
		// Set bit 0 of plane 5 to activate half-brite on pixel 0
		planeData[0] = 0x80; // plane 0 bit 7 = 1 -> color 1 base
		planeData[10] = 0x80; // plane 5 bit 7 = 1 -> index 33 (half-brite of color 1)

		const palette: Array<[number, number, number]> = [];
		for (let i = 0; i < 32; i++) {
			palette.push([200, 100, 50]);
		}

		const iffBytes = createIffIlbm(16, 1, 6, palette, planeData, 0, 0x0080);
		const metadata = parseIff(iffBytes);

		expect(metadata.colorCount).toBe(64); // 32 base + 32 half-brite
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
	});

	it("parses a HAM6 (Hold-And-Modify) 6-plane ILBM image", () => {
		const rowBytes = 2;
		const planeData = new Uint8Array(rowBytes * 6);
		// Mode 2 (modify Red) with value 15 (0x0F) -> 0x2F = 0b101111
		// Plane 0: 1, Plane 1: 1, Plane 2: 1, Plane 3: 1, Plane 4: 0, Plane 5: 1
		planeData[0] = 0x80;
		planeData[2] = 0x80;
		planeData[4] = 0x80;
		planeData[6] = 0x80;
		planeData[8] = 0x00;
		planeData[10] = 0x80;

		const palette: Array<[number, number, number]> = [];
		for (let i = 0; i < 16; i++) {
			palette.push([i * 16, i * 16, i * 16]);
		}

		const iffBytes = createIffIlbm(16, 1, 6, palette, planeData, 0, 0x0800);
		const metadata = parseIff(iffBytes);

		expect(metadata.width).toBe(16);
		expect(metadata.nPlanes).toBe(6);
		expect(metadata.pngBytes.length).toBeGreaterThan(0);
	});

	it("throws an error for non-FORM files", () => {
		const invalidBytes = new Uint8Array(16);
		expect(() => parseIff(invalidBytes)).toThrow(/Expected FORM header/);
	});

	it("throws an error when BMHD is missing", () => {
		const buf = new Uint8Array(16);
		buf.set([0x46, 0x4f, 0x52, 0x4d, 0, 0, 0, 8, 0x49, 0x4c, 0x42, 0x4d]);
		expect(() => parseIff(buf)).toThrow(/Missing required BMHD/);
	});

	it("converts IFF to PNG via iffToPngEngine", async () => {
		const planeData = new Uint8Array(4); // 16x1, 2 planes uncompressed
		const iffBytes = createIffIlbm(
			16,
			1,
			2,
			[
				[0, 0, 0],
				[255, 255, 255],
			],
			planeData,
		);

		const result = await iffToPngEngine.run(
			iffBytes.buffer as ArrayBuffer,
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
