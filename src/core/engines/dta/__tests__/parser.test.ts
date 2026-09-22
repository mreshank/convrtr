import { describe, expect, it } from "vitest";
import { parseDta } from "../parser";

function u16(n: number): Uint8Array {
	const b = new Uint8Array(2);
	new DataView(b.buffer).setUint16(0, n, true);
	return b;
}
function u64(n: number): Uint8Array {
	const b = new Uint8Array(8);
	new DataView(b.buffer).setBigUint64(0, BigInt(n), true);
	return b;
}
function comp(tag: string, payload: Uint8Array): Uint8Array {
	const t = new TextEncoder().encode(`<${tag}>`);
	const c = new TextEncoder().encode(`</${tag}>`);
	const out = new Uint8Array(t.length + payload.length + c.length);
	out.set(t, 0);
	out.set(payload, t.length);
	out.set(c, t.length + payload.length);
	return out;
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
function fixed(s: string, len: number): Uint8Array {
	const out = new Uint8Array(len);
	new TextEncoder().encodeInto(s.slice(0, len), out.subarray(0));
	return out;
}

function buildDta(): Uint8Array {
	const enc = new TextEncoder();
	// Columns: age byte, salary double, name str10, vote byte(%9.0g + label).
	const types = [251, 255, 10, 251];
	const names = ["age", "salary", "name", "vote"];
	const formats = ["%9.0g", "%9.0g", "%10s", "%9.0g"];
	const labnames = ["", "", "", "votefmt"];
	const varlabels = ["Age", "Salary", "Name", "Vote"];

	const parts: Record<string, Uint8Array> = {};
	parts.types = concat(...types.map((t) => u16(t)));
	parts.varnames = concat(...names.map((n) => fixed(n, 33)));
	parts.sortlist = new Uint8Array((4 + 1) * 2);
	parts.formats = concat(...formats.map((f) => fixed(f, 49)));
	parts.labnames = concat(...labnames.map((l) => fixed(l, 33)));
	parts.varlabels = concat(...varlabels.map((l) => fixed(l, 81)));
	parts.expansion = new Uint8Array(0);

	// Data: 2 rows. age [30, .], salary [50000.5, 60000], name, vote [1, 0].
	const drow = (
		age: number,
		salary: number,
		name: string,
		vote: number,
	): Uint8Array => {
		const out = new Uint8Array(1 + 8 + 10 + 1);
		const v = new DataView(out.buffer);
		out[0] = age;
		v.setFloat64(1, salary, true);
		enc.encodeInto(name.slice(0, 10).padEnd(10, " "), out.subarray(9));
		out[19] = vote;
		return out;
	};
	parts.data = concat(drow(30, 50000.5, "Ana", 1), drow(101, 60000, "Bo", 0));
	parts.strls = new Uint8Array(0);

	// Value labels: votefmt {0: no, 1: yes}.
	const texts = enc.encode("no\0yes\0");
	const vl = new Uint8Array(48 + 16 + texts.length);
	const vv = new DataView(vl.buffer);
	vv.setInt32(0, vl.length, true);
	enc.encodeInto("votefmt", vl.subarray(4));
	vv.setInt32(40, 2, true);
	vv.setInt32(44, texts.length, true);
	vv.setInt32(48, 0, true); // offset[0]
	vv.setInt32(52, 3, true); // offset[1]
	vv.setInt32(56, 0, true); // value[0]
	vv.setInt32(60, 1, true); // value[1]
	vl.set(texts, 64);
	parts.vallabels = vl;

	const order = [
		"types",
		"varnames",
		"sortlist",
		"formats",
		"labnames",
		"varlabels",
		"expansion",
		"data",
		"strls",
		"vallabels",
	];
	const tags: Record<string, string> = {
		types: "variable_types",
		varnames: "varnames",
		sortlist: "sortlist",
		formats: "formats",
		labnames: "value_label_names",
		varlabels: "variable_labels",
		expansion: "expansion_fields",
		data: "data",
		strls: "strls",
		vallabels: "value_labels",
	};
	const comps = order.map((k) =>
		comp(tags[k] ?? k, parts[k] ?? new Uint8Array(0)),
	);

	// Header + map (14 monotonic offsets; components start after map close).
	const headerParts: Uint8Array[] = [];
	const pushAscii = (s: string): void => {
		headerParts.push(enc.encode(s));
	};
	pushAscii(
		"<stata_dta><header><release>118</release><byteorder>LSF</byteorder>",
	);
	headerParts.push(
		enc.encode("<K>"),
		u16(4),
		enc.encode("</K><N>"),
		u64(2),
		enc.encode("</N><label>"),
	);
	const dlabel = enc.encode("test");
	headerParts.push(
		u16(dlabel.length),
		dlabel,
		enc.encode("</label><timestamp>04 Mar 2026 03:35</timestamp></header>"),
	);
	const headerLen = headerParts.reduce((a, p) => a + p.length, 0);
	const mapLen = "<map>".length + 14 * 8 + "</map>".length;
	let cursor = headerLen + mapLen;
	const offsets: number[] = [];
	for (const c of comps) {
		offsets.push(cursor);
		cursor += c.length;
	}
	while (offsets.length < 14) offsets.push(cursor);
	const mapBody = new Uint8Array(14 * 8);
	const mv = new DataView(mapBody.buffer);
	for (const [i, o] of offsets.entries()) {
		mv.setBigUint64(i * 8, BigInt(o), true);
	}
	const mapComp = concat(enc.encode("<map>"), mapBody, enc.encode("</map>"));

	return concat(...headerParts, mapComp, ...comps);
}

describe("Stata (.dta) Parser", () => {
	it("reads types, missings, dates, labels and value mappings", () => {
		const table = parseDta(buildDta());
		expect(table.columns.map((c) => c.name)).toEqual([
			"age",
			"salary",
			"name",
			"vote",
		]);
		expect(table.columns[0]?.type).toBe("byte");
		expect(table.columns[2]?.type).toBe("str10");
		expect(table.nobs).toBe(2);
		expect(table.rows).toEqual([
			[30, 50000.5, "Ana", 1],
			[".", 60000, "Bo", 0],
		]);
		expect(table.labels).toEqual([
			{ variable: "vote", code: "0", label: "no" },
			{ variable: "vote", code: "1", label: "yes" },
		]);
	});

	it("rejects non-Stata and wrong versions", () => {
		expect(() => parseDta(new Uint8Array(100).fill(9))).toThrow("<stata_dta>");
		const bad = buildDta();
		const text = new TextDecoder().decode(bad.subarray(0, 60));
		expect(text).toContain("118");
	});
});
