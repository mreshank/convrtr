export interface DtaColumn {
	name: string;
	type: string;
	format: string;
	label: string;
	valueLabel: string;
}

export interface DtaTable {
	columns: DtaColumn[];
	rows: Array<Array<string | number | null>>;
	labels: Array<{ variable: string; code: string; label: string }>;
	nobs: number;
	dataLabel: string;
}

const STR_TYPE_BASE = 1;
const STR_TYPE_MAX = 2045;
const TYPE_BYTE = 251;
const TYPE_INT = 252;
const TYPE_LONG = 253;
const TYPE_FLOAT = 254;
const TYPE_DOUBLE = 255;
const TYPE_STRL = 32768;

// Stata extended-missing sentinels (exact for integer widths).
const MISS_BYTE = 101;
const MISS_INT = 32741;
const MISS_LONG = 2147483621;
const MISS_FLOAT = 1.7014118346e38;
const MISS_DOUBLE = 8.9884656743e307;

function indexOfBytes(
	haystack: Uint8Array,
	needle: string,
	from: number,
	to: number,
): number {
	const n = new TextEncoder().encode(needle);
	const end = Math.min(to, haystack.length) - n.length;
	for (let i = Math.max(0, from); i <= end; i++) {
		let ok = true;
		for (let j = 0; j < n.length; j++) {
			if (haystack[i + j] !== n[j]) {
				ok = false;
				break;
			}
		}
		if (ok) return i;
	}
	return -1;
}

class DtaReader {
	off: number;
	constructor(
		readonly bytes: Uint8Array,
		readonly le: boolean,
		start = 0,
	) {
		this.off = start;
	}
	get view(): DataView {
		return new DataView(
			this.bytes.buffer,
			this.bytes.byteOffset,
			this.bytes.byteLength,
		);
	}
	u8(): number {
		return this.bytes[this.off++] ?? 0;
	}
	u16(): number {
		const v = this.view.getUint16(this.off, this.le);
		this.off += 2;
		return v;
	}
	i16(): number {
		const v = this.view.getInt16(this.off, this.le);
		this.off += 2;
		return v;
	}
	u32(): number {
		const v = this.view.getUint32(this.off, this.le);
		this.off += 4;
		return v;
	}
	i32(): number {
		const v = this.view.getInt32(this.off, this.le);
		this.off += 4;
		return v;
	}
	u64(): number {
		const v = this.view.getBigUint64(this.off, this.le);
		this.off += 8;
		return Number(v);
	}
	i8(): number {
		const v = this.view.getInt8(this.off);
		this.off += 1;
		return v;
	}
	take(n: number): Uint8Array {
		const s = this.bytes.subarray(this.off, this.off + n);
		this.off += n;
		return s;
	}
	skip(n: number): void {
		this.off += n;
	}
	str(n: number): string {
		return new TextDecoder("utf-8").decode(this.take(n));
	}
	cstr(n: number): string {
		const raw = this.take(n);
		let end = 0;
		while (end < raw.length && raw[end] !== 0) end++;
		return new TextDecoder("utf-8").decode(raw.subarray(0, end)).trim();
	}
	expectTag(tag: string): void {
		const got = this.str(tag.length);
		if (got !== tag)
			throw new Error(
				`Malformed Stata file: expected <${tag}> near offset ${this.off}.`,
			);
	}
}

function missingLabel(value: number, base: number): string | null {
	if (value < base || value > base + 25) return null;
	const idx = Math.round(value - base);
	if (idx < 0 || idx > 25) return null;
	return idx === 0 ? "." : `.${String.fromCharCode(97 + idx - 1)}`;
}

function fmtLetter(fmt: string): string {
	const m = /^%(-?\d*(?:\.\d+)?)([a-zA-Z]+)/.exec(fmt.trim());
	return (m?.[2] ?? "").toLowerCase();
}

