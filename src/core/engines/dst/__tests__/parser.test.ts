import { describe, expect, it } from "vitest";
import { convertDstToSvg, dstToSvgEngine } from "../index";
import { parseDst } from "../parser";

function makeDst(
	header: Record<string, string>,
	triplets: number[],
): Uint8Array {
	const head = new Uint8Array(512).fill(0x20);
	const enc = new TextEncoder();
	let fields = "";
	for (const [k, v] of Object.entries(header)) fields += `${k}:${v}\r`;
	fields += "\x1a   ";
	enc.encodeInto(fields, head.subarray(0));
	const body = new Uint8Array(triplets.length * 3);
	triplets.forEach((v, i) => {
		body[i * 3] = (v >> 16) & 0xff;
		body[i * 3 + 1] = (v >> 8) & 0xff;
		body[i * 3 + 2] = v & 0xff;
	});
	const out = new Uint8Array(512 + body.length);
	out.set(head, 0);
	out.set(body, 512);
	return out;
}

// Triplet builders: bit positions per KDE ternary table.
const bit = (n: number): number => 1 << n;
const X1 = bit(16);
const Y1 = bit(23);
const JUMP = bit(7);
const STOP = bit(6);
const END = 0x0000f3;

describe("Tajima DST Parser & Engine", () => {
	it("decodes stitches, jumps, colour stops and the end marker", () => {
		const file = makeDst({ LA: "rose", ST: "4", CO: "1" }, [
			X1, // (+1, 0)
			Y1, // (+1, +1)
			JUMP | X1, // travel to (+2, +1)
			X1, // sew (+3, +1)
			STOP, // colour change
			X1, // new block (+4, +1)
			END,
		]);
		const design = parseDst(file);
		expect(design.stats.label).toBe("rose");
		expect(design.stats.declaredStitches).toBe(4);
		expect(design.stats.stitchCount).toBe(4);
		expect(design.stats.jumpCount).toBe(1);
		expect(design.stats.colorChanges).toBe(1);
		expect(design.blocks).toHaveLength(3);
		expect(design.blocks[0]).toEqual([
			[0, 0],
			[1, 0],
			[1, 1],
		]);
		expect(design.blocks[1]).toEqual([
			[2, 1],
			[3, 1],
		]);
		expect(design.blocks[2]).toEqual([
			[3, 1],
			[4, 1],
		]);
	});

	it("renders millimetre-scaled SVG with stats", async () => {
		expect(await dstToSvgEngine.probe()).toBe(true);
		const file = makeDst({ LA: "t" }, [X1, X1, END]);
		const out = await convertDstToSvg(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const svg = new TextDecoder().decode(out);
		expect(svg).toContain("<svg");
		expect(svg).toContain("2 stitches");
		expect(svg).toContain("mm");
	});

	it("rejects non-DST input and stitchless files", () => {
		const bad = new Uint8Array(600).fill(0x41);
		expect(() => parseDst(bad)).toThrow("`LA:`");
		expect(() => parseDst(new Uint8Array(10))).toThrow("smaller than");
		const empty = makeDst({ LA: "empty" }, [END]);
		expect(() => parseDst(empty)).toThrow("No sewn stitches");
	});
});
