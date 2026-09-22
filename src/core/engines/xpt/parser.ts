export interface XptColumn {
	name: string;
	label: string;
	type: "numeric" | "char";
	width: number;
	format: string;
}

const LINE1 =
	"HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000  ";
const OBS_HEADER =
	"HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000  ";
const MEMBER_PREFIX = "HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!!";
const DSCRPTR_PREFIX = "HEADER RECORD*******DSCRPTR HEADER RECORD!!!!!!!";
const MAX_ROWS = 200_000;

function ascii(bytes: Uint8Array, off: number, len: number): string {
	return new TextDecoder("ascii").decode(bytes.subarray(off, off + len));
}

/** IBM hex float (8 bytes BE) → IEEE double, per TS-140/pandas algorithm. */
export function ibmToIeee(word: Uint8Array): number {
	const v = new DataView(word.buffer, word.byteOffset, word.byteLength);
	const x1 = v.getUint32(0, false);
	const x2 = v.getUint32(4, false);
	if ((x1 & 0x7fffffff) === 0 && x2 === 0) return 0;
	let shift = 0;
	if (x1 & 0x00200000) shift = 1;
	if (x1 & 0x00400000) shift = 2;
	if (x1 & 0x00800000) shift = 3;
	let ieee1 = (x1 & 0x00ffffff) >>> shift;
	const ieee2 = (x2 >>> shift) | ((x1 & 0x7) << (29 + (3 - shift)));
	ieee1 &= 0xffefffff;
	ieee1 |=
		((((((x1 >>> 24) & 0x7f) - 65) << 2) + shift + 1023) << 20) |
		(x1 & 0x80000000);
	const buf = new ArrayBuffer(8);
	const out = new DataView(buf);
	out.setUint32(0, ieee1 >>> 0, false);
	out.setUint32(4, ieee2 >>> 0, false);
	return out.getFloat64(0, false);
}

function isMissingNumeric(raw: Uint8Array): string | null {
	// Missing iff first byte is ./_ /A-Z and the remaining 7 are zero.
	if (raw.length < 8) return null;
	const first = raw[0] ?? 0;
	const restZero = raw.subarray(1).every((b) => b === 0);
	if (!restZero) return null;
	if (first === 0x2e) return ".";
	if (first === 0x5f) return "._";
	if (first >= 0x41 && first <= 0x5a)
		return `.${String.fromCharCode(first).toLowerCase()}`;
	return null;
}

function applyDateFormat(value: number, format: string): string | number {
	const f = format.toUpperCase().replace(/[^A-Z]/g, "");
	if (f.startsWith("DATETIME")) {
		const d = new Date(Date.UTC(1960, 0, 1) + Math.round(value) * 1000);
		return Number.isNaN(d.getTime())
			? value
			: d.toISOString().replace("T", " ").slice(0, 19);
	}
	if (
		f.startsWith("DATE") ||
		f.startsWith("DDMMYY") ||
		f.startsWith("MMDDYY") ||
		f.startsWith("YYMMDD")
	) {
		const d = new Date(Date.UTC(1960, 0, 1) + Math.round(value) * 86400000);
		return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
	}
	if (f.startsWith("TIME")) {
		const total = Math.round(value);
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		const pad = (n: number): string => String(n).padStart(2, "0");
		return `${pad(h)}:${pad(m)}:${pad(s)}`;
	}
	return value;
}

/**
 * Reads SAS Transport v5 (`.xpt`) datasets into a table.
 *
 * Layout per TS-140 (verified against pandas' reader): 80-byte card stream
 * — library header, member header (with NAMESTR length, usually 140),
 * member info, NAMESTR count, padded NAMESTR structs
 * (`>hhhh8s40s8shhh2s8shhl52s`: type, lengths, 8-char name, 40-char label,
 * display/informat, file position), OBS header, then fixed-width rows.
 * Numerics are IBM hex floats converted exactly (truncated widths padded
 * right with zeros); missing iff first byte is ./_/A-Z with zero tail;
 * chars are space-padded latin1, rstripped. V8 (LIBV8) refuses with
 * guidance; value labels were never written to XPORT (documented).
 */
