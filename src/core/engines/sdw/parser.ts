import type {
	SdwConversionOptions,
	SdwConversionResult,
	SdwMetadata,
} from "./types";

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

interface CfbEntry {
	name: string;
	type: number; // 1 = storage, 2 = stream, 5 = root
	startSector: number;
	size: number;
}

/**
 * Parses an OLE 2.0 Compound File Binary (CFB) stream directory.
 */
function parseCfbDirectory(bytes: Uint8Array): {
	entries: CfbEntry[];
	sectorSize: number;
	fat: number[];
} {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	const sectorShift = view.getUint16(30, true);
	const sectorSize = 1 << sectorShift;

	const numFatSectors = view.getUint32(44, true);
	const firstDirSector = view.getUint32(48, true);

	const fatSectorIds: number[] = [];
	for (let i = 0; i < Math.min(109, numFatSectors); i++) {
		const sId = view.getUint32(76 + i * 4, true);
		if (sId < 0xfffffffa) {
			fatSectorIds.push(sId);
		}
	}

	const fat: number[] = [];
	for (const sId of fatSectorIds) {
		const sOffset = 512 + sId * sectorSize;
		if (sOffset + sectorSize <= bytes.length) {
			const numEntries = sectorSize / 4;
			for (let e = 0; e < numEntries; e++) {
				fat.push(view.getUint32(sOffset + e * 4, true));
			}
		}
	}

	const dirSectors: number[] = [];
	let currDirSec = firstDirSector;
	let loop = 0;
	while (currDirSec < 0xfffffffa && loop++ < 1000) {
		dirSectors.push(currDirSec);
		currDirSec = fat[currDirSec] ?? 0xfffffffe;
	}

	const dirBytes = new Uint8Array(dirSectors.length * sectorSize);
	let dOffset = 0;
	for (const sId of dirSectors) {
		const sOffset = 512 + sId * sectorSize;
		if (sOffset + sectorSize <= bytes.length) {
			dirBytes.set(bytes.subarray(sOffset, sOffset + sectorSize), dOffset);
		}
		dOffset += sectorSize;
	}

	const dirView = new DataView(
		dirBytes.buffer,
		dirBytes.byteOffset,
		dirBytes.byteLength,
	);
	const numEntries = Math.floor(dirBytes.length / 128);
	const entries: CfbEntry[] = [];

	for (let i = 0; i < numEntries; i++) {
		const eOffset = i * 128;
		const nameLen = dirView.getUint16(eOffset + 64, true);
		if (nameLen < 2 || nameLen > 64) continue;

		const rawNameBytes = dirBytes.subarray(eOffset, eOffset + nameLen - 2);
		let name = "";
		for (let c = 0; c < rawNameBytes.length; c += 2) {
			const charCode =
				(rawNameBytes[c] ?? 0) | ((rawNameBytes[c + 1] ?? 0) << 8);
			if (charCode > 0) name += String.fromCharCode(charCode);
		}

		const type = dirBytes[eOffset + 66] ?? 0;
		const startSector = dirView.getUint32(eOffset + 116, true);
		const size = dirView.getUint32(eOffset + 120, true);

		entries.push({ name, type, startSector, size });
	}

	return { entries, sectorSize, fat };
}

/**
 * Extracts raw stream payload from FAT sector chain.
 */
function readStreamPayload(
	bytes: Uint8Array,
	entry: CfbEntry,
	sectorSize: number,
	fat: number[],
): Uint8Array {
	if (entry.size <= 0 || entry.startSector >= 0xfffffffa) {
		return new Uint8Array(0);
	}

	const streamSectors: number[] = [];
	let curr = entry.startSector;
	let loop = 0;
	while (curr < 0xfffffffa && loop++ < 10000) {
		streamSectors.push(curr);
		curr = fat[curr] ?? 0xfffffffe;
	}

	const out = new Uint8Array(entry.size);
	let outOffset = 0;
	for (const sId of streamSectors) {
		const sOffset = 512 + sId * sectorSize;
		if (sOffset >= bytes.length) break;
		const bytesToCopy = Math.min(sectorSize, entry.size - outOffset);
		if (bytesToCopy <= 0) break;
		out.set(bytes.subarray(sOffset, sOffset + bytesToCopy), outOffset);
		outOffset += bytesToCopy;
	}

	return out;
}

/**
 * Parses OLE \x05SummaryInformation property set stream.
 */
