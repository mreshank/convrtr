import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { psdToPngEngine } from "../index";
import { convertPsdToPng, parsePsd } from "../parser";

function header(w: number, h: number, mode = 3, channels = 3): Uint8Array {
	const b = new Uint8Array(26);
	const v = new DataView(b.buffer);
	new TextEncoder().encodeInto("8BPS", b.subarray(0));
	v.setUint16(4, 1, false);
	v.setUint16(12, channels, false);
	v.setUint32(14, h, false);
	v.setUint32(18, w, false);
	v.setUint16(22, 8, false);
	v.setUint16(24, mode, false);
	return b;
}

function concat(...parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

function u32(n: number): Uint8Array {
	const b = new Uint8Array(4);
	new DataView(b.buffer).setUint32(0, n, false);
	return b;
}

/** Flat RGB PSD with raw composite (no layers). pixels = row-major [r,g,b]. */
function flatPsd(
	w: number,
	h: number,
	pixels: Array<[number, number, number]>,
): Uint8Array {
	const planes = new Uint8Array(2 + 3 * w * h);
	planes[1] = 0; // compression raw
	pixels.forEach(([r, g, b], i) => {
		planes[2 + i] = r;
		planes[2 + w * h + i] = g;
		planes[2 + 2 * w * h + i] = b;
	});
	return concat(header(w, h), u32(0), u32(0), u32(0), planes);
}

function packBitsLiteral(row: number[]): Uint8Array {
	// Single literal run (n <= 127).
	return new Uint8Array([row.length - 1, ...row]);
}

/** Layer record with raw RGBA channels. */
function layerRecord(
	x: number,
	y: number,
	w: number,
	h: number,
	pixels: Array<[number, number, number, number]>,
	opacity = 255,
	hidden = false,
): { record: Uint8Array; data: Uint8Array } {
	const rec: number[] = [];
	const push32 = (n: number): void => {
		rec.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
	};
	const push16 = (n: number): void => {
		rec.push((n >> 8) & 0xff, n & 0xff);
	};
	push32(y);
	push32(x);
	push32(y + h);
	push32(x + w);
	push16(4); // -1,0,1,2
	const ids = [-1, 0, 1, 2];
	const planes = ids.map((id) => {
		const ch = id === -1 ? 3 : id;
		return Uint8Array.from(pixels.map((p) => p[ch] ?? 0));
	});
	planes.forEach((p, i) => {
		const id = ids[i] ?? 0;
		push16(id < 0 ? 0xffff : id);
		push32(2 + p.length);
	});
	rec.push(0x38, 0x42, 0x49, 0x4d, 0x6e, 0x6f, 0x72, 0x6d); // 8BIM norm
	rec.push(opacity, 0, hidden ? 0x02 : 0x00, 0);
	push32(0); // extra len
	const record = new Uint8Array(rec);
	const dataParts = planes.map((p) => concat(new Uint8Array([0, 0]), p));
	return { record, data: concat(...dataParts) };
}

/** Two-layer PSD: bottom blue 2x2, top red 1x1 at (0,0). Top record first. */
function layeredPsd(): Uint8Array {
	const top = layerRecord(0, 0, 1, 1, [[255, 0, 0, 255]]);
	const bottom = layerRecord(0, 0, 2, 2, [
		[0, 0, 255, 255],
		[0, 0, 255, 255],
		[0, 0, 255, 255],
		[0, 0, 255, 255],
	]);
	const records = concat(top.record, bottom.record);
	const infoBody = new Uint8Array(2 + records.length);
	new DataView(infoBody.buffer).setInt16(0, 2, false);
	infoBody.set(records, 2);
	const channelData = concat(top.data, bottom.data);
	const infoLen = infoBody.length + channelData.length;
	const layerSection = concat(
		u32(4 + infoLen),
		u32(infoLen),
		infoBody,
		channelData,
	);
	return concat(
		header(2, 2),
		u32(0),
		u32(0),
		layerSection,
		new Uint8Array([0, 0, 0, 0]),
	);
}

describe("Photoshop (.psd) Parser & Engine", () => {
	it("decodes a flat raw RGB composite", () => {
		const img = parsePsd(
			flatPsd(2, 1, [
				[255, 0, 0],
				[0, 255, 0],
			]),
		);
		expect([img.width, img.height]).toEqual([2, 1]);
		expect(img.layerCount).toBe(0);
		expect(Array.from(img.rgba.slice(0, 8))).toEqual([
			255, 0, 0, 255, 0, 255, 0, 255,
		]);
	});

	it("composites top-over-bottom in file order", () => {
		const img = parsePsd(layeredPsd());
		expect(img.layerCount).toBe(2);
		// (0,0): red on top; (1,0): blue showing through.
		expect(Array.from(img.rgba.slice(0, 4))).toEqual([255, 0, 0, 255]);
		expect(Array.from(img.rgba.slice(4, 8))).toEqual([0, 0, 255, 255]);
	});

	it("decodes RLE PackBits rows", () => {
		const w = 4;
		const row = packBitsLiteral([10, 10, 10, 10]);
		const lens = new Uint8Array([0, row.length, 0, row.length, 0, row.length]);
		const planes = concat(new Uint8Array([0, 1]), lens, row, row, row);
		const file = concat(header(w, 1), u32(0), u32(0), u32(0), planes);
		const img = parsePsd(file);
		expect(Array.from(img.rgba.slice(0, 4))).toEqual([10, 10, 10, 255]);
	});

	it("emits a valid PNG through the engine", async () => {
		expect(await psdToPngEngine.probe()).toBe(true);
		const file = flatPsd(1, 1, [[1, 2, 3]]);
		const out = await convertPsdToPng(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const png = new Uint8Array(out);
		expect([png[0], png[1]]).toEqual([0x89, 0x50]);
		// Sanity: our encoder decodes its own output shape.
		expect(png.length).toBeGreaterThan(20);
		expect(
			encodeRgbaToPng(1, 1, new Uint8Array([1, 2, 3, 255])).length,
		).toBeGreaterThan(0);
	});

	it("refuses non-PSD, CMYK and deep files specifically", () => {
		expect(() => parsePsd(new Uint8Array(40).fill(7))).toThrow("8BPS");
		const cmyk = flatPsd(1, 1, [[0, 0, 0]]);
		cmyk[25] = 4;
		expect(() => parsePsd(cmyk)).toThrow("CMYK");
		const deep = flatPsd(1, 1, [[0, 0, 0]]);
		deep[23] = 16;
		expect(() => parsePsd(deep)).toThrow("8-bit");
	});
});