export function parseXpt(fileBytes: Uint8Array): {
	columns: XptColumn[];
	rows: Array<Array<string | number | null>>;
} {
	const text = (off: number, len: number): string => ascii(fileBytes, off, len);
	if (fileBytes.length < 80 || text(0, 80) !== LINE1) {
		if (text(0, 25) === "HEADER RECORD*******LIBV8") {
			throw new Error(
				"SAS v8 transport (LIBV8) is not supported — re-export as v5 XPORT.",
			);
		}
		throw new Error("Not a SAS transport file: missing the LIBRARY header.");
	}
	let off = 80;
	off += 80; // file-info row (SAS SAS SASLIB…)
	off += 80; // modified row
	if (text(off, 48) !== MEMBER_PREFIX) {
		throw new Error("Malformed XPORT member header.");
	}
	off += 80;
	if (text(off, 48) !== DSCRPTR_PREFIX) {
		throw new Error("Malformed XPORT descriptor header.");
	}
	off += 80; // member info row 1
	off += 80; // member info row 2
	// NAMESTR header row carries the variable count as trailing digits
	// (pandas reads [54:58]; a trailing-digits regex covers 4- and 10-wide).
	const countRow = text(off, 80);
	const countMatch = /(\d+)\s*$/.exec(countRow);
	const fieldCount = countMatch?.[1] ? Number.parseInt(countMatch[1], 10) : NaN;
	if (!Number.isFinite(fieldCount) || fieldCount < 1 || fieldCount > 9999) {
		throw new Error("Malformed XPORT variable count.");
	}
	off += 80;
	// NAMESTR block, padded to 80. Length is 140 (v5) or occasionally 135:
	// validate the first record and fall back once before failing.
	const readColumns = (
		L: number,
	): { columns: XptColumn[]; bytes: number } | null => {
		let size = fieldCount * L;
		if (size % 80 !== 0) size += 80 - (size % 80);
		if (off + size > fileBytes.length) return null;
		const cols: XptColumn[] = [];
		for (let i = 0; i < fieldCount; i++) {
			const b = off + i * L;
			const ntype = v.getInt16(b, false);
			if (ntype !== 1 && ntype !== 2) return null;
			const fieldLength = v.getInt16(b + 4, false);
			if (ntype === 1 && (fieldLength < 2 || fieldLength > 8)) return null;
			if (ntype === 2 && (fieldLength < 1 || fieldLength > 32767)) return null;
			const name = ascii(fileBytes, b + 8, 8).trim();
			if (!/^[\x20-\x7e]*$/.test(name)) return null;
			cols.push({
				name: name || `VAR${i + 1}`,
				label: ascii(fileBytes, b + 16, 40).trim(),
				type: ntype === 1 ? "numeric" : "char",
				width: fieldLength,
				format: ascii(fileBytes, b + 56, 8).trim(),
			});
		}
		return { columns: cols, bytes: size };
	};
	const v = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);
	const parsed = readColumns(140) ?? readColumns(135);
	if (!parsed) {
		throw new Error("Unsupported NAMESTR layout: v5 XPORT only.");
	}
	const { columns } = parsed;
	off += parsed.bytes;
	if (text(off, 80) !== OBS_HEADER) {
		throw new Error("Malformed XPORT file: missing OBS header.");
	}
	off += 80;

	const recordLength = columns.reduce((a, c) => a + c.width, 0);
	if (recordLength <= 0) throw new Error("XPORT columns have zero width.");
	// Observations run to EOF; the tail is card padding, so the count
	// floor-divides and trailing all-blank rows (space-filled numerics and
	// chars — real missings carry ./_/A-Z marker bytes, real zeros are NULs)
	// are padding phantoms, never data. This beats pandas' qword-trim, which
	// eats real trailing blank char fields when they merge with the padding.
	const total = fileBytes.length - off;
	// Card padding means total is rarely an exact multiple (pandas floors too).
	const nobs = Math.floor(total / recordLength);
	if (total <= 0 || nobs < 1) {
		throw new Error("XPORT data section holds no complete rows.");
	}
	if (nobs > MAX_ROWS) {
		throw new Error(
			`${nobs.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()}-row browser limit — subset in SAS/R first, then convert the extract.`,
		);
	}

	const rows: Array<Array<string | number | null>> = [];
	const blanks: boolean[] = [];
	for (let r = 0; r < nobs; r++) {
		const row: Array<string | number | null> = [];
		let blank = true;
		let p = off + r * recordLength;
		for (const col of columns) {
			const raw = fileBytes.subarray(p, p + col.width);
			p += col.width;
			if (!raw.every((byte) => byte === 0x20)) blank = false;
			if (col.type === "numeric") {
				const padded = new Uint8Array(8);
				padded.set(raw.subarray(0, Math.min(8, raw.length)));
				const missing = isMissingNumeric(padded);
				if (missing !== null) {
					row.push(missing);
				} else {
					row.push(applyDateFormat(ibmToIeee(padded), col.format));
				}
			} else {
				row.push(
					new TextDecoder("windows-1252").decode(raw).replace(/\s+$/g, ""),
				);
			}
		}
		rows.push(row);
		blanks.push(blank);
	}
	while (rows.length > 0 && blanks[blanks.length - 1]) {
		rows.pop();
		blanks.pop();
	}
	if (rows.length === 0) {
		throw new Error("XPORT data section holds no complete rows.");
	}
	return { columns, rows };
}

function csvCell(s: string | number | null): string {
	if (s === null) return "";
	const t = typeof s === "number" ? String(s) : s;
	return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function convertXptToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Reading transport headers...");
	const { columns, rows } = parseXpt(new Uint8Array(input));
	onProgress?.(0.5, `Writing ${rows.length} rows...`);
	const lines = [columns.map((c) => csvCell(c.name)).join(",")];
	for (const row of rows) lines.push(row.map(csvCell).join(","));
	const meta = `# ${columns.length} variables, ${rows.length} observations\n# ${columns.map((c) => `${c.name} (${c.type}${c.label ? `: ${c.label}` : ""})`).join(" | ")}\n`;
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(`\uFEFF${meta}${lines.join("\n")}\n`)
		.buffer as ArrayBuffer;
}
