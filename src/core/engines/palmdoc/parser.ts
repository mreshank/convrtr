import type {
	PalmDocConversionOptions,
	PalmDocConversionResult,
	PalmDocMetadata,
} from "./types";

/**
 * Palm OS epoch starts on January 1, 1904.
 * Difference between Unix epoch (1970) and Palm OS epoch (1904) in seconds:
 * 66 years, including 17 leap years: 2,082,844,800 seconds.
 */
const PALM_EPOCH_DIFF_SECONDS = 2082844800;

function readFourCC(bytes: Uint8Array, offset: number): string {
	let str = "";
	for (let i = 0; i < 4; i++) {
		const code = bytes[offset + i] ?? 0;
		str += code >= 32 && code <= 126 ? String.fromCharCode(code) : " ";
	}
	return str;
}

/**
 * Decompresses a PalmDoc LZ77 byte stream into uncompressed bytes.
 */
export function decompressPalmDocLz77(input: Uint8Array): Uint8Array {
	const out: number[] = [];
	let i = 0;

	while (i < input.length) {
		const b0 = input[i++];
		if (b0 === undefined) break;

		if (b0 === 0x00) {
			// Literal null byte (often padding or formatting)
			out.push(0x00);
		} else if (b0 >= 0x01 && b0 <= 0x08) {
			// Literal run of b0 bytes follows
			for (let k = 0; k < b0 && i < input.length; k++) {
				out.push(input[i++] ?? 0);
			}
		} else if (b0 >= 0x09 && b0 <= 0x7f) {
			// Single literal byte
			out.push(b0);
		} else if (b0 >= 0x80 && b0 <= 0xbf) {
			// 2-byte distance/length back-reference
			if (i >= input.length) break;
			const b1 = input[i++] ?? 0;
			const distance = ((b0 & 0x3f) << 3) | ((b1 & 0xe0) >> 5);
			const length = (b1 & 0x1f) + 3;

			const startPos = out.length - distance;
			for (let k = 0; k < length; k++) {
				out.push(out[startPos + k] ?? 0x20);
			}
		} else {
			// 0xC0 .. 0xFF: Space followed by ASCII character (b0 ^ 0x80)
			out.push(0x20); // ' '
			out.push(b0 ^ 0x80);
		}
	}

	return new Uint8Array(out);
}

/**
 * Parses a Palm OS Database (.pdb) file carrying PalmDoc / AportisDoc text
 * and converts it into structured Markdown.
 */
