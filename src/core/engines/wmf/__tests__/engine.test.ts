import { describe, expect, it } from "vitest";
import { convertWmfToSvg, parseWmf, wmfToSvgEngine } from "../index";

function createMockWmf(options: {
	hasPlaceableHeader?: boolean;
	addRectangle?: boolean;
	addLine?: boolean;
	addPolyline?: boolean;
	addPolygon?: boolean;
	addText?: boolean;
}): Uint8Array {
	const records: Uint8Array[] = [];

	// Optional: SETWINDOWORG (func 0x020B, size 5 words)
	{
		const buf = new Uint8Array(10);
		const v = new DataView(buf.buffer);
		v.setUint32(0, 5, true); // 5 words = 10 bytes
		v.setUint16(4, 0x020b, true); // META_SETWINDOWORG
		v.setInt16(6, 0, true); // y
		v.setInt16(8, 0, true); // x
		records.push(buf);
	}

	// Optional: SETWINDOWEXT (func 0x020C, size 5 words)
	{
		const buf = new Uint8Array(10);
		const v = new DataView(buf.buffer);
		v.setUint32(0, 5, true); // 5 words = 10 bytes
		v.setUint16(4, 0x020c, true); // META_SETWINDOWEXT
		v.setInt16(6, 400, true); // cy (height)
		v.setInt16(8, 500, true); // cx (width)
		records.push(buf);
	}

	if (options.addLine) {
		// MOVETO (func 0x0214, size 5 words)
		{
			const buf = new Uint8Array(10);
			const v = new DataView(buf.buffer);
			v.setUint32(0, 5, true);
			v.setUint16(4, 0x0214, true);
			v.setInt16(6, 10, true); // y
			v.setInt16(8, 20, true); // x
			records.push(buf);
		}
		// LINETO (func 0x0213, size 5 words)
		{
			const buf = new Uint8Array(10);
			const v = new DataView(buf.buffer);
			v.setUint32(0, 5, true);
			v.setUint16(4, 0x0213, true);
			v.setInt16(6, 100, true); // y
			v.setInt16(8, 150, true); // x
			records.push(buf);
		}
	}

	if (options.addRectangle) {
		// RECTANGLE (func 0x041B, size 7 words = 14 bytes)
		// params: bottom, right, top, left
		const buf = new Uint8Array(14);
		const v = new DataView(buf.buffer);
		v.setUint32(0, 7, true);
		v.setUint16(4, 0x041b, true);
		v.setInt16(6, 200, true); // bottom
		v.setInt16(8, 300, true); // right
		v.setInt16(10, 50, true); // top
		v.setInt16(12, 50, true); // left
		records.push(buf);
	}

	if (options.addPolyline) {
		// POLYLINE (func 0x0325, size 4 + count*2 words)
		const count = 3;
		const words = 4 + count * 2;
		const buf = new Uint8Array(words * 2);
		const v = new DataView(buf.buffer);
		v.setUint32(0, words, true);
		v.setUint16(4, 0x0325, true);
		v.setInt16(6, count, true);
		// pt 0: (10, 10)
		v.setInt16(8, 10, true);
		v.setInt16(10, 10, true);
		// pt 1: (30, 40)
		v.setInt16(12, 30, true);
		v.setInt16(14, 40, true);
		// pt 2: (60, 20)
		v.setInt16(16, 60, true);
		v.setInt16(18, 20, true);
		records.push(buf);
	}

	if (options.addPolygon) {
		// POLYGON (func 0x0324, size 4 + count*2 words)
		const count = 3;
		const words = 4 + count * 2;
		const buf = new Uint8Array(words * 2);
		const v = new DataView(buf.buffer);
		v.setUint32(0, words, true);
		v.setUint16(4, 0x0324, true);
		v.setInt16(6, count, true);
		v.setInt16(8, 0, true);
		v.setInt16(10, 0, true);
		v.setInt16(12, 50, true);
		v.setInt16(14, 0, true);
		v.setInt16(16, 25, true);
		v.setInt16(18, 50, true);
		records.push(buf);
	}

	if (options.addText) {
		// TEXTOUT (func 0x0521)
		const str = "Convrtr";
		const strLen = str.length;
		const strAligned = strLen + (strLen % 2);
		const totalBytes = 6 + 2 + strAligned + 4;
		const words = totalBytes / 2;
		const buf = new Uint8Array(totalBytes);
		const v = new DataView(buf.buffer);
		v.setUint32(0, words, true);
		v.setUint16(4, 0x0521, true);
		v.setInt16(6, strLen, true);
		for (let i = 0; i < strLen; i++) {
			buf[8 + i] = str.charCodeAt(i);
		}
		const coordOffset = 8 + strAligned;
		v.setInt16(coordOffset, 25, true); // y
		v.setInt16(coordOffset + 2, 75, true); // x
		records.push(buf);
	}

	// META_EOF (func 0x0000, size 3 words = 6 bytes)
	{
		const buf = new Uint8Array(6);
		const v = new DataView(buf.buffer);
		v.setUint32(0, 3, true);
		v.setUint16(4, 0x0000, true);
		records.push(buf);
	}

	const recordsTotalBytes = records.reduce((acc, r) => acc + r.length, 0);
	const headerOffset = options.hasPlaceableHeader ? 22 : 0;
	const totalSize = headerOffset + 18 + recordsTotalBytes;
	const out = new Uint8Array(totalSize);
	const view = new DataView(out.buffer);

	if (options.hasPlaceableHeader) {
		// Key: 0x9AC6CDD7
		view.setUint32(0, 0x9ac6cdd7, true);
		view.setUint16(4, 0, true); // handle
		view.setInt16(6, 0, true); // left
		view.setInt16(8, 0, true); // top
		view.setInt16(10, 800, true); // right
		view.setInt16(12, 600, true); // bottom
		view.setUint16(14, 1440, true); // inch
		view.setUint32(16, 0, true); // reserved
		view.setUint16(20, 0, true); // checksum
	}

	// Standard header (18 bytes = 9 words)
	view.setUint16(headerOffset, 1, true); // fileType
	view.setUint16(headerOffset + 2, 9, true); // headerSize
	view.setUint16(headerOffset + 4, 0x0300, true); // version 3.0
	view.setUint32(headerOffset + 6, totalSize / 2, true); // size in words
	view.setUint16(headerOffset + 10, 1, true); // numOfObjects
	view.setUint32(headerOffset + 12, 64, true); // maxRecordSize
	view.setUint16(headerOffset + 16, 0, true); // numOfParams

	let curOffset = headerOffset + 18;
	for (const r of records) {
		out.set(r, curOffset);
		curOffset += r.length;
	}

	return out;
}

