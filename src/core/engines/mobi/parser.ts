import { decompressPalmDocLz77 } from "../palmdoc/parser";

export interface MobiMetadata {
	title: string;
	author: string | null;
	publisher: string | null;
	description: string | null;
	isbn: string | null;
	published: string | null;
	language: string | null;
	encoding: string;
	compression: string;
	textRecords: number;
}

function readAscii(bytes: Uint8Array, off: number, len: number): string {
	return new TextDecoder("ascii").decode(bytes.subarray(off, off + len));
}

function readU32BE(bytes: Uint8Array, off: number): number {
	const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return v.getUint32(off, false);
}

function readU16BE(bytes: Uint8Array, off: number): number {
	const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return v.getUint16(off, false);
}

function printable(s: string): boolean {
	const t = s.replace(/[\x20-\x7e\s]/g, "");
	return t.length <= Math.max(2, s.length * 0.15);
}

function decodeBytes(bytes: Uint8Array, codepage: number): string {
	const tryDecode = (label: string): string | null => {
		try {
			return new TextDecoder(label, { fatal: true }).decode(bytes);
		} catch {
			return null;
		}
	};
	if (codepage === 65001) {
		return tryDecode("utf-8") ?? new TextDecoder("windows-1252").decode(bytes);
	}
	return tryDecode("windows-1252") ?? new TextDecoder("utf-8").decode(bytes);
}

/** EXTH string fields we surface (MobileRead/wiki + calibre tables). */
const EXTH_TEXT_FIELDS: Record<number, string> = {
	100: "author",
	101: "publisher",
	103: "description",
	104: "isbn",
	105: "subject",
	106: "published",
	112: "source",
	113: "notes",
	501: "cdetype",
	503: "updatedTitle",
	524: "language",
};

function parseExth(exth: Uint8Array, codepage: number): Map<number, string> {
	const out = new Map<number, string>();
	if (exth.length < 12 || readAscii(exth, 0, 4) !== "EXTH") return out;
	const count = readU32BE(exth, 8);
	let off = 12;
	for (let i = 0; i < count && off + 8 <= exth.length; i++) {
		const type = readU32BE(exth, off);
		const len = readU32BE(exth, off + 4);
		if (len < 8 || off + len > exth.length) break;
		const data = exth.subarray(off + 8, off + len);
		if (EXTH_TEXT_FIELDS[type] !== undefined) {
			const text = decodeBytes(data, codepage).replace(/\0+$/g, "").trim();
			if (text) out.set(type, text);
		}
		off += len;
	}
	return out;
}

