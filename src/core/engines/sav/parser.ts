import { inflateSync } from "fflate";

export interface SavColumn {
	name: string;
	label: string;
	type: string;
	format: string;
}

export interface SavTable {
	columns: SavColumn[];
	rows: Array<Array<string | number | null>>;
	labels: Array<{ variable: string; code: string; label: string }>;
	documents: string[];
	fileLabel: string;
	namesLong: number;
}

// SPSS date/time print-format type codes (print int32: decimals | width<<8 | type<<16).
const DATE_TYPES = new Set([20, 23, 24, 38, 39]); // DATE ADATE JDATE EDATE SDATE (days)
const DATETIME_TYPES = new Set([22, 41, 25]); // DATETIME YMDHMS DTIME (seconds)
const TIME_TYPES = new Set([21, 40]); // TIME MTIME (time-of-day seconds)
const SPSS_EPOCH_MS = Date.UTC(1582, 9, 14);

function fmtType(print: number): number {
	return (print >>> 16) & 0xff;
}

function spssSecondsToIso(secs: number): string | number {
	const d = new Date(SPSS_EPOCH_MS + Math.round(secs) * 1000);
	return Number.isNaN(d.getTime())
		? secs
		: d.toISOString().replace("T", " ").slice(0, 19);
}

function applySpssFormat(value: number, print: number): string | number {
	const t = fmtType(print);
	if (DATE_TYPES.has(t)) {
		const d = new Date(SPSS_EPOCH_MS + Math.floor(value / 86400) * 86400000);
		return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
	}
	if (DATETIME_TYPES.has(t)) return spssSecondsToIso(value);
	if (TIME_TYPES.has(t)) {
		const total = Math.floor(value);
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		const pad = (n: number): string => String(n).padStart(2, "0");
		return `${h}:${pad(m)}:${pad(s)}`;
	}
	if (t === 26 && value >= 1 && value <= 7) {
		return (
			[
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			][Math.round(value) - 1] ?? value
		);
	}
	if (t === 27 && value >= 1 && value <= 12) {
		return (
			[
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December",
			][Math.round(value) - 1] ?? value
		);
	}
	if (t === 28) {
		const total = Math.round(value);
		return `${1582 + Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
	}
	if (t === 29) {
		const total = Math.round(value);
		return `${1582 + Math.floor(total / 4)}Q${(total % 4) + 1}`;
	}
	if (t === 30) {
		const d = new Date(SPSS_EPOCH_MS + Math.round(value) * 7 * 86400000);
		return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
	}
	return value;
}

class SavReader {
	off = 0;
	constructor(
		readonly bytes: Uint8Array,
		readonly le: boolean,
	) {}
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
	i32(): number {
		const v = this.view.getInt32(this.off, this.le);
		this.off += 4;
		return v;
	}
	u32(): number {
		const v = this.view.getUint32(this.off, this.le);
		this.off += 4;
		return v;
	}
	f64(): number {
		const v = this.view.getFloat64(this.off, this.le);
		this.off += 8;
		return v;
	}
	i64(): bigint {
		const v = this.view.getBigInt64(this.off, this.le);
		this.off += 8;
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
}

interface RawVar {
	name: string; // short (8-char) name
	longName: string | null;
	type: number; // 0 numeric, >0 string width, -1 dummy segment
	label: string;
	print: number;
	missingKind: number;
	missing: number[];
}

function decodeText(bytes: Uint8Array, encoding: string): string {
	try {
		return new TextDecoder(encoding).decode(bytes);
	} catch {
		return new TextDecoder("windows-1252").decode(bytes);
	}
}

function cleanStr(raw: Uint8Array, encoding: string): string {
	let end = raw.length;
	while (end > 0 && (raw[end - 1] === 0 || raw[end - 1] === 32)) end--;
	return decodeText(raw.subarray(0, end), encoding);
}

/**
 * Reads an SPSS Statistics Data File (`.sav`, $FL2/$FL3) into a table.
 *
 * Per the PSPP system-file spec: 176-byte header (endianness from
 * layout_code, float format from bias), tag-2 variable records (long
 * strings split across dummy records, true widths from ext-14), tag-3/4
 * value labels, tag-6 documents, tag-7 extensions (long names, encoding),
 * tag-999 terminator, then data — raw 8-byte units, bytecode (codes
 * 1–251 = code − bias, 252 end, 253 raw follows, 254 spaces, 255 SYSMIS),
 * or ZLIB blocks inflated with fflate. SPSS-epoch dates become ISO;
 * missings (SYSMIS/discrete/range) become `.`; value labels export
 * separately with codes raw.
 */
export function parseSav(fileBytes: Uint8Array): SavTable {
	if (fileBytes.length < 176) {
		throw new Error("Invalid SAV file: smaller than the 176-byte header.");
	}
	const magic = new TextDecoder("ascii").decode(fileBytes.subarray(0, 4));
	if (magic !== "$FL2" && magic !== "$FL3") {
		throw new Error("Not an SPSS data file: missing $FL2/$FL3 signature.");
	}
	// Endianness: layout_code reads as 2 or 3 in the correct order.
	const probeLE = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	).getInt32(64, true);
	const probeBE = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	).getInt32(64, false);
	const le =
		probeLE === 2 || probeLE === 3
			? true
			: probeBE === 2 || probeBE === 3
				? false
				: null;
	if (le === null) {
		throw new Error(
			"Unrecognised SAV layout code (expected 2): cannot determine byte order.",
		);
	}
	const r = new SavReader(fileBytes, le);
	r.skip(64);
	const layout = r.i32();
	void layout;
	r.i32(); // nominal_case_size (unsafe per spec — ignored)
	const compression = r.i32();
	r.i32(); // weight_index
	const ncases = r.i32();
	const bias = r.f64();
	if (!(bias > 0) || !(bias < 1000)) {
		throw new Error(
			`Unsupported SAV bias (${bias}): bytecode integers need a sane bias.`,
		);
	}
	r.skip(9 + 8); // creation date/time
	const fileLabel = cleanStr(r.take(64), "windows-1252");
	r.skip(3);

	if (
		compression !== 0 &&
		compression !== 1 &&
		!(compression === 2 && magic === "$FL3")
	) {
		throw new Error(`Unsupported SAV compression (${compression}).`);
	}
	if (compression === 2 && magic !== "$FL3") {
		throw new Error("SAV claims ZLIB without the $FL3 signature.");
	}

	// --- Dictionary ---
	const dictVars: RawVar[] = [];
	const longNames = new Map<string, string>();
	const longWidths = new Map<string, number>();
	let encoding = "windows-1252";
	const labelSets: Array<{ vars: number[]; entries: Array<[number, string]> }> =
		[];
	const pendingLabels: Array<Array<[number, string]>> = [];
	const documents: string[] = [];
	let dictDone = false;

	while (!dictDone && r.off + 4 <= fileBytes.length) {
		const recType = r.i32();
		if (recType === 2) {
			const type = r.i32();
			const hasLabel = r.i32();
			const missingKind = r.i32();
			const print = r.i32();
			const write = r.i32();
			void write;
			const name = cleanStr(r.take(8), encoding);
			let label = "";
			if (hasLabel === 1) {
				const labelLen = r.i32();
				if (
					labelLen < 0 ||
					labelLen > 10000 ||
					r.off + Math.ceil(labelLen / 4) * 4 > fileBytes.length
				) {
					throw new Error("Malformed SAV variable label.");
				}
				label = decodeText(r.take(labelLen), encoding);
				r.skip(Math.ceil(labelLen / 4) * 4 - labelLen);
			}
			const missing: number[] = [];
			const absKind = Math.abs(missingKind);
			if (absKind >= 1 && absKind <= 3) {
				for (let i = 0; i < absKind; i++) missing.push(r.f64());
			}
			dictVars.push({
				name,
				longName: null,
				type,
				label,
				print,
				missingKind,
				missing,
			});
		} else if (recType === 3) {
			const count = r.i32();
			if (count < 0 || count > 1000000)
				throw new Error("Malformed SAV value-label record.");
			const entries: Array<[number, string]> = [];
			for (let i = 0; i < count; i++) {
				const value = r.f64();
				const len = r.u8();
				if (r.off + len > fileBytes.length)
					throw new Error("Truncated SAV value label.");
				entries.push([value, decodeText(r.take(len), encoding)]);
			}
			// Next must be a type-4 applicator (tolerate the ReadStat quirk: skip validation, match by order later).
			pendingLabels.push(entries);
		} else if (recType === 4) {
			const varCount = r.i32();
			if (
				varCount < 0 ||
				varCount > 100000 ||
				r.off + varCount * 4 > fileBytes.length
			) {
				throw new Error("Malformed SAV label applicator.");
			}
			const vars: number[] = [];
			for (let i = 0; i < varCount; i++) vars.push(r.i32());
			const entries = pendingLabels.pop();
			if (entries) labelSets.push({ vars, entries });
		} else if (recType === 6) {
			const lines = r.i32();
			if (
				lines < 0 ||
				lines > 100000 ||
				r.off + lines * 80 > fileBytes.length
			) {
				throw new Error("Malformed SAV documents record.");
			}
			for (let i = 0; i < lines; i++) {
				documents.push(decodeText(r.take(80), encoding).trimEnd());
			}
		} else if (recType === 7) {
			const subtype = r.i32();
			const size = r.i32();
			if (size < 0 || r.off + size > fileBytes.length) {
				throw new Error("Malformed SAV extension record.");
			}
			const payload = r.take(size);
			try {
				if (subtype === 13) {
					// Long variable names: count + ["SHORT=long name"] strings.
					const pr = new SavReader(payload, le);
					const count = pr.i32();
					for (let i = 0; i < count; i++) {
						const len = pr.i32();
						if (len <= 0 || len > 10000 || pr.off + len > payload.length) break;
						const text = decodeText(pr.take(len), encoding);
						const eq = text.indexOf("=");
						if (eq > 0) longNames.set(text.slice(0, eq), text.slice(eq + 1));
					}
				} else if (subtype === 14) {
					// Very long strings: count + ["VAR=width"].
					const pr = new SavReader(payload, le);
					const count = pr.i32();
					for (let i = 0; i < count; i++) {
						const len = pr.i32();
						if (len <= 0 || len > 1000 || pr.off + len > payload.length) break;
						const text = decodeText(pr.take(len), encoding);
						const eq = text.indexOf("=");
						if (eq > 0)
							longWidths.set(
								text.slice(0, eq),
								Number(text.slice(eq + 1)) || 0,
							);
					}
				} else if (subtype === 20) {
					// Character encoding, e.g. "UTF-8".
					const name = decodeText(payload, "ascii").replace(/\0+$/g, "").trim();
					if (/utf-?8/i.test(name)) encoding = "utf-8";
					else if (/1252|latin|ansi/i.test(name)) encoding = "windows-1252";
				}
			} catch {
				// Best-effort extensions: a broken one must not kill the file.
			}
		} else if (recType === 999) {
			r.i32(); // filler 0
			dictDone = true;
		} else {
			throw new Error(`Unknown SAV dictionary record type (${recType}).`);
		}
	}
	if (!dictDone) throw new Error("Truncated SAV dictionary (no terminator).");

	// Resolve long names/widths; expand dummy segments into logical variables.
	interface LogicalVar {
		name: string;
		label: string;
		print: number;
		width: number; // string bytes, 0 = numeric
		missingKind: number;
		missing: number[];
		units: number; // 8-byte data units
	}
	const logical: LogicalVar[] = [];
	for (let i = 0; i < dictVars.length; i++) {
		const v = dictVars[i];
		if (!v) continue;
		if (v.type === -1) continue; // dummy segment: consumed by its head below
		if (v.type === 0) {
			logical.push({
				name: longNames.get(v.name) ?? v.name,
				label: v.label,
				print: v.print,
				width: 0,
				missingKind: v.missingKind,
				missing: v.missing,
				units: 1,
			});
		} else {
			let width = v.type;
			let units = Math.ceil(width / 8);
			let j = i + 1;
			while (j < dictVars.length && dictVars[j]?.type === -1) {
				units++;
				j++;
			}
			const longW =
				longWidths.get(v.name) ?? longWidths.get(longNames.get(v.name) ?? "");
			if (longW !== undefined && longW > width) width = longW;
			logical.push({
				name: longNames.get(v.name) ?? v.name,
				label: v.label,
				print: v.print,
				width,
				missingKind: v.missingKind,
				missing: v.missing,
				units,
			});
		}
	}
	if (logical.length === 0)
		throw new Error("SAV dictionary holds no variables.");

	// --- Data ---
	let dataBytes: Uint8Array;
	if (compression === 2) {
		dataBytes = inflateZlibSection(fileBytes, r.off, le);
	} else {
		dataBytes = fileBytes.subarray(r.off);
	}

	const unitsPerCase = logical.reduce((a, v) => a + v.units, 0);
	const rows: Array<Array<string | number | null>> = [];
	const dv = (buf: Uint8Array): DataView =>
		new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

	if (compression === 0) {
		const totalUnits = Math.floor(dataBytes.length / 8);
		const cases =
			ncases >= 0
				? Math.min(ncases, Math.floor(totalUnits / Math.max(1, unitsPerCase)))
				: Math.floor(totalUnits / Math.max(1, unitsPerCase));
		let p = 0;
		for (let c = 0; c < cases; c++) {
			const row = readCase(dataBytes, p, logical, encoding, le, dv);
			p += unitsPerCase * 8;
			rows.push(row);
			if (rows.length >= 200_000) {
				throw new Error(
					"Dataset exceeds the 200,000-row browser limit — filter in SPSS first, then convert the extract.",
				);
			}
		}
	} else {
		// Bytecode: 8-opcode groups, 253 values follow each group.
		decodeBytecodeCases(dataBytes, logical, encoding, bias, le, rows);
	}

	const labels: Array<{ variable: string; code: string; label: string }> = [];
	{
		// Map label sets (1-based dictionary indices, incl. dummies) to logical vars.
		const dictToLogical: number[] = [];
		for (let i = 0; i < dictVars.length; i++) {
			if (dictVars[i]?.type === -1) continue;
			dictToLogical.push(
				logical.findIndex(
					(l) =>
						l.name ===
						(longNames.get(dictVars[i]?.name ?? "") ?? dictVars[i]?.name),
				),
			);
		}
		for (const set of labelSets) {
			for (const dictOneBased of set.vars) {
				const li = dictToLogical[(dictOneBased ?? 1) - 1];
				const col = li !== undefined ? logical[li] : undefined;
				if (!col) continue;
				for (const [code, label] of set.entries) {
					labels.push({ variable: col.name, code: String(code), label });
				}
			}
		}
	}

	const columns: SavColumn[] = logical.map((v) => ({
		name: v.name,
		label: v.label,
		type: v.width === 0 ? "numeric" : `str${v.width}`,
		format: describePrintFormat(v.print),
	}));
	return {
		columns,
		rows,
		labels,
		documents,
		fileLabel,
		namesLong: longNames.size,
	};
}

function readCase(
	data: Uint8Array,
	start: number,
	logical: Array<{
		width: number;
		print: number;
		missingKind: number;
		missing: number[];
		units: number;
	}>,
	encoding: string,
	le: boolean,
	dv: (buf: Uint8Array) => DataView,
): Array<string | number | null> {
	const row: Array<string | number | null> = [];
	let p = start;
	for (const v of logical) {
		if (v.width === 0) {
			const val = dv(data).getFloat64(p, le);
			p += 8;
			row.push(savMissing(val, v) ?? applySpssFormat(val, v.print));
		} else {
			const raw = data.subarray(p, p + v.width);
			p += v.width;
			row.push(savStringMissing(raw, v, le) ?? cleanStr(raw, encoding));
		}
	}
	return row;
}

function decodeBytecodeCases(
	data: Uint8Array,
	logical: Array<{
		width: number;
		print: number;
		missingKind: number;
		missing: number[];
		units: number;
	}>,
	encoding: string,
	bias: number,
	le: boolean,
	rows: Array<Array<string | number | null>>,
): void {
	let p = 0;
	const nextUnit = ():
		| { kind: "num"; value: number }
		| { kind: "str"; bytes: Uint8Array }
		| { kind: "miss" }
		| { kind: "end" }
		| null => {
		return null;
	};
	void nextUnit;
	// Stream decode: regroup opcode units into cases by variable layout.
	const unitQueue: Array<
		| { kind: "num"; value: number }
		| { kind: "str"; bytes: Uint8Array }
		| { kind: "miss" }
	> = [];
	const needUnits = (n: number): boolean => {
		while (unitQueue.length < n && p + 8 <= data.length) {
			const ops = data.subarray(p, p + 8);
			p += 8;
			const raws: Uint8Array[] = [];
			for (let k = 0; k < 8; k++) {
				if ((ops[k] ?? 0) === 253) {
					raws.push(data.subarray(p, p + 8));
					p += 8;
				}
			}
			let ri = 0;
			for (let k = 0; k < 8; k++) {
				const code = ops[k] ?? 0;
				if (code === 252) return false;
				if (code === 0) continue;
				if (code === 255) unitQueue.push({ kind: "miss" });
				else if (code === 254)
					unitQueue.push({ kind: "str", bytes: new Uint8Array(8).fill(32) });
				else if (code === 253)
					unitQueue.push({
						kind: "str",
						bytes: raws[ri++] ?? new Uint8Array(8),
					});
				else unitQueue.push({ kind: "num", value: code - bias });
			}
		}
		return unitQueue.length >= n;
	};
	const caseUnits = logical.reduce((a, v) => a + v.units, 0);
	for (;;) {
		if (!needUnits(caseUnits)) break;
		const row: Array<string | number | null> = [];
		for (const v of logical) {
			if (v.width === 0) {
				const u = unitQueue.shift();
				if (!u) break;
				if (u.kind === "miss") row.push(".");
				else if (u.kind === "num") {
					const val = u.value;
					row.push(savMissing(val, v) ?? applySpssFormat(val, v.print));
				} else {
					// Numeric slot holding raw bytes (253): IEEE double in file order.
					const f = new DataView(
						u.bytes.buffer,
						u.bytes.byteOffset,
						u.bytes.byteLength,
					).getFloat64(0, le);
					row.push(savMissing(f, v) ?? applySpssFormat(f, v.print));
				}
			} else {
				let acc = new Uint8Array(0);
				for (let s = 0; s < v.units; s++) {
					const u = unitQueue.shift();
					if (!u) break;
					if (u.kind === "str") {
						const next = new Uint8Array(acc.length + 8);
						next.set(acc, 0);
						next.set(u.bytes, acc.length);
						acc = next;
					} else if (u.kind === "miss") {
						acc = new Uint8Array(0);
						break;
					} else {
						acc = new Uint8Array(0);
						break;
					}
				}
				const str = cleanStr(acc.subarray(0, v.width), encoding);
				const missingMark = savStringMissing(acc.subarray(0, v.width), v, le);
				row.push(missingMark ?? (str === "" && v.width > 0 ? null : str));
			}
		}
		rows.push(row);
		if (rows.length >= 200_000) {
			throw new Error(
				"Dataset exceeds the 200,000-row browser limit — filter in SPSS first, then convert the extract.",
			);
		}
	}
}

/** Raw 253 blocks are IEEE doubles in file byte order; .sav is LE in practice. */
function savMissing(
	value: number,
	v: { missingKind: number; missing: number[] },
): string | null {
	if (value === -Number.MAX_VALUE) return ".";
	const kind = v.missingKind;
	if (kind === 0) return null;
	if (kind >= 1 && kind <= 3) {
		for (let i = 0; i < kind; i++) {
			if (value === (v.missing[i] ?? NaN)) return ".";
		}
		return null;
	}
	if (kind === -2 || kind === -3) {
		const lo = v.missing[0] ?? NaN;
		const hi = v.missing[1] ?? NaN;
		const low = lo === -Number.MAX_VALUE ? -Infinity : lo;
		const high = hi === Number.MAX_VALUE ? Infinity : hi;
		if (value >= low && value <= high) return ".";
		if (kind === -3 && value === (v.missing[2] ?? NaN)) return ".";
		return null;
	}
	return null;
}

function savStringMissing(
	raw: Uint8Array,
	v: { missingKind: number; missing: number[] },
	le: boolean,
): string | null {
	// Discrete string missings compare the value's bytes (spec pads to 8).
	if (v.missingKind < 1 || v.missingKind > 3) return null;
	const dv = new DataView(new ArrayBuffer(8));
	for (let i = 0; i < v.missingKind; i++) {
		dv.setFloat64(0, v.missing[i] ?? NaN, le);
		const spec = new Uint8Array(dv.buffer);
		let match = true;
		for (let k = 0; k < Math.min(8, raw.length); k++) {
			if ((raw[k] ?? 0) !== (spec[k] ?? 1)) {
				match = false;
				break;
			}
		}
		if (match) return ".";
	}
	return null;
}

function describePrintFormat(print: number): string {
	const t = (print >>> 16) & 0xff;
	const w = (print >>> 8) & 0xff;
	const d = print & 0xff;
	const names: Record<number, string> = {
		5: "F",
		20: "DATE",
		21: "TIME",
		22: "DATETIME",
		23: "ADATE",
		24: "JDATE",
		25: "DTIME",
		26: "WKDAY",
		27: "MONTH",
		28: "MOYR",
		29: "QYR",
		30: "WKYR",
		38: "EDATE",
		39: "SDATE",
		40: "MTIME",
		41: "YMDHMS",
	};
	const n = names[t] ?? `FMT${t}`;
	return `${n}${w}.${d}`;
}

function inflateZlibSection(
	fileBytes: Uint8Array,
	start: number,
	le: boolean,
): Uint8Array {
	const v = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);
	const get64 = (off: number): number => Number(v.getBigInt64(off, le));
	const zheaderOfs = get64(start);
	const ztrailerOfs = get64(start + 8);
	const ztrailerLen = get64(start + 16);
	if (
		ztrailerOfs <= zheaderOfs ||
		ztrailerLen < 24 ||
		zheaderOfs + ztrailerLen > fileBytes.length * 2
	) {
		throw new Error("Malformed SAV ZLIB header.");
	}
	const nBlocks = (ztrailerLen - 24) / 24;
	if (!Number.isInteger(nBlocks) || nBlocks < 1 || nBlocks > 100000) {
		throw new Error("Malformed SAV ZLIB trailer.");
	}
	const chunks: Uint8Array[] = [];
	let compOff = zheaderOfs + 24;
	for (let b = 0; b < nBlocks; b++) {
		const dOff = ztrailerOfs + 24 + b * 24;
		const compSize = v.getInt32(dOff + 20, le);
		if (compSize <= 0 || compOff + compSize > fileBytes.length) {
			throw new Error("Malformed SAV ZLIB block descriptor.");
		}
		chunks.push(inflateSync(fileBytes.subarray(compOff, compOff + compSize)));
		compOff += compSize;
	}
	const total = chunks.reduce((a, c) => a + c.length, 0);
	const out = new Uint8Array(total);
	let at = 0;
	for (const c of chunks) {
		out.set(c, at);
		at += c.length;
	}
	return out;
}