describe("wmf parser and SVG engine", () => {
	it("parses placeable WMF files with geometry and emits SVG", () => {
		const wmfBytes = createMockWmf({
			hasPlaceableHeader: true,
			addLine: true,
			addRectangle: true,
			addPolyline: true,
			addPolygon: true,
			addText: true,
		});

		const doc = parseWmf(wmfBytes);
		expect(doc.bounds.width).toBe(800);
		expect(doc.bounds.height).toBe(600);
		expect(doc.elementCount).toBeGreaterThanOrEqual(4);
		expect(doc.svg).toContain("<svg");
		expect(doc.svg).toContain("<line");
		expect(doc.svg).toContain("<rect");
		expect(doc.svg).toContain("<polyline");
		expect(doc.svg).toContain("<polygon");
		expect(doc.svg).toContain("Convrtr");
	});

	it("parses standard non-placeable WMF with window extents", () => {
		const wmfBytes = createMockWmf({
			hasPlaceableHeader: false,
			addLine: true,
			addRectangle: true,
		});

		const doc = parseWmf(wmfBytes);
		expect(doc.bounds.width).toBe(500);
		expect(doc.bounds.height).toBe(400);
		expect(doc.svg).toContain('viewBox="0 0 500 400"');
		expect(doc.svg).toContain("<line");
		expect(doc.svg).toContain("<rect");
	});

	it("converts WMF to SVG via convertWmfToSvg", () => {
		const wmfBytes = createMockWmf({
			hasPlaceableHeader: true,
			addLine: true,
		});

		const svgBuf = convertWmfToSvg(
			wmfBytes.buffer.slice(0) as unknown as ArrayBuffer,
		);
		const svgText = new TextDecoder().decode(svgBuf);
		expect(svgText).toContain("<svg");
		expect(svgText).toContain("<line");
	});

	it("executes wmfToSvgEngine with progress callback", async () => {
		const wmfBytes = createMockWmf({
			hasPlaceableHeader: true,
			addRectangle: true,
		});

		const progressUpdates: number[] = [];
		const res = await wmfToSvgEngine.run(
			wmfBytes.buffer.slice(0) as unknown as ArrayBuffer,
			{},
			(ratio: number, _phase: string) => {
				progressUpdates.push(ratio);
			},
		);

		expect(progressUpdates.length).toBeGreaterThan(0);
		const svgText = new TextDecoder().decode(res);
		expect(svgText).toContain("<svg");
		expect(svgText).toContain("<rect");
	});

	it("throws on truncated buffer", () => {
		const truncated = new Uint8Array([0x01, 0x02, 0x03]);
		expect(() => parseWmf(truncated)).toThrow(/Invalid WMF file/);
	});
});
