import { describe, expect, it } from "vitest";
import { dbfToCsvEngine } from "../index";
import { convertDbfToCsv } from "../parser";

function buildDbf(): Uint8Array {
	const enc = new TextEncoder();
	const fields: Array<{ name: string; type: string; len: number }> = [
		{ name: "NAME", type: "C", len: 20 },
		{ name: "POP", type: "N", len: 10 },
		{ name: "FOUNDED", type: "D", len: 8 },
		{ name: "CAPITAL", type: "L", len: 1 },
	];
	const headerLen = 32 + fields.length * 32 + 1;
	const recordLen = 1 + fields.reduce((a, f) => a + f.len, 0);
	const rows = [
		["Rome", "2873000", "19700101", "Y"],
		["Deleted Town", "0", "", "N"],
		["Oslo", "699000", "19700101", "Y"],
	];
	const out = new Uint8Array(headerLen + rows.length * recordLen);
	out[0] = 0x03;
	const v = new DataView(out.buffer);
	v.setUint32(4, rows.length, true);
	v.setUint16(8, headerLen, true);
	v.setUint16(10, recordLen, true);
	fields.forEach((f, i) => {
		const at = 32 + i * 32;
		enc.encodeInto(f.name, out.subarray(at));
		out[at + 11] = f.type.charCodeAt(0);
		out[at + 16] = f.len;
	});
	out[headerLen - 1] = 0x0d;
	rows.forEach((row, r) => {
		let at = headerLen + r * recordLen;
		out[at++] = r === 1 ? 0x2a : 0x20; // starred = deleted
		row.forEach((cell, c) => {
			const len = fields[c]?.len ?? 0;
			enc.encodeInto(cell.padEnd(len, " ").slice(0, len), out.subarray(at));
			at += len;
		});
	});
	return out;
}

describe("dBase (.dbf) Parser & Engine", () => {
	it("decodes typed cells and skips deleted records", () => {
		const file = buildDbf();
		const out = convertDbfToCsv(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const csv = new TextDecoder().decode(out);
		expect(csv).toContain("NAME,POP,FOUNDED,CAPITAL");
		expect(csv).toContain("Rome,2873000,1970-01-01,true");
		expect(csv).not.toContain("Deleted Town");
		expect(csv).toContain("Oslo,699000,1970-01-01,true");
	});

	it("runs through the engine", async () => {
		expect(await dbfToCsvEngine.probe()).toBe(true);
		const file = buildDbf();
		const out = await dbfToCsvEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		expect(new TextDecoder().decode(out)).toContain("Rome");
	});

	it("rejects truncated files", () => {
		expect(() =>
			convertDbfToCsv(new Uint8Array(10).buffer as ArrayBuffer),
		).toThrow("Truncated");
	});
});
