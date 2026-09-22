import { describe, expect, it } from "vitest";
import { convertExpToSvg, expToSvgEngine } from "../index";
import { parseExp } from "../parser";

function moves(list: Array<[number, number] | [number]>): Uint8Array {
	const out: number[] = [];
	for (const m of list) {
		if (m.length === 1) {
			out.push(0x80, m[0] ?? 0);
		} else {
			const [x, y] = m;
			out.push(x < 0 ? x + 256 : x, y < 0 ? y + 256 : y);
		}
	}
	return new Uint8Array(out);
}

describe("Melco EXP Parser & Engine", () => {
	it("decodes moves, jumps, colour stops and end", () => {
		const file = moves([
			[10, 0],
			[0, 5],
			[0x04], // jump mode
			[20, 20],
			[0x02], // stitch mode
			[0, 0], // landing stitch
			[0x01], // colour change
			[5, 5],
			[0x80], // end
		]);
		const design = parseExp(file);
		expect(design.stats.label).toBe("Melco EXP design");
		expect(design.stats.stitchCount).toBe(4);
		expect(design.stats.jumpCount).toBe(1);
		expect(design.stats.colorChanges).toBe(1);
		expect(design.blocks).toHaveLength(3);
		expect(design.blocks[0]).toEqual([
			[0, 0],
			[10, 0],
			[10, 5],
		]);
		expect(design.blocks[2]).toEqual([
			[30, 25],
			[35, 30],
		]);
	});

	it("handles negative 2's-complement moves", () => {
		const file = moves([
			[-3, -128 + 128], // (-3, 0)
			[0x80],
		]);
		const design = parseExp(file);
		expect(design.stats.minX).toBe(-3);
	});

	it("renders SVG through the engine", async () => {
		expect(await expToSvgEngine.probe()).toBe(true);
		const file = moves([[10, 10], [0x80]]);
		const out = await convertExpToSvg(
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

	it("rejects empty and stitchless files", () => {
		expect(() => parseExp(new Uint8Array(0))).toThrow("empty");
		expect(() => parseExp(new Uint8Array([0x80, 0x80]))).toThrow(
			"No sewn stitches",
		);
	});
});