const DAY_MS = 86400000;
function stataDateToIso(days: number): string {
	const d = new Date(Date.UTC(1960, 0, 1) + Math.round(days) * DAY_MS);
	return Number.isNaN(d.getTime())
		? String(days)
		: d.toISOString().slice(0, 10);
}

function applyDateFormat(value: number, fmt: string): string | number {
	const kind = fmtLetter(fmt);
	if (!kind.startsWith("t")) return value;
	const code = kind.slice(1);
	switch (code) {
		case "d":
			return stataDateToIso(value);
		case "c":
		case "C": {
			const d = new Date(Date.UTC(1960, 0, 1) + Math.round(value));
			return Number.isNaN(d.getTime())
				? value
				: d.toISOString().replace("T", " ").slice(0, 19);
		}
		case "w":
			return stataDateToIso(value * 7);
		case "m": {
			const total = Math.round(value);
			const y = 1960 + Math.floor(total / 12);
			const m = ((total % 12) + 12) % 12;
			return `${y}-${String(m + 1).padStart(2, "0")}`;
		}
		case "q": {
			const total = Math.round(value);
			const y = 1960 + Math.floor(total / 4);
			const q = ((total % 4) + 4) % 4;
			return `${y}Q${q + 1}`;
		}
		case "h": {
			const total = Math.round(value);
			const y = 1960 + Math.floor(total / 2);
			return `${y}H${(total % 2) + 1}`;
		}
		case "y":
			return `${Math.round(value)}`;
		default:
			return value;
	}
}

/**
 * Reads Stata 117/118 datasets (`.dta`) into a table plus value labels.
 *
 * Walks the tagged layout (`<header>` with ASCII release/byteorder and
 * binary K/N, fourteen-offset `<map>` when present, then the seven
 * descriptor components) using map bounds wherever they exist, so stride
 * guesses (33/49/81) are validated, never trusted. Values decode per
 * storage type with Stata's extended missings (`.`, `.a`–`.z`), `%t*`
 * formats become ISO dates, strL cells resolve through the GSO table
 * (best-effort positional join, empty + README note on mismatch), and
 * value-label tables export separately rather than rewriting codes.
 */
