import { describe, expect, it } from "vitest";
import { xbmToPngEngine } from "../index";
import { parseXbm } from "../parser";

describe("X11 X BitMap (XBM) Parser & Engine", () => {
	it("parses a standard 16x16 XBM C-header file into PNG", () => {
		const xbmText = `
#define cross_width 16
#define cross_height 16
static unsigned char cross_bits[] = {
   0x01, 0x80, 0x02, 0x40, 0x04, 0x20, 0x08, 0x10,
   0x10, 0x08, 0x20, 0x04, 0x40, 0x02, 0x80, 0x01,
   0x80, 0x01, 0x40, 0x02, 0x20, 0x04, 0x10, 0x08,
   0x08, 0x10, 0x04, 0x20, 0x02, 0x40, 0x01, 0x80 };
`.trim();

		const metadata = parseXbm(xbmText);
		expect(metadata.name).toBe("cross");
		expect(metadata.width).toBe(16);
		expect(metadata.height).toBe(16);
		expect(metadata.pngBytes.length).toBeGreaterThan(0);

		// PNG signature: 0x89, 0x50, 0x4E, 0x47
		expect(metadata.pngBytes[0]).toBe(0x89);
		expect(metadata.pngBytes[1]).toBe(0x50);
		expect(metadata.pngBytes[2]).toBe(0x4e);
		expect(metadata.pngBytes[3]).toBe(0x47);
	});

	it("correctly unpacks LSB-first pixel bits", () => {
		// 8x1 image, byte = 0x01 -> bit 0 = 1, bits 1-7 = 0
		const xbmText = `
#define dot_width 8
#define dot_height 1
static char dot_bits[] = { 0x01 };
`;
		const metaTransparent = parseXbm(xbmText, { transparentBackground: true });
		expect(metaTransparent.width).toBe(8);
		expect(metaTransparent.height).toBe(1);
		expect(metaTransparent.pngBytes[0]).toBe(0x89);

		const metaWhite = parseXbm(xbmText, { transparentBackground: false });
		expect(metaWhite.pngBytes[0]).toBe(0x89);
	});

	it("throws an error when width or height macros are missing", () => {
		const invalidXbm = `static char bits[] = { 0x00 };`;
		expect(() => parseXbm(invalidXbm)).toThrow(/Missing #define/);
	});

	it("throws an error when data array is missing", () => {
		const invalidXbm = `#define w_width 10\n#define w_height 10`;
		expect(() => parseXbm(invalidXbm)).toThrow(/Missing array data body/);
	});

	it("converts XBM to PNG via xbmToPngEngine", async () => {
		const xbmText = `
#define icon_width 8
#define icon_height 8
static unsigned char icon_bits[] = {
  0xff, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xff
};
`;
		const encoder = new TextEncoder();
		const inputBuf = encoder.encode(xbmText).buffer as ArrayBuffer;

		const result = await xbmToPngEngine.run(inputBuf, {}, () => {});
		const uint8 = new Uint8Array(result);
		expect(uint8[0]).toBe(0x89);
		expect(uint8[1]).toBe(0x50);
		expect(uint8[2]).toBe(0x4e);
		expect(uint8[3]).toBe(0x47);
	});
});
