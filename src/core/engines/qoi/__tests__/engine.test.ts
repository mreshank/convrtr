import { describe, expect, it } from "vitest";
import { convertQoiToPng } from "../parser";

function createMockQoi(width = 4, height = 4): Uint8Array {
	const header = [
		0x71,
		0x6f,
		0x69,
		0x66, // "qoif"
		0,
		0,
		0,
		width, // width uint32 BE
		0,
		0,
		0,
		height, // height uint32 BE
		4, // 4 channels RGBA
		0, // sRGB colorspace
	];

	const stream: number[] = [...header];

	// Pixel 1: QOI_OP_RGBA (Red with full alpha)
	stream.push(0xff, 255, 0, 0, 255);

	// Pixel 2: QOI_OP_DIFF (dr = 0, dg = 1, db = 0) -> dr+2=2 (10), dg+2=3 (11), db+2=2 (10)
	// byte = 0x40 | (2 << 4) | (3 << 2) | 2 = 0x40 | 0x20 | 0x0C | 0x02 = 0x6E
	stream.push(0x6e);

	// Pixel 3..14: QOI_OP_RUN (repeat current pixel 12 times)
	// byte = 0xC0 | (12 - 1) = 0xC0 | 11 = 0xCB
	stream.push(0xcb);

	// Pixel 15: QOI_OP_RGB (Blue with current alpha)
	stream.push(0xfe, 0, 0, 255);

	// Pixel 16: QOI_OP_INDEX (reference previously cached pixel)
	// Hash of (255, 0, 0, 255): ((255*3 + 0*5 + 0*7 + 255*11) & 63) = (765 + 2805) & 63 = 3570 & 63 = 42
	stream.push(0x00 | 42);

	// 8-byte QOI end marker
	stream.push(0, 0, 0, 0, 0, 0, 0, 1);

	return new Uint8Array(stream);
}

describe("Quite OK Image (QOI) to PNG engine", () => {
	it("decompresses mock QOI stream into standard 32-bit RGBA PNG", () => {
		const qoiBytes = createMockQoi(4, 4);
		const result = convertQoiToPng(qoiBytes);

		expect(result.metadata.width).toBe(4);
		expect(result.metadata.height).toBe(4);
		expect(result.metadata.channels).toBe(4);
		expect(result.metadata.colorspace).toBe(0);
		expect(result.metadata.fileSize).toBe(qoiBytes.length);

		// Verify PNG signature and IHDR
		const png = result.pngBytes;
		expect(png.length).toBeGreaterThan(50);
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50); // P
		expect(png[2]).toBe(0x4e); // N
		expect(png[3]).toBe(0x47); // G
		expect(png[4]).toBe(0x0d);
		expect(png[5]).toBe(0x0a);
		expect(png[6]).toBe(0x1a);
		expect(png[7]).toBe(0x0a);

		const dec = new TextDecoder();
		expect(dec.decode(png.subarray(12, 16))).toBe("IHDR");
	});

	it("reports progress across conversion phases", () => {
		const phases: string[] = [];
		const qoiBytes = createMockQoi(2, 2);

		convertQoiToPng(qoiBytes, {}, (_, phase) => {
			phases.push(phase);
		});

		expect(phases).toContain("READ_HEADER");
		expect(phases).toContain("DECODE_SCANLINES");
		expect(phases).toContain("ENCODE_PNG");
		expect(phases).toContain("COMPLETE");
	});

	it("throws an error for truncated QOI files", () => {
		expect(() => convertQoiToPng(new Uint8Array(10))).toThrow(
			/Size .* is too small/,
		);
	});

	it("throws an error for invalid magic header", () => {
		const badMagic = new Uint8Array(25);
		expect(() => convertQoiToPng(badMagic)).toThrow(
			/Missing 'qoif' magic signature/,
		);
	});

	it("throws an error for zero dimensions", () => {
		const zeroDim = new Uint8Array(25);
		zeroDim[0] = 0x71;
		zeroDim[1] = 0x6f;
		zeroDim[2] = 0x69;
		zeroDim[3] = 0x66;
		// width = 0, height = 0
		expect(() => convertQoiToPng(zeroDim)).toThrow(/cannot be zero/);
	});
});