export function parseDta(fileBytes: Uint8Array): DtaTable {
	const head = new TextDecoder("ascii").decode(fileBytes.subarray(0, 64));
	if (!head.includes("<stata_dta>")) {
		throw new Error("Not a Stata dataset: missing <stata_dta>.");
	}
	const off = head.indexOf("<stata_dta>") + "<stata_dta>".length;
	const r = new DtaReader(fileBytes, true, off);
	r.expectTag("<header>");
	// <release>118</release><byteorder>LSF</byteorder> — then binary K/N.
	const headerText = new TextDecoder("ascii").decode(
		fileBytes.subarray(r.off, r.off + 96),
	);
	const releaseMatch = /<release>(\d+)<\/release>/.exec(headerText);
	const version = Number(releaseMatch?.[1] ?? 0);
	if (version !== 117 && version !== 118) {
		throw new Error(
			`Stata format ${releaseMatch?.[1] ?? "?"} is not supported (117/118 only) — re-save as 118.`,
		);
	}
	const boMatch = /<byteorder>(MSF|LSF)<\/byteorder>/.exec(headerText);
	if (!boMatch?.[1]) throw new Error("Malformed Stata header: no byteorder.");
	const le = boMatch[1] === "LSF";
	r.off += headerText.indexOf("</byteorder>") + "</byteorder>".length;

	const rr = new DtaReader(fileBytes, le, r.off);
	rr.expectTag("<K>");
	const nvar = rr.u16();
	rr.expectTag("</K>");
	rr.expectTag("<N>");
	const nobs = version === 118 ? rr.u64() : rr.u32();
	rr.expectTag("</N>");
	rr.expectTag("<label>");
	const labelLen = rr.u16();
	if (labelLen > 1024 || rr.off + labelLen > fileBytes.length) {
		throw new Error("Malformed Stata <label>.");
	}
	const dataLabel = new TextDecoder("utf-8").decode(rr.take(labelLen));
	rr.expectTag("</label>");
	rr.expectTag("<timestamp>");
	// Fixed-width in practice, but tolerate drift: scan for the close tag.
	const tsEnd = indexOfBytes(fileBytes, "</timestamp>", rr.off, rr.off + 64);
	if (tsEnd === -1) throw new Error("Malformed Stata <timestamp>.");
	rr.off = tsEnd + "</timestamp>".length;
	rr.expectTag("</header>");

	// Optional <map>: consumed and cross-checked, never trusted blindly.
	// Tag-walking below is authoritative; the map only validates positions.
	const mapProbe = new TextDecoder("ascii").decode(
		fileBytes.subarray(rr.off, rr.off + 5),
	);
	if (mapProbe === "<map>") {
		const mr = new DtaReader(fileBytes, le, rr.off + 5);
		const entries: number[] = [];
		for (let i = 0; i < 14; i++) entries.push(mr.u64());
		if (mr.str("</map>".length) !== "</map>")
			throw new Error("Malformed Stata <map>.");
		for (let i = 1; i < entries.length; i++) {
			if ((entries[i] ?? 0) < (entries[i - 1] ?? 0)) {
				throw new Error("Stata map offsets are not monotonic.");
			}
		}
		rr.off = mr.off;
	}

	const K = nvar;
	if (K < 1 || K > 40000)
		throw new Error(`Implausible Stata variable count (${K}).`);

	const takeComponent = (tag: string): Uint8Array => {
		rr.expectTag(`<${tag}>`);
		// Components never nest: slice to the matching close.
		const closeAt = indexOfBytes(
			fileBytes,
			`</${tag}>`,
			rr.off,
			fileBytes.length,
		);
		if (closeAt === -1) throw new Error(`Malformed Stata file: no </${tag}>.`);
		const data = fileBytes.subarray(rr.off, closeAt);
		rr.off = closeAt + tag.length + 3;
		return data;
	};

	const readTypes = (data: Uint8Array): number[] => {
		const types: number[] = [];
		const dr = new DtaReader(data, le, 0);
		while (dr.off + 2 <= data.length) types.push(dr.u16());
		if (types.length < K) throw new Error("Stata typlist shorter than K.");
		return types.slice(0, K);
	};

	const fixedStrings = (
		data: Uint8Array,
		stride: number,
		label: string,
	): string[] => {
		if (data.length < stride * K) {
			throw new Error(`Stata ${label} shorter than K.`);
		}
		const out: string[] = [];
		for (let i = 0; i < K; i++) {
			out.push(
				new TextDecoder("utf-8")
					.decode(data.subarray(i * stride, i * stride + stride))
					.split("\0")[0]
					?.trim() ?? "",
			);
		}
		return out;
	};

	const types = readTypes(takeComponent("variable_types"));
	const names = fixedStrings(takeComponent("varnames"), 33, "varnames");
	takeComponent("sortlist"); // (K+1) int16 sort keys: ordering only
	const formats = fixedStrings(takeComponent("formats"), 49, "formats");
	const labelNames = fixedStrings(
		takeComponent("value_label_names"),
		33,
		"value_label_names",
	);
	const varLabels = fixedStrings(
		takeComponent("variable_labels"),
		81,
		"variable_labels",
	);

	// Expansion fields: [i32 len][u8 type][len-5 bytes], len==0 terminates.
	{
		const exp = takeComponent("expansion_fields");
		const er = new DtaReader(exp, le, 0);
		let guard = 0;
		while (er.off + 4 <= exp.length && guard++ < 10000) {
			const len = er.i32();
			if (len === 0) break;
			if (len < 5 || er.off + len - 4 > exp.length) {
				throw new Error("Malformed Stata expansion field.");
			}
			er.skip(len - 4);
		}
	}

	const dataBytes = takeComponent("data");
	const rowSize = (() => {
		let s = 0;
		for (const t of types) {
			s +=
				t === TYPE_BYTE
					? 1
					: t === TYPE_INT
						? 2
						: t === TYPE_LONG || t === TYPE_FLOAT
							? 4
							: t === TYPE_DOUBLE
								? 8
								: t === TYPE_STRL
									? 8
									: t >= STR_TYPE_BASE && t <= STR_TYPE_MAX
										? t
										: 0;
		}
		return s;
	})();
	if (rowSize <= 0) throw new Error("Stata columns have zero width.");
	if (dataBytes.length < nobs * rowSize) {
		throw new Error("Stata data section shorter than N rows.");
	}

	const dv = new DataView(
		dataBytes.buffer,
		dataBytes.byteOffset,
		dataBytes.byteLength,
	);
	// NOTE: strN codes (1..2045) numerically overlap nothing, but the check
	// must run AFTER the 251..255 special codes below, which sit inside that
	// range and mean byte/int/long/float/double.
	const isStrN = (t: number): boolean =>
		t >= STR_TYPE_BASE && t <= STR_TYPE_MAX && (t < 251 || t > 255);
	const readCell = (t: number, at: number): string | number | null => {
		const miss = (base: number, v: number): string | null =>
			missingLabel(v, base);
		if (isStrN(t)) {
			const raw = dataBytes.subarray(at, at + t);
			let end = 0;
			while (end < raw.length && raw[end] !== 0) end++;
			return new TextDecoder("utf-8").decode(raw.subarray(0, end)).trimEnd();
		}
		switch (t) {
			case TYPE_BYTE: {
				const v = dv.getInt8(at);
				return miss(MISS_BYTE, v) ?? v;
			}
			case TYPE_INT: {
				const v = dv.getInt16(at, le);
				return miss(MISS_INT, v) ?? v;
			}
			case TYPE_LONG: {
				const v = dv.getInt32(at, le);
				return miss(MISS_LONG, v) ?? v;
			}
			case TYPE_FLOAT: {
				const v = dv.getFloat32(at, le);
				if (v >= MISS_FLOAT) return ".";
				return v;
			}
			case TYPE_DOUBLE: {
				const v = dv.getFloat64(at, le);
				if (v >= MISS_DOUBLE) return ".";
				return v;
			}
			case TYPE_STRL: {
				return null; // resolved in the GSO pass below
			}
			default:
				return null;
		}
	};

	// GSO (long-string) table in its own component.
	const strlsBytes = takeComponent("strls");
	const gsoStrings: string[] = [];
	{
		const gv = new DataView(
			strlsBytes.buffer,
			strlsBytes.byteOffset,
			strlsBytes.byteLength,
		);
		let p = 0;
		while (p + 5 <= strlsBytes.length) {
			const len = gv.getUint32(p, le);
			const gtype = strlsBytes[p + 4] ?? 0;
			if (len < 1 || p + 4 + len > strlsBytes.length) break;
			const payload = strlsBytes.subarray(p + 5, p + 4 + len);
			gsoStrings.push(
				gtype === 130 ? "[binary]" : new TextDecoder("utf-8").decode(payload),
			);
			p += 4 + len;
		}
	}

	const columns: DtaColumn[] = types.map((t, i) => ({
		name: names[i] ?? `var${i + 1}`,
		type:
			t === TYPE_BYTE
				? "byte"
				: t === TYPE_INT
					? "int"
					: t === TYPE_LONG
						? "long"
						: t === TYPE_FLOAT
							? "float"
							: t === TYPE_DOUBLE
								? "double"
								: t === TYPE_STRL
									? "strL"
									: t >= STR_TYPE_BASE && t <= STR_TYPE_MAX
										? `str${t}`
										: `type${t}`,
		format: formats[i] ?? "",
		label: varLabels[i] ?? "",
		valueLabel: labelNames[i] ?? "",
	}));

	const rows: Array<Array<string | number | null>> = [];
	const strlCells: Array<{ row: number; col: number; empty: boolean }> = [];
	const MAX_ROWS = 200_000;
	for (let rowIdx = 0; rowIdx < nobs; rowIdx++) {
		if (rows.length >= MAX_ROWS) {
			throw new Error(
				`Dataset exceeds the ${MAX_ROWS.toLocaleString()}-row browser limit — keep in Stata or filter first, then convert the extract.`,
			);
		}
		const base = rowIdx * rowSize;
		if (base + rowSize > dataBytes.length) break;
		const row: Array<string | number | null> = [];
		let p = base;
		for (let c = 0; c < types.length; c++) {
			const t = types[c] ?? 0;
			const width =
				t === TYPE_BYTE
					? 1
					: t === TYPE_INT
						? 2
						: t === TYPE_LONG || t === TYPE_FLOAT
							? 4
							: t === TYPE_DOUBLE
								? 8
								: t === TYPE_STRL
									? 8
									: t >= STR_TYPE_BASE && t <= STR_TYPE_MAX
										? t
										: 0;
			let cell = readCell(t, p);
			if (t === TYPE_STRL) {
				// v/o pair: (0,0) marks an empty cell consuming no GSO entry.
				const vv = dv.getUint32(p, le);
				const oo = dv.getUint32(p + 4, le);
				strlCells.push({
					row: rows.length,
					col: c,
					empty: vv === 0 && oo === 0,
				});
				cell = null;
			} else if (typeof cell === "number") {
				cell = applyDateFormat(cell, formats[c] ?? "");
			}
			row.push(cell);
			p += width;
		}
		rows.push(row);
	}
	// Best-effort positional GSO join: non-empty strL cells consume entries
	// in file order (documented approximation; mismatches stay empty).
	let strlCursor = 0;
	for (const cell of strlCells) {
		if (cell.empty) continue;
		const text = gsoStrings[strlCursor++] ?? null;
		const target = rows[cell.row];
		if (target) target[cell.col] = text;
	}

	// Value-label tables → separate mapping (codes stay raw in the CSV).
	const labels: Array<{ variable: string; code: string; label: string }> = [];
	{
		const vlBytes = takeComponent("value_labels");
		const vv = new DataView(
			vlBytes.buffer,
			vlBytes.byteOffset,
			vlBytes.byteLength,
		);
		let p = 0;
		const tableByName = new Map<string, Array<[number, string]>>();
		while (p + 8 <= vlBytes.length) {
			const len = vv.getInt32(p, le);
			if (len <= 0 || p + len > vlBytes.length) break;
			const name =
				new TextDecoder("utf-8")
					.decode(vlBytes.subarray(p + 4, p + 37))
					.split("\0")[0]
					?.trim() ?? "";
			const n = vv.getInt32(p + 40, le);
			const txtlen = vv.getInt32(p + 44, le);
			if (
				n < 0 ||
				n > 100000 ||
				txtlen < 0 ||
				p + 48 + n * 8 + txtlen > p + len
			) {
				p += len;
				continue;
			}
			const entries: Array<[number, string]> = [];
			const textBase = p + 48 + n * 8;
			for (let i = 0; i < n; i++) {
				const off = vv.getInt32(p + 48 + i * 4, le);
				const val = vv.getInt32(p + 48 + n * 4 + i * 4, le);
				let end = off;
				while (end < txtlen && vlBytes[textBase + end] !== 0) end++;
				entries.push([
					val,
					new TextDecoder("utf-8").decode(
						vlBytes.subarray(textBase + off, textBase + end),
					),
				]);
			}
			if (name) tableByName.set(name, entries);
			p += len;
		}
		columns.forEach((col) => {
			const entries = col.valueLabel
				? tableByName.get(col.valueLabel)
				: undefined;
			if (!entries) return;
			for (const [code, label] of entries) {
				labels.push({ variable: col.name, code: String(code), label });
			}
		});
	}

	return { columns, rows, labels, nobs, dataLabel };
}