export function convertPalmdocToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: PalmDocConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): PalmDocConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 78) {
		throw new Error(
			"Invalid PDB file: File size is smaller than the 78-byte Palm Database header.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Read Name (32 bytes null-terminated)
	let nameEnd = 0;
	while (nameEnd < 32 && bytes[nameEnd] !== 0) {
		nameEnd++;
	}
	const dbName =
		new TextDecoder("iso-8859-1").decode(bytes.subarray(0, nameEnd)).trim() ||
		"Untitled Document";

	// Creation date
	const creationTimestamp = view.getUint32(36, false); // Big endian
	let createdDate: string | undefined;
	if (creationTimestamp > PALM_EPOCH_DIFF_SECONDS) {
		const unixSec = creationTimestamp - PALM_EPOCH_DIFF_SECONDS;
		const dateObj = new Date(unixSec * 1000);
		if (!Number.isNaN(dateObj.getTime())) {
			createdDate = dateObj.toISOString().split("T")[0];
		}
	}

	const typeFourCC = readFourCC(bytes, 60);
	const creatorFourCC = readFourCC(bytes, 64);
	const numRecords = view.getUint16(76, false);

	if (numRecords === 0) {
		throw new Error("Invalid PDB file: Database contains 0 records.");
	}

	if (bytes.length < 78 + numRecords * 8) {
		throw new Error(
			"Invalid PDB file: File truncated before end of record index entries.",
		);
	}

	onProgress?.(0.15, "PARSE_RECORDS");

	// Record list: 8 bytes per record (uint32 offset, uint8 attributes, uint24 uniqueID)
	const recordOffsets: number[] = [];
	for (let r = 0; r < numRecords; r++) {
		const recOffset = view.getUint32(78 + r * 8, false);
		recordOffsets.push(recOffset);
	}

	// Record 0 holds the PalmDoc header
	const rec0Offset = recordOffsets[0];
	if (rec0Offset === undefined || rec0Offset + 16 > bytes.length) {
		throw new Error("Invalid PalmDoc PDB: Missing or truncated Record 0.");
	}

	const compressionCode = view.getUint16(rec0Offset, false);
	const textLength = view.getUint32(rec0Offset + 4, false);
	const numTextRecords = view.getUint16(rec0Offset + 8, false);

	const isLz77 = compressionCode === 2;
	if (compressionCode !== 1 && compressionCode !== 2) {
		throw new Error(
			`Unsupported PalmDoc compression type (${compressionCode}). Expected 1 (uncompressed) or 2 (PalmDoc LZ77).`,
		);
	}

	const metadata: PalmDocMetadata = {
		name: dbName,
		type: typeFourCC,
		creator: creatorFourCC,
		numRecords,
		compression: isLz77 ? "palmdoc-lz77" : "none",
		uncompressedSize: textLength,
		createdDate,
	};

	onProgress?.(0.3, "DECOMPRESS_TEXT");

	// Decompress text blocks (Record 1 through min(numRecords, 1 + numTextRecords))
	const textChunks: Uint8Array[] = [];
	const recordsToRead = Math.min(
		numRecords - 1,
		numTextRecords > 0 ? numTextRecords : numRecords - 1,
	);

	for (let r = 0; r < recordsToRead; r++) {
		const recIdx = r + 1;
		const start = recordOffsets[recIdx];
		if (start === undefined || start >= bytes.length) continue;

		const end =
			recIdx + 1 < recordOffsets.length
				? (recordOffsets[recIdx + 1] ?? bytes.length)
				: bytes.length;

		const chunkData = bytes.subarray(start, Math.min(end, bytes.length));
		if (chunkData.length === 0) continue;

		if (isLz77) {
			const decompressed = decompressPalmDocLz77(chunkData);
			textChunks.push(decompressed);
		} else {
			textChunks.push(chunkData);
		}

		if (recordsToRead > 1) {
			onProgress?.(0.3 + 0.5 * ((r + 1) / recordsToRead), "DECOMPRESS_TEXT");
		}
	}

	// Concatenate all text chunks
	const totalBytes = textChunks.reduce((acc, c) => acc + c.length, 0);
	const fullBuffer = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of textChunks) {
		fullBuffer.set(chunk, offset);
		offset += chunk.length;
	}

	// Decode into string using TextDecoder (Windows-1252 / ISO-8859-1 compatible)
	let rawText = "";
	try {
		rawText = new TextDecoder("utf-8", { fatal: true }).decode(fullBuffer);
	} catch {
		rawText = new TextDecoder("windows-1252").decode(fullBuffer);
	}

	onProgress?.(0.85, "FORMAT_MARKDOWN");

	// Structure text into clean Markdown
	// Normalize line endings
	let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	const detectHeadings = options.detectHeadings ?? true;
	if (detectHeadings) {
		// Detect chapter headers: lines like "Chapter 1", "CHAPTER I", "Prologue", "Epilogue", etc.
		const lines = text.split("\n");
		const formattedLines: string[] = [];

		const chapterRegex =
			/^(chapter|book|part|section|act|scene)\s+([0-9ivxlcdm]+|\b[a-z]+\b)/i;
		const headingRegex =
			/^(prologue|epilogue|introduction|foreword|preface|appendix|conclusion)$/i;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]?.trim() ?? "";
			if (chapterRegex.test(line) || headingRegex.test(line)) {
				formattedLines.push(`\n## ${line}\n`);
			} else if (
				line.length > 0 &&
				line.length <= 60 &&
				line === line.toUpperCase() &&
				/^[A-Z0-9\s:,\-.]{3,}$/.test(line)
			) {
				// All caps short line surrounded by blank lines can be a title/heading
				const prevBlank = i === 0 || lines[i - 1]?.trim().length === 0;
				const nextBlank =
					i === lines.length - 1 || lines[i + 1]?.trim().length === 0;
				if (prevBlank && nextBlank) {
					formattedLines.push(`\n### ${line}\n`);
				} else {
					formattedLines.push(lines[i] ?? "");
				}
			} else {
				formattedLines.push(lines[i] ?? "");
			}
		}

		text = formattedLines.join("\n");
	}

	// Clean up multi-blank lines
	text = text.replace(/\n{3,}/g, "\n\n").trim();

	// Add frontmatter if requested
	const includeFrontmatter = options.includeFrontmatter ?? true;
	let markdown = "";
	if (includeFrontmatter) {
		markdown += "---\n";
		markdown += `title: "${dbName.replace(/"/g, '\\"')}"\n`;
		if (createdDate) {
			markdown += `date: "${createdDate}"\n`;
		}
		markdown += `format: "PalmDoc PDB (${metadata.compression})"\n`;
		markdown += `creator: "${creatorFourCC.trim()}"\n`;
		markdown += "---\n\n";
	}

	markdown += `# ${dbName}\n\n${text}\n`;

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		markdown,
	};
}