function parseSummaryInformation(stream: Uint8Array): Partial<SdwMetadata> {
	const meta: Partial<SdwMetadata> = {};
	if (stream.length < 48) return meta;

	const view = new DataView(
		stream.buffer,
		stream.byteOffset,
		stream.byteLength,
	);
	const sectionOffset = view.getUint32(44, true);
	if (sectionOffset + 8 > stream.length) return meta;

	const propCount = view.getUint32(sectionOffset + 4, true);
	let cursor = sectionOffset + 8;

	for (let i = 0; i < propCount && cursor + 8 <= stream.length; i++) {
		const propId = view.getUint32(cursor, true);
		const propOffset = view.getUint32(cursor + 4, true);
		cursor += 8;

		const valuePos = sectionOffset + propOffset;
		if (valuePos + 4 > stream.length) continue;

		const type = view.getUint32(valuePos, true);
		// Type 30 = VT_LPSTR (null-terminated byte string)
		// Type 31 = VT_LPWSTR (null-terminated UTF-16LE)
		if (type === 30 && valuePos + 8 <= stream.length) {
			const strLen = view.getUint32(valuePos + 4, true);
			const strBytes = stream.subarray(
				valuePos + 8,
				Math.min(stream.length, valuePos + 8 + strLen),
			);
			const val = new TextDecoder("latin1")
				.decode(strBytes)
				.replace(/\0+$/, "")
				.trim();
			if (propId === 2) meta.title = val;
			else if (propId === 3) meta.subject = val;
			else if (propId === 4) meta.author = val;
			else if (propId === 5) meta.keywords = val;
			else if (propId === 6) meta.comments = val;
		} else if (type === 31 && valuePos + 8 <= stream.length) {
			const wLen = view.getUint32(valuePos + 4, true);
			const strBytes = stream.subarray(
				valuePos + 8,
				Math.min(stream.length, valuePos + 8 + wLen * 2),
			);
			const val = new TextDecoder("utf-16le")
				.decode(strBytes)
				.replace(/\0+$/, "")
				.trim();
			if (propId === 2) meta.title = val;
			else if (propId === 3) meta.subject = val;
			else if (propId === 4) meta.author = val;
			else if (propId === 5) meta.keywords = val;
			else if (propId === 6) meta.comments = val;
		} else if (type === 3 && valuePos + 8 <= stream.length) {
			// VT_I4 integer
			const num = view.getInt32(valuePos + 4, true);
			if (propId === 14) meta.pageCount = num;
			else if (propId === 15) meta.wordCount = num;
		}
	}

	return meta;
}

/**
 * Extracts textual content from StarWriter binary payload streams.
 */
function extractStarWriterText(payload: Uint8Array): string[] {
	const paragraphs: string[] = [];

	// StarWriter uses chunks of text runs with 16-bit or 8-bit length prefixes or null terminators.
	// We extract both ASCII/Latin-1 strings and UTF-16LE runs.
	let currentRun: number[] = [];

	for (let i = 0; i < payload.length; i++) {
		const b = payload[i] ?? 0;

		// Printable ASCII or Latin-1 high characters
		if (
			(b >= 32 && b <= 126) ||
			(b >= 160 && b <= 255) ||
			b === 9 ||
			b === 10
		) {
			currentRun.push(b);
		} else if (b === 0 && currentRun.length > 0) {
			// Check if previous was UTF-16LE (alternating byte and zero)
			if (currentRun.length >= 4) {
				const str = new TextDecoder("latin1")
					.decode(new Uint8Array(currentRun))
					.trim();
				if (str.length > 2) {
					paragraphs.push(str);
				}
			}
			currentRun = [];
		} else {
			if (currentRun.length >= 4) {
				const str = new TextDecoder("latin1")
					.decode(new Uint8Array(currentRun))
					.trim();
				if (str.length > 2) {
					paragraphs.push(str);
				}
			}
			currentRun = [];
		}
	}

	if (currentRun.length >= 4) {
		const str = new TextDecoder("latin1")
			.decode(new Uint8Array(currentRun))
			.trim();
		if (str.length > 2) {
			paragraphs.push(str);
		}
	}

	// Filter out internal binary/font signature strings
	const filtered = paragraphs.filter((p) => {
		const low = p.toLowerCase();
		if (low.startsWith("staroffice") || low.startsWith("starwriter"))
			return false;
		if (
			low.startsWith("times new roman") ||
			low.startsWith("arial") ||
			low.startsWith("courier")
		)
			return false;
		if (low.includes("font") && p.length < 15) return false;
		return true;
	});

	return filtered;
}

/**
 * Parses a StarWriter / StarOffice document (.sdw) into GitHub Flavored Markdown.
 */
