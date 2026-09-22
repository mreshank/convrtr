import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { matToZipEngine } from "../index";
import { parseMatWorkspace } from "../parser";

function tag(type: number, payload: Uint8Array): Uint8Array {
	const out = new Uint8Array(
		8 + payload.length + ((8 - (payload.length % 8)) % 8),
	);
	const v = new DataView(out.buffer);
	v.setUint32(0, type, true);
	v.setUint32(4, payload.length, true);
	out.set(payload, 8);
	return out;
}

function u32le(...vals: number[]): Uint8Array {
	const out = new Uint8Array(vals.length * 4);
	const v = new DataView(out.buffer);
	vals.forEach((n, i) => {
		v.setUint32(i * 4, n, true);
	});
	return out;
}

function f64le(...vals: number[]): Uint8Array {
	const out = new Uint8Array(vals.length * 8);
	const v = new DataView(out.buffer);
	vals.forEach((n, i) => {
		v.setFloat64(i * 8, n, true);
	});
	return out;
}

function matrixEl(
	name: string,
	rows: number,
	cols: number,
	data: Uint8Array,
	dataType = 9,
	classId = 6,
): Uint8Array {
	const parts = [
		tag(6, u32le(0, classId)),
		tag(5, u32le(rows, cols)),
		tag(1, new TextEncoder().encode(name)),
		tag(dataType, data),
	];
	const body = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	let at = 0;
	for (const p of parts) {
		body.set(p, at);
		at += p.length;
	}
	const out = new Uint8Array(8 + body.length);
	new DataView(out.buffer).setUint32(0, 14, true);
	new DataView(out.buffer).setUint32(4, body.length, true);
	out.set(body, 8);
	return out;
}

function workspace(): Uint8Array {
	const head = new Uint8Array(128);
	new TextEncoder().encodeInto("MATLAB 5.0 MAT-file", head.subarray(0));
	head[124] = 0;
	head[125] = 1;
	head[126] = 0x4d;
	head[127] = 0x49;
	// A = [1 3; 2 4] stored column-major [1,2,3,4]
	const a = matrixEl("A", 2, 2, f64le(1, 2, 3, 4));
	// s = 'hi' as char (uint16)
	const chars = new Uint8Array([0x68, 0, 0x69, 0]);
	const charParts = [
		tag(6, u32le(0, 4)),
		tag(5, u32le(1, 2)),
		tag(1, new TextEncoder().encode("s")),
		tag(17, chars),
	];
	const charBody = new Uint8Array(charParts.reduce((x, p) => x + p.length, 0));
	let at = 0;
	for (const p of charParts) {
		charBody.set(p, at);
		at += p.length;
	}
	const s = new Uint8Array(8 + charBody.length);
	new DataView(s.buffer).setUint32(0, 14, true);
	new DataView(s.buffer).setUint32(4, charBody.length, true);
	s.set(charBody, 8);
	// sp = sparse (refused, lands in README)
	const sp = matrixEl("sp", 2, 2, f64le(1, 0, 0, 1), 9, 5);
	return concatAll([head, a, s, sp]);
}

function concatAll(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((x, p) => x + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

describe("MATLAB v5 (.mat) Parser & Engine", () => {
	it("reads numeric and char variables, refusing sparse honestly", () => {
		const { variables, skipped } = parseMatWorkspace(workspace());

		const names = variables.map((v) => v.name).sort();
		expect(names).toEqual(["A", "s"]);
		const a = variables.find((v) => v.name === "A");
		expect(a?.dims).toEqual([2, 2]);
		expect(a?.values).toEqual([1, 2, 3, 4]);
		const s = variables.find((v) => v.name === "s");
		expect(s?.values).toEqual(["h", "i"]);
		expect(skipped.join(" ")).toContain("sparse");
	});

	it("packs CSVs plus README through the engine", async () => {
		expect(await matToZipEngine.probe()).toBe(true);
		const file = workspace();
		const out = await matToZipEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		const entries = fflate.unzipSync(new Uint8Array(out));
		expect(Object.keys(entries).sort()).toEqual([
			"A.csv",
			"_README.txt",
			"s.csv",
		]);
		const aCsv = new TextDecoder().decode(entries["A.csv"]);
		expect(aCsv).toContain("A_1,A_2");
		expect(aCsv).toContain("1,3");
		expect(aCsv).toContain("2,4");
	});

	it("rejects non-MATLAB files", () => {
		const bad = new Uint8Array(200).fill(7);
		expect(() => parseMatWorkspace(bad)).toThrow("MATLAB");
	});
});
