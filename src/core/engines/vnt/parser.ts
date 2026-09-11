/**
 * Mobile Phone vNote (.vnt) binary/text parser and note extractor.
 * Decodes Quoted-Printable (multi-byte UTF-8, ISO-8859-1, EUC-KR) and Base64 memo files
 * from Samsung S-Memo, Sony Ericsson, and Nokia phones into clean plain text.
 */

export interface VNoteItem {
	title?: string;
	created?: string;
	modified?: string;
	categories?: string;
	body: string;
}

export interface VNoteParseResult {
	notes: VNoteItem[];
	text: string;
}

/**
 * Decodes Quoted-Printable text into a string with proper character set handling.
 */
export function decodeQuotedPrintable(
	rawText: string,
	charset = "utf-8",
): string {
	// 1. Remove soft line breaks (= followed by \r\n, \r, or \n)
	const unfolded = rawText.replace(/=\r?\n/g, "").replace(/=\r/g, "");

	// 2. Accumulate raw bytes for =XX hex sequences to properly decode multi-byte UTF-8
	const bytes: number[] = [];
	let i = 0;
	while (i < unfolded.length) {
		const char = unfolded[i];
		if (char === "=" && i + 2 < unfolded.length) {
			const hex = unfolded.slice(i + 1, i + 3);
			if (/^[0-9a-fA-F]{2}$/.test(hex)) {
				bytes.push(Number.parseInt(hex, 16));
				i += 3;
				continue;
			}
		}

		// Push ASCII/Latin character byte
		bytes.push(unfolded.charCodeAt(i) & 0xff);
		i += 1;
	}

	const byteArray = new Uint8Array(bytes);
	try {
		return new TextDecoder(charset.toLowerCase()).decode(byteArray);
	} catch {
		return new TextDecoder("utf-8").decode(byteArray);
	}
}

/**
 * Parses vNote timestamps (e.g. 20120515T143000Z or 20120515T143000) to ISO 8601 string.
 */
export function parseVNoteDate(dateStr: string): string | undefined {
	const cleaned = dateStr.trim();
	const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/i.exec(
		cleaned,
	);
	if (!match) return cleaned || undefined;

	const [, y, m, d, hh, mm, ss, z] = match;
	const isUtc = z?.toUpperCase() === "Z";
	return `${y}-${m}-${d}T${hh}:${mm}:${ss}${isUtc ? ".000Z" : ""}`;
}

/**
 * Parses a vNote (.vnt) memo file into structured notes and clean plain text.
 */
