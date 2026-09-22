import { zipSync } from "fflate";

// MATLAB v5 data types.
const MI = {
	INT8: 1,
	UINT8: 2,
	INT16: 3,
	UINT16: 4,
	INT32: 5,
	UINT32: 6,
	SINGLE: 7,
	DOUBLE: 9,
	INT64: 12,
	UINT64: 13,
	MATRIX: 14,
	UTF8: 16,
	UTF16: 17,
	UTF32: 18,
} as const;

const NUMERIC_CLASSES = new Set([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

export interface MatVariable {
	name: string;
	className: string;
	dims: number[];
	kind: "numeric" | "char" | "logical";
	values: Array<string | number>;
}

class MatReader {
	off = 0;
	constructor(
		private readonly buf: Uint8Array,
		private readonly le: boolean,
	) {}
	get view(): DataView {
		return new DataView(
			this.buf.buffer,
			this.buf.byteOffset,
			this.buf.byteLength,
		);
	}
	u16(): number {
		const v = this.view.getUint16(this.off, this.le);
		this.off += 2;
		return v;
	}
	u32(): number {
		const v = this.view.getUint32(this.off, this.le);
		this.off += 4;
		return v;
	}
	take(n: number): Uint8Array {
		const s = this.buf.subarray(this.off, this.off + n);
		this.off += n;
		return s;
	}
	skip(n: number): void {
		this.off += n;
	}
	pad(): void {
		const over = this.off % 8;
		if (over !== 0) this.off += 8 - over;
	}
	/** Reads one data-element tag, handling the small-data format. */
	tag(): { type: number; data: Uint8Array } {
		const a = this.u32();
		if (a >> 16 !== 0) {
			// Small format: [u16 size][u16 type] + 4 payload bytes.
			const size = a & 0xffff;
			const type = (a >> 16) & 0xffff;
			const data = this.take(4).subarray(0, size);
			return { type, data };
		}
		const size = this.u32();
		const data = this.take(size);
		this.pad();
		return { type: a, data };
	}
}

function readNumericArray(
	bytes: Uint8Array,
	le: boolean,
	type: number,
	count: number,
): Array<string | number> {
	const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const out: Array<string | number> = [];
	const push = (n: string | number): void => {
		out.push(n);
	};
	const get = (i: number, size: number): number | bigint => {
		const o = i * size;
		switch (type) {
			case MI.INT8:
				return v.getInt8(o);
			case MI.UINT8:
				return v.getUint8(o);
			case MI.INT16:
				return v.getInt16(o, le);
			case MI.UINT16:
				return v.getUint16(o, le);
			case MI.INT32:
				return v.getInt32(o, le);
			case MI.UINT32:
				return v.getUint32(o, le);
			case MI.SINGLE:
				return v.getFloat32(o, le);
			case MI.DOUBLE:
				return v.getFloat64(o, le);
			case MI.INT64:
				return v.getBigInt64(o, le);
			case MI.UINT64:
				return v.getBigUint64(o, le);
			default:
				return 0;
		}
	};
	const sizeOf = (t: number): number =>
		t === MI.INT8 || t === MI.UINT8
			? 1
			: t === MI.INT16 || t === MI.UINT16
				? 2
				: t === MI.INT32 || t === MI.UINT32 || t === MI.SINGLE
					? 4
					: 8;
	const size = sizeOf(type);
	for (let i = 0; i < count; i++) {
		const n = get(i, size);
		push(typeof n === "bigint" ? n.toString() : n);
	}
	return out;
}

/**
 * Reads MATLAB v5 (`.mat`) workspaces into per-variable tables.
 *
 * Layout: 124-byte text + version + endian flag, then data elements —
 * miMATRIX holds array flags (class), dimensions, name, and real (+optional
 * imaginary) numeric payloads in column-major order. Supported: 2D real
 * numeric (all widths, int64 exact via BigInt strings), char vectors
 * (UTF-16/8), and logicals. Refused with named reasons: sparse, complex
 * (imaginary part), structs/cells/objects, N-D arrays, v4/v7.3 files.
 * Refusals land in a `_README.txt` alongside the CSVs so nothing vanishes
 * silently — the same honesty contract as the subtitle tools.
 */
export function parseMatWorkspace(fileBytes: Uint8Array): {
	variables: MatVariable[];
	skipped: string[];
} {
	if (fileBytes.length < 128) {
		throw new Error("Invalid MAT file: smaller than the 128-byte v5 header.");
	}
	const magic = new TextDecoder("ascii").decode(fileBytes.subarray(0, 116));
	if (!/MATLAB/i.test(magic)) {
		throw new Error("Not a MATLAB v5 .mat file (missing MATLAB header text).");
	}
	const endianTag = (fileBytes[126] ?? 0) * 256 + (fileBytes[127] ?? 0);
	const le = endianTag === 0x4d49;
	if (!le && endianTag !== 0x494d) {
		throw new Error("Unrecognised MAT byte order (expected MI/IM indicator).");
	}

	const reader = new MatReader(fileBytes.subarray(128), le);
	const variables: MatVariable[] = [];
	const skipped: string[] = [];

	while (reader.off + 8 <= fileBytes.length - 128) {
		let tag: { type: number; data: Uint8Array };
		try {
			tag = reader.tag();
		} catch {
			break;
		}
		if (tag.type === 0) break;
		if (tag.type !== MI.MATRIX) continue; // padding/unknown: skip by tag length
		try {
			const parsed = parseMatrix(tag.data, le);
			if (parsed) variables.push(parsed);
		} catch (e) {
			skipped.push(e instanceof Error ? e.message : "unknown variable skipped");
		}
	}

	if (variables.length === 0 && skipped.length === 0) {
		throw new Error(
			"No variables decoded: file may be v7.3 (HDF5) or corrupt.",
		);
	}
	return { variables, skipped };
}

function parseMatrix(data: Uint8Array, le: boolean): MatVariable | null {
	const r = new MatReader(data, le);
	const flagsTag = r.tag();
	const dimsTag = r.tag();
	const nameTag = r.tag();

	if (flagsTag.type !== MI.UINT32 || dimsTag.type !== MI.INT32) {
		throw new Error("Corrupt miMATRIX header.");
	}
	const fv = new DataView(
		flagsTag.data.buffer,
		flagsTag.data.byteOffset,
		flagsTag.data.byteLength,
	);
	const flags = fv.getUint32(0, le);
	const classId = fv.getUint32(4, le);
	const isLogical = (flags & 0x0200) !== 0;
	const dv = new DataView(
		dimsTag.data.buffer,
		dimsTag.data.byteOffset,
		dimsTag.data.byteLength,
	);
	const dims: number[] = [];
	for (let i = 0; i < dimsTag.data.length / 4; i++)
		dims.push(dv.getUint32(i * 4, le));
	const name =
		new TextDecoder("ascii").decode(nameTag.data).replace(/\0+$/g, "") ||
		"unnamed";

	if (dims.length !== 2)
		throw new Error(
			`"${name}": only 2-D arrays convert (has ${dims.length}-D).`,
		);
	const [rows = 0, cols = 0] = dims;
	if (rows === 0 || cols === 0) throw new Error(`"${name}": empty array.`);
	if (rows * cols > 5_000_000)
		throw new Error(`"${name}": exceeds the 5M-cell browser limit.`);

	const classNames: Record<number, string> = {
		4: "char",
		6: "double",
		7: "single",
		8: "int8",
		9: "uint8",
		10: "int16",
		11: "uint16",
		12: "int32",
		13: "uint32",
		14: "int64",
		15: "uint64",
	};
	if (classId === 5)
		throw new Error(`"${name}": sparse arrays are not supported.`);
	if (!NUMERIC_CLASSES.has(classId) && classId !== 4) {
		throw new Error(
			`"${name}": ${classNames[classId] ?? `class ${classId}`} is not tabular.`,
		);
	}

	const realTag = r.tag();
	if (r.off < data.length) {
		// An imaginary part follows → complex numbers have no CSV cell.
		throw new Error(`"${name}": complex arrays are not supported.`);
	}

	const count = rows * cols;
	if (classId === 4) {
		// Char: UTF-16 (or 8-bit) code units, column-major.
		const units: number[] = [];
		const uv = new DataView(
			realTag.data.buffer,
			realTag.data.byteOffset,
			realTag.data.byteLength,
		);
		if (realTag.type === MI.UINT16 || realTag.type === MI.UTF16) {
			for (let i = 0; i < count; i++) units.push(uv.getUint16(i * 2, le));
		} else {
			for (let i = 0; i < count; i++) units.push(realTag.data[i] ?? 0);
		}
		const values: Array<string | number> = [];
		for (let c = 0; c < cols; c++) {
			for (let rr = 0; rr < rows; rr++) {
				values.push(String.fromCharCode(units[rr + c * rows] ?? 0));
			}
		}
		return { name, className: "char", dims, kind: "char", values };
	}

	const flat = readNumericArray(realTag.data, le, realTag.type, count);
	const values: Array<string | number> = [];
	for (let c = 0; c < cols; c++) {
		for (let rr = 0; rr < rows; rr++) {
			let v = flat[rr + c * rows] ?? 0;
			if (isLogical) v = v === 0 || v === "0" ? "false" : "true";
			values.push(v);
		}
	}
	return {
		name,
		className:
			(classNames[classId] ?? `class${classId}`) +
			(isLogical ? " (logical)" : ""),
		dims,
		kind: isLogical ? "logical" : "numeric",
		values,
	};
}

function csvCell(s: string | number): string {
	const t = typeof s === "number" ? String(s) : s;
	return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function convertMatToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Reading workspace...");
	const { variables, skipped } = parseMatWorkspace(new Uint8Array(input));
	onProgress?.(0.5, `Writing ${variables.length} variables...`);
	const entries: Record<string, Uint8Array> = {};
	for (const v of variables) {
		const [rows = 0, cols = 0] = v.dims;
		const head = v.kind === "char" ? "text" : v.name;
		const lines: string[] = [];
		if (v.kind !== "char")
			lines.push(
				Array.from({ length: cols }, (_, c) =>
					csvCell(`${head}_${c + 1}`),
				).join(","),
			);
		for (let rr = 0; rr < rows; rr++) {
			const row: Array<string | number> = [];
			for (let c = 0; c < cols; c++) row.push(v.values[rr + c * rows] ?? "");
			lines.push(row.map(csvCell).join(","));
		}
		entries[`${v.name}.csv`] = new TextEncoder().encode(
			`\uFEFF${lines.join("\n")}\n`,
		);
	}
	if (skipped.length > 0) {
		entries["_README.txt"] = new TextEncoder().encode(
			`Variables not converted (no silent drops):\n${skipped.map((s) => `- ${s}`).join("\n")}\n`,
		);
	}
	onProgress?.(0.85, "PACK");
	const zipped = zipSync(entries);
	onProgress?.(1.0, "COMPLETE");
	const buf = zipped.buffer.slice(
		zipped.byteOffset,
		zipped.byteOffset + zipped.byteLength,
	);
	return buf as ArrayBuffer;
}
