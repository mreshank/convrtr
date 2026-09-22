import { describe, expect, it } from "vitest";
import { convertJefToSvg, jefToSvgEngine } from "../index";
import { parseJef } from "../parser";

function makeJef(body: number[], colorCount = 1): Uint8Array {
	const head = new Uint8Array(144);
	const v = new DataView(head.buffer);
	v.setUint32(0, 144, true); // stitch-data offset
	v.setUint32(24, colorCount, true);
	const out = new Uint8Array(144 + body.length);
	out.set(head, 0);
	out.set(body, 144);
	return out;
}

describe("Janome JEF Parser & Engine", () => {
	it("decodes header offset, stitches, colour stops, jumps and end", () => {
		const file = makeJef([10, 0, 0, 5, 0x80, 0x01, 0, 0, 5, 5, 0x80, 0x10], 2);
		const design = parseJef(file);
		expect(design.stats.label).toBe("Janome JEF design");
		expect(design.stats.declaredColorChanges).toBe(2);
		expect(design.stats.stitchCount).toBe(3);
		expect(design.stats.colorChanges).toBe(1);
		expect(design.blocks).toHaveLength(2);
		expect(design.blocks[0]).toEqual([
			[0, 0],
			[10, 0],
			[10, 5],
		]);
		expect(design.blocks[1]).toEqual([
			[10, 5],
			[15, 10],
		]);
	});

	it("handles jump commands with travel", () => {
		const file = makeJef([10, 0, 0x80, 0x02, 20, 20, 0, 0, 0x80, 0x10]);
		const design = parseJef(file);
		expect(design.stats.jumpCount).toBe(1);
		expect(design.stats.stitchCount).toBe(2);
		expect(design.blocks).toHaveLength(2);
		expect(design.blocks[0]).toEqual([
			[0, 0],
			[10, 0],
		]);
	});

	it("renders SVG through the engine", async () => {
		expect(await jefToSvgEngine.probe()).toBe(true);
		const file = makeJef([10, 10, 0x80, 0x10]);
		const out = await convertJefToSvg(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const svg = new TextDecoder().decode(out);
		expect(svg).toContain("<svg");
		expect(svg).toContain("1 stitches");
	});

	it("rejects absurd offsets and stitchless files", () => {
		const bad = new Uint8Array(200);
		new DataView(bad.buffer).setUint32(0, 999999, true);
		expect(() => parseJef(bad)).toThrow("stitch-data offset");
		expect(() => parseJef(new Uint8Array(10))).toThrow("minimal header");
	});
});