export function parseVNote(fileBytes: Uint8Array): VNoteParseResult {
	let text = "";
	try {
		text = new TextDecoder("utf-8").decode(fileBytes);
	} catch {
		text = new TextDecoder("latin1").decode(fileBytes);
	}

	// Remove UTF-8 BOM if present
	if (text.charCodeAt(0) === 0xfeff) {
		text = text.slice(1);
	}

	if (!/BEGIN:VNOTE/i.test(text)) {
		throw new Error(
			"Invalid .vnt file: File does not contain 'BEGIN:VNOTE' marker.",
		);
	}

	// Match individual VNOTE blocks
	const vnoteBlocks = text.split(/BEGIN:VNOTE/i).slice(1);
	const notes: VNoteItem[] = [];

	for (const block of vnoteBlocks) {
		const endIdx = block.search(/END:VNOTE/i);
		const content = endIdx !== -1 ? block.slice(0, endIdx) : block;

		const lines = content.split(/\r?\n/);
		let currentField = "";
		let currentVal = "";
		let charset = "utf-8";
		let encoding: "QUOTED-PRINTABLE" | "BASE64" | "NONE" = "NONE";

		let title: string | undefined;
		let created: string | undefined;
		let modified: string | undefined;
		let categories: string | undefined;
		let bodyRaw = "";

		const flushField = () => {
			if (!currentField) return;

			if (currentField.startsWith("BODY")) {
				if (encoding === "QUOTED-PRINTABLE") {
					bodyRaw += decodeQuotedPrintable(currentVal, charset);
				} else if (encoding === "BASE64") {
					try {
						const binStr = atob(currentVal.replace(/\s+/g, ""));
						const u8 = new Uint8Array(binStr.length);
						for (let k = 0; k < binStr.length; k++) {
							u8[k] = binStr.charCodeAt(k);
						}
						bodyRaw += new TextDecoder(charset).decode(u8);
					} catch {
						bodyRaw += currentVal;
					}
				} else {
					bodyRaw += currentVal;
				}
			} else if (
				currentField.startsWith("SUMMARY") ||
				currentField.startsWith("TITLE")
			) {
				title = currentVal.trim();
			} else if (currentField.startsWith("DCREATED")) {
				created = parseVNoteDate(currentVal);
			} else if (currentField.startsWith("LAST-MODIFIED")) {
				modified = parseVNoteDate(currentVal);
			} else if (currentField.startsWith("CATEGORIES")) {
				categories = currentVal.trim();
			}

			currentField = "";
			currentVal = "";
		};

		for (const line of lines) {
			// Folded line (starts with space or tab) or continuation of quoted-printable
			if ((line.startsWith(" ") || line.startsWith("\t")) && currentField) {
				currentVal += line.slice(1);
				continue;
			}

			if (
				currentField.startsWith("BODY") &&
				encoding === "QUOTED-PRINTABLE" &&
				!line.includes(":") &&
				!line.startsWith("DCREATED") &&
				!line.startsWith("LAST-MODIFIED") &&
				!line.startsWith("END:VNOTE")
			) {
				currentVal += `\r\n${line}`;
				continue;
			}

			// New header field
			const colonPos = line.indexOf(":");
			if (colonPos !== -1) {
				flushField();
				const fieldHeader = line.slice(0, colonPos).toUpperCase();
				const fieldVal = line.slice(colonPos + 1);

				currentField = fieldHeader;
				currentVal = fieldVal;

				// Parse parameters (e.g. BODY;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8)
				if (fieldHeader.includes("QUOTED-PRINTABLE")) {
					encoding = "QUOTED-PRINTABLE";
				} else if (fieldHeader.includes("BASE64")) {
					encoding = "BASE64";
				} else {
					encoding = "NONE";
				}

				const charsetMatch = /CHARSET=([A-Za-z0-9_-]+)/i.exec(fieldHeader);
				charset = charsetMatch?.[1] ? charsetMatch[1] : "utf-8";
			} else if (currentField) {
				currentVal += `\n${line}`;
			}
		}

		flushField();

		// Clean up body line endings
		const cleanBody = bodyRaw
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n")
			.trim();

		notes.push({
			title,
			created,
			modified,
			categories,
			body: cleanBody,
		});
	}

	// Format notes into clean text representation
	const outputParts: string[] = [];
	for (const note of notes) {
		const metaLines: string[] = [];
		if (note.title) metaLines.push(`Title: ${note.title}`);
		if (note.created) metaLines.push(`Created: ${note.created}`);
		if (note.modified) metaLines.push(`Modified: ${note.modified}`);
		if (note.categories) metaLines.push(`Category: ${note.categories}`);

		let section = "";
		if (metaLines.length > 0) {
			section += `${metaLines.join("\n")}\n${"-".repeat(40)}\n\n`;
		}
		section += note.body;
		outputParts.push(section);
	}

	const fullText = outputParts.join(`\n\n${"=".repeat(40)}\n\n`);

	return {
		notes,
		text: fullText,
	};
}

/**
 * Converts a Mobile Phone vNote (.vnt) file into a plain text ArrayBuffer.
 */
export function convertVntToTxt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "PARSING_VNOTE");
	const result = parseVNote(new Uint8Array(input));

	onProgress?.(0.7, "DECODING_TEXT");
	const encoder = new TextEncoder();
	const encoded = encoder.encode(result.text);

	onProgress?.(1.0, "DONE");
	return encoded.buffer as ArrayBuffer;
}
