import { describe, expect, it } from "vitest";
import { actToCssEngine } from "../index";
import { parseAct } from "../parser";

describe("Adobe Color Table (.act) Parser & Engine", () => {
	it("parses a standard 768-byte ACT file with 256 colors", () => {
		const bytes = new Uint8Array(768);
		// Color 0: Red
		bytes[0] = 255;
		bytes[1] = 0;
		bytes[2] = 0;
		// Color 1: Green
		bytes[3] = 0;
		bytes[4] = 255;
		bytes[5] = 0;
		// Color 2: Blue
		bytes[6] = 0;
		bytes[7] = 0;
		bytes[8] = 255;

		const palette = parseAct(bytes);
		expect(palette.totalColors).toBe(256);
		expect(palette.activeColors).toBe(256);
		expect(palette.transparentIndex).toBeNull();
		expect(palette.colors).toHaveLength(256);
		expect(palette.colors[0]?.r).toBe(255);
		expect(palette.colors[1]?.g).toBe(255);
		expect(palette.colors[2]?.b).toBe(255);

		expect(palette.cssContent).toContain("--palette-0: rgb(255, 0, 0);");
		expect(palette.cssContent).toContain("--palette-1: rgb(0, 255, 0);");
		expect(palette.cssContent).toContain("--palette-2: rgb(0, 0, 255);");
		expect(palette.cssContent).toContain(".bg-palette-0");
		expect(palette.cssContent).toContain("Tailwind CSS Configuration snippet");
	});

	it("parses a 772-byte ACT file with color count and transparent index", () => {
		const bytes = new Uint8Array(772);
		// Set first 3 colors
		bytes[0] = 100;
		bytes[1] = 150;
		bytes[2] = 200;

		const view = new DataView(bytes.buffer);
		view.setUint16(768, 32, false); // 32 active colors
		view.setUint16(770, 0, false); // index 0 is transparent

		const palette = parseAct(bytes);
		expect(palette.activeColors).toBe(32);
		expect(palette.transparentIndex).toBe(0);
		expect(palette.colors[0]?.isTransparent).toBe(true);
		expect(palette.colors[1]?.isTransparent).toBe(false);

		expect(palette.cssContent).toContain("/* transparent */");
		expect(palette.cssContent).toContain("Active: 32");
	});

	it("throws an error for invalid file sizes", () => {
		const invalidBytes = new Uint8Array(500);
		expect(() => parseAct(invalidBytes)).toThrow(
			/Expected file size of 768 or 772 bytes/,
		);
	});

	it("converts ACT to CSS through actToCssEngine", async () => {
		const bytes = new Uint8Array(768);
		bytes[0] = 42;
		bytes[1] = 84;
		bytes[2] = 126;

		const result = await actToCssEngine.run(
			bytes.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const text = new TextDecoder().decode(result);
		expect(text).toContain(":root {");
		expect(text).toContain("--palette-0: rgb(42, 84, 126);");
	});
});
