import { describe, expect, it } from "vitest";
import { convertXpmToPng, parseXpm, xpmToPngEngine } from "../index";

const SAMPLE_XPM3 = `/* XPM */
static char * sample_xpm[] = {
"8 8 3 1",
"  c None",
". c red",
"+ c blue",
"  ....  ",
" ...... ",
"........",
"...++...",
"...++...",
"........",
" ...... ",
"  ....  "
};`;

const SAMPLE_XPM_MULTI_CHAR = `/* XPM */
static char * multichar_xpm[] = {
"4 4 2 2",
".. c None",
"XX c green",
"....XXXX",
"....XXXX",
"XXXX....",
"XXXX...."
};`;

const SAMPLE_XPM2 = `! XPM2
4 4 2 1
  c None
# c black
    
 ## 
 ## 
    `;

describe("xpm parser and PNG engine", () => {
	it("parses standard XPM3 C-source icons into PNG", () => {
		const meta = parseXpm(SAMPLE_XPM3);
		expect(meta.width).toBe(8);
		expect(meta.height).toBe(8);
		expect(meta.numColors).toBe(3);
		expect(meta.charsPerPixel).toBe(1);

		// PNG signature check
		expect(meta.pngBytes[0]).toBe(0x89);
		expect(meta.pngBytes[1]).toBe(0x50);
		expect(meta.pngBytes[2]).toBe(0x4e);
		expect(meta.pngBytes[3]).toBe(0x47);
	});

	it("handles multi-character color keys (charsPerPixel = 2)", () => {
		const meta = parseXpm(SAMPLE_XPM_MULTI_CHAR);
		expect(meta.width).toBe(4);
		expect(meta.height).toBe(4);
		expect(meta.charsPerPixel).toBe(2);
		expect(meta.numColors).toBe(2);
		expect(meta.pngBytes.length).toBeGreaterThan(50);
	});

	it("parses XPM2 plain text format", () => {
		const meta = parseXpm(SAMPLE_XPM2);
		expect(meta.width).toBe(4);
		expect(meta.height).toBe(4);
		expect(meta.numColors).toBe(2);
	});

	it("converts XPM buffer via convertXpmToPng", () => {
		const buf = new TextEncoder()
			.encode(SAMPLE_XPM3)
			.buffer.slice(0) as ArrayBuffer;
		const pngBuf = convertXpmToPng(buf);
		const pngBytes = new Uint8Array(pngBuf);
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(pngBytes[2]).toBe(0x4e);
		expect(pngBytes[3]).toBe(0x47);
	});

	it("executes xpmToPngEngine with progress tracking", async () => {
		const buf = new TextEncoder()
			.encode(SAMPLE_XPM3)
			.buffer.slice(0) as ArrayBuffer;
		const progressUpdates: number[] = [];
		const res = await xpmToPngEngine.run(buf, {}, (ratio: number) => {
			progressUpdates.push(ratio);
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		const pngBytes = new Uint8Array(res);
		expect(pngBytes[0]).toBe(0x89);
	});

	it("throws on truncated or malformed XPM", () => {
		expect(() => parseXpm("invalid xpm")).toThrow(/Invalid XPM file/);
	});
});
