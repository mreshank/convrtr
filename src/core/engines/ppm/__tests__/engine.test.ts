import { describe, expect, it } from "vitest";
import { convertPpmToPng, parseNetpbm } from "../index";

describe("Netpbm PPM/PGM/PBM Engine", () => {
	it("parses P1 ASCII PBM monochrome images", () => {
		const p1 = `P1
# A tiny 3x2 bitmap
3 2
1 0 1
0 1 0`;
		const img = parseNetpbm(new TextEncoder().encode(p1));
		expect(img.format).toBe("P1");
		expect(img.width).toBe(3);
		expect(img.height).toBe(2);
		// (0,0) is 1 -> black (0,0,0,255)
		expect(img.rgba[0]).toBe(0);
		expect(img.rgba[1]).toBe(0);
		expect(img.rgba[2]).toBe(0);
		expect(img.rgba[3]).toBe(255);
		// (1,0) is 0 -> white (255,255,255,255)
		expect(img.rgba[4]).toBe(255);
		expect(img.rgba[5]).toBe(255);
		expect(img.rgba[6]).toBe(255);
		expect(img.rgba[7]).toBe(255);
	});

	it("parses P4 Binary PBM packed bits correctly", () => {
		// 4x2 bitmap. Row 1: 1 0 1 0 -> upper 4 bits 0b10100000 = 0xA0
		// Row 2: 0 1 0 1 -> upper 4 bits 0b01010000 = 0x50
		const header = new TextEncoder().encode("P4\n4 2\n");
		const data = new Uint8Array([0xa0, 0x50]);
		const combined = new Uint8Array(header.length + data.length);
		combined.set(header, 0);
		combined.set(data, header.length);

		const img = parseNetpbm(combined);
		expect(img.format).toBe("P4");
		expect(img.width).toBe(4);
		expect(img.height).toBe(2);

		// Pixel (0,0) is 1 -> black
		expect(img.rgba[0]).toBe(0);
		// Pixel (1,0) is 0 -> white
		expect(img.rgba[4]).toBe(255);
		// Pixel (2,0) is 1 -> black
		expect(img.rgba[8]).toBe(0);
		// Pixel (3,0) is 0 -> white
		expect(img.rgba[12]).toBe(255);
	});

	it("parses P2 ASCII PGM grayscale and P3 ASCII PPM color", () => {
		const p2 = `P2\n# Comment\n2 2\n255\n0 128\n192 255\n`;
		const img2 = parseNetpbm(new TextEncoder().encode(p2));
		expect(img2.format).toBe("P2");
		expect(img2.width).toBe(2);
		expect(img2.height).toBe(2);
		expect(img2.rgba[0]).toBe(0); // 0
		expect(img2.rgba[4]).toBe(128); // 128
		expect(img2.rgba[8]).toBe(192); // 192
		expect(img2.rgba[12]).toBe(255); // 255

		const p3 = `P3\n2 1\n255\n255 0 0  0 255 0\n`;
		const img3 = parseNetpbm(new TextEncoder().encode(p3));
		expect(img3.format).toBe("P3");
		expect(img3.width).toBe(2);
		expect(img3.height).toBe(1);
		// Red pixel
		expect(img3.rgba[0]).toBe(255);
		expect(img3.rgba[1]).toBe(0);
		expect(img3.rgba[2]).toBe(0);
		expect(img3.rgba[3]).toBe(255);
		// Green pixel
		expect(img3.rgba[4]).toBe(0);
		expect(img3.rgba[5]).toBe(255);
		expect(img3.rgba[6]).toBe(0);
		expect(img3.rgba[7]).toBe(255);
	});

	it("parses P5 Binary PGM and P6 Binary PPM", () => {
		// P5: 2x1 grayscale
		const h5 = new TextEncoder().encode("P5\n2 1\n255\n");
		const d5 = new Uint8Array([50, 200]);
		const buf5 = new Uint8Array(h5.length + d5.length);
		buf5.set(h5, 0);
		buf5.set(d5, h5.length);

		const img5 = parseNetpbm(buf5);
		expect(img5.format).toBe("P5");
		expect(img5.rgba[0]).toBe(50);
		expect(img5.rgba[4]).toBe(200);

		// P6: 1x2 RGB
		const h6 = new TextEncoder().encode("P6\n1 2\n255\n");
		const d6 = new Uint8Array([10, 20, 30, 40, 50, 60]);
		const buf6 = new Uint8Array(h6.length + d6.length);
		buf6.set(h6, 0);
		buf6.set(d6, h6.length);

		const img6 = parseNetpbm(buf6);
		expect(img6.format).toBe("P6");
		expect(img6.width).toBe(1);
		expect(img6.height).toBe(2);
		expect(img6.rgba[0]).toBe(10);
		expect(img6.rgba[1]).toBe(20);
		expect(img6.rgba[2]).toBe(30);
		expect(img6.rgba[4]).toBe(40);
		expect(img6.rgba[5]).toBe(50);
		expect(img6.rgba[6]).toBe(60);
	});

	it("parses P7 PAM with alpha channel", () => {
		const pam = `P7
WIDTH 2
HEIGHT 1
DEPTH 4
MAXVAL 255
TUPLTYPE RGB_ALPHA
ENDHDR
\x10\x20\x30\x80\x40\x50\x60\xFF`;
		const raw = new Uint8Array(pam.length);
		for (let i = 0; i < pam.length; i++) {
			raw[i] = pam.charCodeAt(i);
		}
		const img = parseNetpbm(raw);
		expect(img.format).toBe("P7");
		expect(img.width).toBe(2);
		expect(img.height).toBe(1);
		expect(img.rgba[0]).toBe(0x10);
		expect(img.rgba[1]).toBe(0x20);
		expect(img.rgba[2]).toBe(0x30);
		expect(img.rgba[3]).toBe(0x80); // alpha 128
	});

	it("converts Netpbm to valid lossless PNG", () => {
		const p3 = `P3\n1 1\n255\n123 45 67\n`;
		const png = convertPpmToPng(new TextEncoder().encode(p3));
		expect(png.length).toBeGreaterThan(0);
		// PNG Magic: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
		expect(png[2]).toBe(0x4e);
		expect(png[3]).toBe(0x47);
	});

	it("throws on corrupted or non-Netpbm files", () => {
		expect(() => parseNetpbm(new Uint8Array([1, 2, 3]))).toThrow(
			/Invalid Netpbm signature/,
		);
		expect(() =>
			parseNetpbm(new TextEncoder().encode("P9\n10 10\n255\n")),
		).toThrow(/Unsupported Netpbm format/);
	});
});
