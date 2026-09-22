import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { shpToGeoJsonEngine } from "../index";
import { convertShpZipToGeoJson } from "../parser";

function buildShp(
	geoms: Array<{ type: "point" | "poly"; pts: number[] }>,
): Uint8Array {
	const parts: Uint8Array[] = [];
	const push = (u: Uint8Array) => parts.push(u);
	const u32be = (n: number): Uint8Array => {
		const b = new Uint8Array(4);
		new DataView(b.buffer).setUint32(0, n, false);
		return b;
	};
	const u32le = (n: number): Uint8Array => {
		const b = new Uint8Array(4);
		new DataView(b.buffer).setUint32(0, n, true);
		return b;
	};
	const f64le = (n: number): Uint8Array => {
		const b = new Uint8Array(8);
		new DataView(b.buffer).setFloat64(0, n, true);
		return b;
	};

	const header = new Uint8Array(100);
	header.set(u32be(9994), 0);
	header.set(u32le(1000), 28);
	const records: Uint8Array[] = [];
	let recNo = 1;
	for (const g of geoms) {
		let content: Uint8Array;
		if (g.type === "point") {
			content = new Uint8Array(4 + 16);
			content.set(u32le(1), 0);
			content.set(f64le(g.pts[0] ?? 0), 4);
			content.set(f64le(g.pts[1] ?? 0), 12);
		} else {
			const n = g.pts.length / 2;
			content = new Uint8Array(4 + 32 + 4 + 4 + 4 + n * 16);
			content.set(u32le(5), 0);
			content.set(f64le(-180), 4);
			content.set(f64le(-90), 12);
			content.set(f64le(180), 20);
			content.set(f64le(90), 28);
			content.set(u32le(1), 36);
			content.set(u32le(n), 40);
			content.set(u32le(0), 44);
			for (let i = 0; i < n; i++) {
				content.set(f64le(g.pts[i * 2] ?? 0), 48 + i * 16);
				content.set(f64le(g.pts[i * 2 + 1] ?? 0), 56 + i * 16);
			}
		}
		const recHead = new Uint8Array(8);
		recHead.set(u32be(recNo++), 0);
		recHead.set(u32be(content.length / 2), 4);
		records.push(recHead, content);
	}
	const total = 100 + records.reduce((a, r) => a + r.length, 0);
	const out = new Uint8Array(total);
	out.set(header, 0);
	let at = 100;
	for (const r of records) {
		out.set(r, at);
		at += r.length;
	}
	push(new Uint8Array(0));
	return out;
}

function buildDbf(names: string[], rows: string[][]): Uint8Array {
	const enc = new TextEncoder();
	const headerLen = 32 + names.length * 32 + 1;
	const recordLen = 1 + names.length * 20;
	const out = new Uint8Array(headerLen + rows.length * recordLen);
	out[0] = 0x03;
	const v = new DataView(out.buffer);
	v.setUint32(4, rows.length, true);
	v.setUint16(8, headerLen, true);
	v.setUint16(10, recordLen, true);
	names.forEach((n, i) => {
		const at = 32 + i * 32;
		enc.encodeInto(n.slice(0, 10), out.subarray(at));
		out[at + 11] = 0x43; // 'C'
		out[at + 16] = 20;
	});
	out[headerLen - 1] = 0x0d;
	rows.forEach((row, r) => {
		let at = headerLen + r * recordLen;
		out[at++] = 0x20;
		row.forEach((cell) => {
			enc.encodeInto(cell.slice(0, 20).padEnd(20, " "), out.subarray(at));
			at += 20;
		});
	});
	return out;
}

function zipped(files: Record<string, Uint8Array>): Uint8Array {
	return fflate.zipSync(files);
}

describe("Shapefile set Parser & Engine", () => {
	it("joins point+polygon geometry with dbf attributes", () => {
		const shp = buildShp([
			{ type: "point", pts: [12.5, 41.9] },
			{ type: "poly", pts: [0, 0, 1, 0, 1, 1, 0, 0] },
		]);
		const dbf = buildDbf(["NAME"], [["Rome"], ["Park"]]);
		const out = convertShpZipToGeoJson(
			zipped({ "city.shp": shp, "city.dbf": dbf }),
			() => {},
		);
		const geo = JSON.parse(new TextDecoder().decode(out)) as {
			type: string;
			features: Array<{
				geometry: { type: string };
				properties: Record<string, string>;
			}>;
		};
		expect(geo.type).toBe("FeatureCollection");
		expect(geo.features).toHaveLength(2);
		expect(geo.features[0]?.geometry.type).toBe("Point");
		expect(geo.features[0]?.properties.NAME).toBe("Rome");
		expect(geo.features[1]?.geometry.type).toBe("Polygon");
		expect(geo.features[1]?.properties.NAME).toBe("Park");
	});

	it("works geometry-only when the dbf is absent", async () => {
		expect(await shpToGeoJsonEngine.probe()).toBe(true);
		const shp = buildShp([{ type: "point", pts: [0, 0] }]);
		const zip = zipped({ "a.shp": shp });
		const out = await shpToGeoJsonEngine.run(
			zip.buffer.slice(
				zip.byteOffset,
				zip.byteOffset + zip.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		const geo = JSON.parse(new TextDecoder().decode(out)) as {
			features: unknown[];
		};
		expect(geo.features).toHaveLength(1);
	});

	it("rejects non-archives and sets without .shp", () => {
		expect(() => convertShpZipToGeoJson(new Uint8Array(50).fill(9))).toThrow(
			"Invalid archive",
		);
		const noShp = zipped({ "a.dbf": buildDbf(["N"], [["x"]]) });
		expect(() => convertShpZipToGeoJson(noShp)).toThrow("no .shp");
	});
});
