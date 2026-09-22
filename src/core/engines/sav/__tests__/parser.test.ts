import { describe, expect, it } from "vitest";
import { parseSav } from "../parser";

function u32le(n: number): Uint8Array {
	const b = new Uint8Array(4);
	new DataView(b.buffer).setUint32(0, n, true);
	return b;
}
function f64le(n: number): Uint8Array {
	const b = new Uint8Array(8);
	new DataView(b.buffer).setFloat64(0, n, true);
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
function padStr(s: string, len: number): Uint8Array {
	const out = new Uint8Array(len).fill(32);
	new TextEncoder().encodeInto(s.slice(0, len), out.subarray(0));
	return out;
}

function varRecord(opts: {
	type: number;
	name: string;
	label?: string;
	print?: number;
	missing?: number[];
}): Uint8Array {
	const parts: Uint8Array[] = [
		u32le(2),
		u32le(opts.type),
		u32le(opts.label ? 1 : 0),
		u32le(
			opts.missing ? (opts.missing.length <= 3 ? opts.missing.length : 0) : 0,
		),
		u32le(opts.print ?? (5 << 16) | (8 << 8)),
		u32le((5 << 16) | (8 << 8)),
		padStr(opts.name, 8),
	];
	if (opts.label) {
		const lb = new TextEncoder().encode(opts.label);
		const padded = new Uint8Array(Math.ceil(lb.length / 4) * 4);
		padded.set(lb, 0);
		parts.push(u32le(lb.length), padded);
	}
	if (opts.missing) {
		for (const m of opts.missing) parts.push(f64le(m));
	}
	return concat(...parts);
}

function buildSav(): Uint8Array {
	const enc = new TextEncoder();
	const head = new Uint8Array(176);
	enc.encodeInto("$FL2", head.subarray(0));
	enc.encodeInto("@(#) SPSS DATA FILE test", head.subarray(4));
	const hv = new DataView(head.buffer);
	hv.setInt32(64, 2, true); // layout
	hv.setInt32(68, -1, true); // ncases unknown
	hv.setInt32(72, 1, true); // bytecode compression
	hv.setInt32(76, 0, true);
	hv.setInt32(80, 4, true); // 4 vars
	hv.setFloat64(84, 100.0, true); // bias
	enc.encodeInto("01 Jan 26", head.subarray(92));
	enc.encodeInto("00:00:00", head.subarray(101));
	enc.encodeInto("test", head.subarray(109));

	// age numeric, name str10 (2 units), vote numeric w/ value labels + missing, day DATE.
	const vars = concat(
		varRecord({ type: 0, name: "age", label: "Age" }),
		varRecord({ type: 10, name: "name" }),
		varRecord({ type: 0, name: "vote", missing: [99] }),
		varRecord({ type: 0, name: "day", print: (20 << 16) | (11 << 8) }),
	);
	// Value labels: vote {1: yes}.
	const vlVal = concat(
		u32le(3),
		u32le(1),
		f64le(1),
		new Uint8Array([3]),
		enc.encode("yes"),
	);
	const vlApp = concat(u32le(4), u32le(1), u32le(3));
	const term = concat(u32le(999), u32le(0));

	// Data: 2 cases × 5 units (age, name×2, vote, day).
	// Row 0: age 30, name "Ana", vote 1, day 0 (= 1582-10-14).
	// Row 1: sysmiss, spaces, vote 99 (discrete miss), day 1.
	const ops = (codes: number[]): Uint8Array => new Uint8Array(codes);
	const raw = (nums: number[]): Uint8Array => {
		const out = new Uint8Array(nums.length * 8);
		const v = new DataView(out.buffer);
		nums.forEach((n, i) => {
			v.setFloat64(i * 8, n, true);
		});
		return out;
	};
	const nameAna = padStr("Ana", 8);
	const nameBlank = padStr("", 8);
	const data = concat(
		ops([130, 253, 253, 253, 253, 0, 0, 0]),
		nameAna,
		nameBlank,
		raw([1]),
		raw([0]),
		ops([255, 254, 254, 199, 253, 0, 0, 0]),
		raw([86400]),
	);
	return concat(head, vars, vlVal, vlApp, term, data);
}

describe("SPSS (.sav) Parser", () => {
	it("decodes bytecode data, labels, missings, dates and value maps", () => {
		const table = parseSav(buildSav());
		expect(table.columns.map((c) => c.name)).toEqual([
			"age",
			"name",
			"vote",
			"day",
		]);
		expect(table.columns[0]?.label).toBe("Age");
		expect(table.columns[3]?.format).toBe("DATE11.0");
		expect(table.rows).toEqual([
			[30, "Ana", 1, "1582-10-14"],
			[".", null, ".", "1582-10-15"],
		]);
		expect(table.labels).toEqual([
			{ variable: "vote", code: "1", label: "yes" },
		]);
	});

	it("rejects non-SPSS input", () => {
		expect(() => parseSav(new Uint8Array(200).fill(7))).toThrow("$FL2");
	});
});