function htmlToMarkdown(html: string): string {
	let text = html
		.replace(/<mbp:pagebreak\s*\/?>/gi, "\n\n")
		.replace(/<\/?(?:p|h[1-6]|div|blockquote|li|tr|br)[^>]*>/gi, "\n")
		.replace(/<li[^>]*>/gi, "\n- ");
	text = text.replace(/<[^>]*>/g, "");
	text = text
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
			String.fromCharCode(Number.parseInt(n, 16)),
		);
	const lines = text.split("\n");
	const chapterRe =
		/^(chapter|book|part|section|act|scene)\s+([0-9ivxlcdm]+|\b[a-z]+\b)/i;
	const headingRe =
		/^(prologue|epilogue|introduction|foreword|preface|appendix|conclusion)$/i;
	const formatted = lines.map((raw) => {
		const line = raw.trim();
		if (chapterRe.test(line) || headingRe.test(line)) return `\n## ${line}\n`;
		return raw;
	});
	return formatted
		.join("\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Converts a DRM-free Mobipocket (`.mobi`/`.prc`) ebook into Markdown.
 *
 * Shape (calibre/MobileRead tables): PalmDB container → record 0 holds a
 * 16-byte PalmDoc header (compression + text-record count + the **encryption
 * type at +12**, the authoritative DRM signal), a MOBI header (`MOBI`,
 * codepage, EXTH offset, full-name offset from record-0 start, DRM
 * count/size/flags), an EXTH metadata block, then the full title. Text
 * records (PalmDoc LZ77 or raw) hold HTML-subset markup flattened to
 * Markdown. Anything encrypted, Huffdic-compressed (KF8-era), or missing
 * the MOBI header fails with a specific error — never garbage output.
 */
export function convertMobiToMarkdown(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): { markdown: string; metadata: MobiMetadata } {
	onProgress?.(0.05, "READ");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 78) {
		throw new Error(
			"Invalid MOBI file: smaller than the 78-byte PalmDB header.",
		);
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	const pdbType = readAscii(bytes, 60, 4);
	const pdbCreator = readAscii(bytes, 64, 4);
	if (pdbType !== "BOOK" || pdbCreator !== "MOBI") {
		throw new Error(
			`Not a Mobipocket book (PalmDB type "${pdbType.trim()}" / creator "${pdbCreator.trim()}"). ` +
				"Plain PalmDoc files convert with pdb-to-markdown; Kindle KFX/AZW3 need their own readers.",
		);
	}

	const numRecords = readU16BE(bytes, 76);
	if (numRecords < 2) {
		throw new Error("Invalid MOBI file: no content records.");
	}
	const offsets: number[] = [];
	for (let r = 0; r < numRecords; r++) {
		offsets.push(view.getUint32(78 + r * 8, false));
	}
	const recEnd = (i: number): number =>
		i + 1 < offsets.length ? (offsets[i + 1] ?? bytes.length) : bytes.length;
	const rec0 = bytes.subarray(offsets[0] ?? 0, recEnd(0));

	// --- PalmDoc header ---
	const compression = readU16BE(rec0, 0);
	const encryptionType = readU16BE(rec0, 12);
	if (encryptionType !== 0) {
		throw new Error(
			"This book is DRM-encrypted (PalmDoc encryption type " +
				`${encryptionType}) — convrtr only converts DRM-free books you own. ` +
				"Strip nothing here; buy DRM-free (many publishers sell it) or read it in Kindle.",
		);
	}
	if (compression !== 1 && compression !== 2) {
		throw new Error(
			compression === 17480
				? "Huffdic-compressed book (KindleGen KF8 era) — text records need their dictionary and are not supported."
				: `Unsupported MOBI compression (${compression}): expected 1 (raw) or 2 (PalmDoc LZ77).`,
		);
	}
	const numTextRecords = readU16BE(rec0, 8);
	const textLength =
		(rec0[4] ?? 0) * 16777216 +
		(rec0[5] ?? 0) * 65536 +
		(rec0[6] ?? 0) * 256 +
		(rec0[7] ?? 0);

	// --- MOBI header ---
	const mobiOff = 16;
	if (readAscii(rec0, mobiOff, 4) !== "MOBI") {
		throw new Error("Invalid MOBI file: record 0 holds no MOBI header.");
	}
	const mobiLen = readU32BE(rec0, mobiOff + 4);
	const codepage = readU32BE(rec0, mobiOff + 12);
	const exthFlags = readU32BE(rec0, mobiOff + 0x50);
	const fullNameOff = readU32BE(rec0, mobiOff + 0x54);
	const fullNameLen = readU32BE(rec0, mobiOff + 0x58);
	const drmOffset = readU32BE(rec0, mobiOff + 0xa8);
	const drmCount = readU32BE(rec0, mobiOff + 0xac);
	const drmSize = readU32BE(rec0, mobiOff + 0xb0);
	const drmFlags = readU32BE(rec0, mobiOff + 0xb4);
	if (
		(drmCount > 0 && drmSize > 0 && drmOffset !== 0xffffffff) ||
		drmFlags !== 0
	) {
		throw new Error(
			"This book carries MOBI DRM records — convrtr only converts DRM-free books you own.",
		);
	}

	onProgress?.(0.2, "READ METADATA");
	let exth = new Map<number, string>();
	if ((exthFlags & 0x40) !== 0 && mobiOff + mobiLen <= rec0.length) {
		exth = parseExth(rec0.subarray(mobiOff + mobiLen), codepage);
	}

	const pdbName = new TextDecoder("iso-8859-1")
		.decode(bytes.subarray(0, 32))
		.replace(/\0+$/g, "")
		.trim();
	let title = pdbName || "Untitled";
	if (
		fullNameOff > 0 &&
		fullNameLen > 0 &&
		fullNameOff + fullNameLen <= rec0.length
	) {
		const candidate = decodeBytes(
			rec0.subarray(fullNameOff, fullNameOff + fullNameLen),
			codepage,
		).trim();
		if (candidate && printable(candidate)) title = candidate;
	}

	const metadata: MobiMetadata = {
		title,
		author: exth.get(100) ?? null,
		publisher: exth.get(101) ?? null,
		description: exth.get(103) ?? null,
		isbn: exth.get(104) ?? null,
		published: exth.get(106) ?? null,
		language: exth.get(524) ?? null,
		encoding: codepage === 65001 ? "utf-8" : "windows-1252",
		compression: compression === 2 ? "palmdoc-lz77" : "none",
		textRecords: Math.min(numTextRecords, numRecords - 1),
	};

	// --- Text records ---
	onProgress?.(0.35, "DECODE TEXT");
	const chunks: Uint8Array[] = [];
	const count = Math.min(numTextRecords || numRecords - 1, numRecords - 1);
	for (let r = 1; r <= count; r++) {
		const start = offsets[r] ?? bytes.length;
		const end = recEnd(r);
		if (start >= bytes.length || end <= start) continue;
		let chunk = bytes.subarray(start, Math.min(end, bytes.length));
		if (compression === 2) {
			chunk = decompressPalmDocLz77(chunk);
		} else {
			// Raw records are zero-padded to the section size.
			let stop = chunk.length;
			while (stop > 0 && chunk[stop - 1] === 0) stop--;
			chunk = chunk.subarray(0, stop);
		}
		if (chunk.length > 0) chunks.push(chunk);
		onProgress?.(0.35 + 0.45 * (r / count), "DECODE TEXT");
	}
	if (chunks.length === 0) {
		throw new Error("No text decoded: content records are empty.");
	}
	const total = chunks.reduce((a, c) => a + c.length, 0);
	const full = new Uint8Array(total);
	let at = 0;
	for (const c of chunks) {
		full.set(c, at);
		at += c.length;
	}
	const html = decodeBytes(
		full.subarray(
			0,
			textLength > 0 ? Math.min(textLength, full.length) : full.length,
		),
		codepage,
	);

	onProgress?.(0.85, "FORMAT MARKDOWN");
	const body = htmlToMarkdown(html);
	const q = (s: string): string => `"${s.replace(/"/g, '\\"')}"`;
	let markdown = "---\n";
	markdown += `title: ${q(title)}\n`;
	if (metadata.author) markdown += `author: ${q(metadata.author)}\n`;
	if (metadata.publisher) markdown += `publisher: ${q(metadata.publisher)}\n`;
	if (metadata.isbn) markdown += `isbn: ${q(metadata.isbn)}\n`;
	if (metadata.published) markdown += `date: ${q(metadata.published)}\n`;
	if (metadata.language) markdown += `language: ${q(metadata.language)}\n`;
	markdown += `format: "Mobipocket (${metadata.compression}, DRM-free)"\n---\n\n`;
	markdown += `# ${title}\n\n${body}\n`;
	onProgress?.(1.0, "COMPLETE");
	return { markdown, metadata };
}