export function convertSdwToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: SdwConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): SdwConversionResult {
	onProgress?.(0.1, "CHECK_CONTAINER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 64) {
		throw new Error(
			"Invalid SDW file: Buffer too small for StarWriter document.",
		);
	}

	const isOle = OLE_SIGNATURE.every((val, idx) => bytes[idx] === val);
	const textLines: string[] = [];
	let meta: SdwMetadata = {};

	if (isOle) {
		onProgress?.(0.25, "PARSE_OLE_DIRECTORY");
		const { entries, sectorSize, fat } = parseCfbDirectory(bytes);

		// Read summary information stream
		const sumEntry = entries.find(
			(e) =>
				e.name === "\x05SummaryInformation" ||
				e.name.includes("SummaryInformation"),
		);
		if (sumEntry) {
			onProgress?.(0.4, "READ_METADATA");
			const sumPayload = readStreamPayload(bytes, sumEntry, sectorSize, fat);
			const parsedMeta = parseSummaryInformation(sumPayload);
			meta = { ...meta, ...parsedMeta };
		}

		// Find main StarWriter document stream
		const docEntry =
			entries.find(
				(e) =>
					e.name === "StarWriterDocument" ||
					e.name === "WordDocument" ||
					e.name === "Content" ||
					e.name.toLowerCase().includes("writer") ||
					e.name.toLowerCase().includes("document"),
			) ??
			// Fallback to largest stream in directory
			entries
				.filter((e) => e.type === 2 && e.size > 0 && !e.name.startsWith("\x05"))
				.sort((a, b) => b.size - a.size)[0];

		if (docEntry) {
			onProgress?.(0.6, "EXTRACT_TEXT_STREAMS");
			const docPayload = readStreamPayload(bytes, docEntry, sectorSize, fat);
			const extracted = extractStarWriterText(docPayload);
			textLines.push(...extracted);
		}
	} else {
		// Non-OLE StarWriter stream / flat binary
		onProgress?.(0.5, "PARSE_RAW_STREAM");
		const extracted = extractStarWriterText(bytes);
		textLines.push(...extracted);
	}

	onProgress?.(0.8, "FORMAT_MARKDOWN");

	// Deduplicate contiguous identical lines and clean noise
	const cleanParagraphs: string[] = [];
	for (let i = 0; i < textLines.length; i++) {
		const current = textLines[i];
		if (!current) continue;
		const prev = cleanParagraphs[cleanParagraphs.length - 1];
		if (current !== prev) {
			cleanParagraphs.push(current);
		}
	}

	// Semantic markup detection (headings, lists)
	const markdownBlocks: string[] = [];
	let paragraphCount = 0;
	let wordCount = 0;

	for (const p of cleanParagraphs) {
		paragraphCount++;
		wordCount += p.split(/\s+/).filter(Boolean).length;

		// Headings (short lines, uppercase or capitalized without period)
		if (
			p.length < 60 &&
			!p.endsWith(".") &&
			!p.endsWith(",") &&
			(p.toUpperCase() === p || !p.includes(" "))
		) {
			markdownBlocks.push(`## ${p}\n`);
		} else if (p.startsWith("- ") || p.startsWith("* ") || /^\d+\.\s/.test(p)) {
			markdownBlocks.push(p);
		} else {
			markdownBlocks.push(`${p}\n`);
		}
	}

	meta.paragraphCount = paragraphCount;
	meta.wordCount = wordCount;

	// Build YAML Frontmatter if enabled
	const includeFrontmatter = options.includeFrontmatter !== false;
	const frontmatterParts: string[] = [];

	if (includeFrontmatter) {
		if (meta.title)
			frontmatterParts.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
		if (meta.author)
			frontmatterParts.push(`author: "${meta.author.replace(/"/g, '\\"')}"`);
		if (meta.subject)
			frontmatterParts.push(`subject: "${meta.subject.replace(/"/g, '\\"')}"`);
		if (meta.keywords)
			frontmatterParts.push(
				`keywords: "${meta.keywords.replace(/"/g, '\\"')}"`,
			);
		if (meta.comments)
			frontmatterParts.push(
				`comments: "${meta.comments.replace(/"/g, '\\"')}"`,
			);
		if (meta.pageCount) frontmatterParts.push(`pageCount: ${meta.pageCount}`);
		if (meta.wordCount) frontmatterParts.push(`wordCount: ${meta.wordCount}`);
	}

	let markdown = "";
	if (frontmatterParts.length > 0) {
		markdown += `---\n${frontmatterParts.join("\n")}\n---\n\n`;
	}

	markdown += markdownBlocks.join("\n").trim();
	if (markdown.length === 0) {
		markdown = "(Empty document)";
	}

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		metadata: meta,
	};
}
