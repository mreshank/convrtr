import { describe, expect, it } from "vitest";
import { xptToCsvEngine } from "../index";
import { ibmToIeee, parseXpt } from "../parser";

function card(s: string): Uint8Array {
	return new TextEncoder().encode(s.padEnd(80, " ").slice(0, 80));
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

function ibmBytes(value: number): Uint8Array {
	// Reference encoder: value = 0.fraction(hex) × 16^exp.
	if (value === 0) return new Uint8Array(8);
	const sign = value < 0 ? 0x80 : 0;
	const abs = Math.abs(value);
	const exp16 = Math.floor(Math.log(abs) / Math.log(16)) + 1;
	const frac = Math.round(abs / 16 ** (exp16 - 6));
	const out = new Uint8Array(8);
	out[0] = sign | (exp16 + 64);
	out[1] = (frac >> 16) & 0xff;
	out[2] = (frac >> 8) & 0xff;
	out[3] = frac & 0xff;
	return out;
}

function namestr(
	ntype: number,
	len: number,
	name: string,
	label: string,
	format = "",
): Uint8Array {
	const out = new Uint8Array(140);
	const v = new DataView(out.buffer);
	const enc = new TextEncoder();
	v.setInt16(0, ntype, false);
	v.setInt16(4, len, false);
	enc.encodeInto(name.slice(0, 8).padEnd(8, " "), out.subarray(8));
	enc.encodeInto(label.slice(0, 40).padEnd(40, " "), out.subarray(16));
	enc.encodeInto(format.slice(0, 8).padEnd(8, " "), out.subarray(56));
	v.setInt16(58, 8, false);
	v.setInt16(64, 0, false);
	v.setInt32(66, 0, false);
	return out;
}

function buildXpt(): Uint8Array {
	const parts: Uint8Array[] = [
		card(
			"HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000  ",
		),
		card(
			"SAS     SAS     SASLIB  9.4     LSF 00000000XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
		),
		card(
			"16FEB26:10:07:55                                                      ",
		),
		card(
			"HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!!000000000000000001600000000",
		),
		card(
			"HEADER RECORD*******DSCRPTR HEADER RECORD!!!!!!!000000000000000000000000000000  ",
		),
		card(
			"HEADER RECORD*******DSCRPTR HEADER RECORD!!!!!!!000000000000000000000000000000  ",
		),
		card(
			"HEADER RECORD*******NAMESTR HEADER RECORD!!!!!!!0000000002                      ",
		),
	];
	const fields = concat(
		namestr(1, 8, "AGE", "Age", "BEST"),
		namestr(2, 10, "NAME", "Name", ""),
	);
	const paddedLen = Math.ceil(fields.length / 80) * 80;
	const padded = new Uint8Array(paddedLen).fill(32);
	padded.set(fields, 0);
	parts.push(padded);
	parts.push(
		card(
			"HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000  ",
		),
	);

	// Row: age 30 (IBM), name "Ana" padded to 10.
	const row = new Uint8Array(18).fill(32);
	row.set(ibmBytes(30), 0);
	new TextEncoder().encodeInto("Ana", row.subarray(8));
	// Row 2: missing age ('.' + zero tail, the real sysmiss encoding), name blank.
	const row2 = new Uint8Array(18).fill(32);
	row2[0] = 0x2e;
	row2.fill(0, 1, 8);
	parts.push(row, row2);
	// Real XPORT data runs to card-padded EOF; pad the last card.
	const dataLen = 36;
	const padCards = Math.ceil(dataLen / 80) * 80 - dataLen;
	parts.push(new Uint8Array(padCards).fill(32));
	return concat(...parts);
}

describe("SAS XPORT (.xpt) Parser & Engine", () => {
	it("converts IBM floats exactly, including zero", () => {
		expect(ibmToIeee(new Uint8Array(8))).toBe(0);
		// Absolute textbook case: 30.0 == 42 1E 00 00 00 00 00 00.
		expect(Array.from(ibmBytes(30))).toEqual([0x42, 0x1e, 0, 0, 0, 0, 0, 0]);
		expect(ibmToIeee(ibmBytes(30))).toBe(30);
		for (const n of [-12.5, 0.1, 50000.5, 1e10]) {
			const rel = Math.abs((ibmToIeee(ibmBytes(n)) - n) / n);
			expect(rel).toBeLessThan(1e-6);
		}
	});

	it("reads headers, rows, missings and labels", () => {
		const { columns, rows } = parseXpt(buildXpt());
		expect(columns.map((c) => c.name)).toEqual(["AGE", "NAME"]);
		expect(columns[0]?.label).toBe("Age");
		expect(rows).toEqual([
			[30, "Ana"],
			[".", ""],
		]);
	});

	it("emits CSV through the engine", async () => {
		expect(await xptToCsvEngine.probe()).toBe(true);
		const file = buildXpt();
		const out = await xptToCsvEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		const csv = new TextDecoder().decode(out);
		expect(csv).toContain("AGE,NAME");
		expect(csv).toContain("30,Ana");
	});

	it("refuses non-XPORT and v8 files", () => {
		expect(() =>
			parseXpt(new TextEncoder().encode("garbage".padEnd(100, " "))),
		).toThrow("LIBRARY header");
		const v8 = buildXpt();
		v8.set(new TextEncoder().encode("HEADER RECORD*******LIBV8"), 0);
		expect(() => parseXpt(v8)).toThrow("LIBV8");
	});
});
