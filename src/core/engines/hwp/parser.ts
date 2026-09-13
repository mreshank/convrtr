import { decompressSync, inflateSync } from "fflate";
import type {
	HwpConversionOptions,
	HwpConversionResult,
	HwpMetadata,
} from "./types";

const OLE_SIGNATURE = [
	0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
];

interface CfbEntry {
	name: string;
	type: number; // 1 = storage, 2 = stream, 5 = root
	startSector: number;
	size: number;
}

/**
 * Parses an OLE 2.0 Compound File Binary (CFB) stream directory.
 */
function parseCfbDirectory(
	bytes: Uint8Array,
): { entries: CfbEntry[]; sectorSize: number; fat: number[] } {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Sector size: offset 30 is sector shift (usually 9 -> 512 bytes)
	const sectorShift = view.getUint16(30, true);
	const sectorSize = 1 << sectorShift;

	const numFatSectors = view.getUint32(44, true);
	const firstDirSector = view.getUint32(48, true);

	// Read initial 109 MSAT sector pointers from header (offset 76)
	const fatSectorIds: number[] = [];
	for (let i = 0; i < Math.min(109, numFatSectors); i++) {
		const sId = view.getUint32(76 + i * 4, true);
		if (sId < 0xfffffffa) {
			fatSectorIds.push(sId);
		}
	}

	// Build FAT table
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

	// Read Directory entries stream
	const dirSectors: number[] = [];
	let currDirSec = firstDirSector;
	const maxLoop = 1000;
	let loop = 0;
	while (currDirSec < 0xfffffffa && loop++ < maxLoop) {
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

	// Parse 128-byte directory entries
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

		// UTF-16LE name
		const rawNameBytes = dirBytes.subarray(eOffset, eOffset + nameLen - 2);
		let name = "";
		for (let c = 0; c < rawNameBytes.length; c += 2) {
			const charCode = (rawNameBytes[c]! | (rawNameBytes[c + 1]! << 8));
			if (charCode > 0) name += String.fromCharCode(charCode);
		}

		const type = dirBytes[eOffset + 66]!;
		const startSector = dirView.getUint32(eOffset + 116, true);
		const size = dirView.getUint32(eOffset + 120, true);

		entries.push({
			name,
			type,
			startSector,
			size,
		});
	}

	return { entries, sectorSize, fat };
}

/**
 * Reads stream payload from FAT sector chain.
 */
function readStreamPayload(
	bytes: Uint8Array,
	startSector: number,
	size: number,
	sectorSize: number,
	fat: number[],
): Uint8Array {
	const out = new Uint8Array(size);
	let currSector = startSector;
	let written = 0;
	let loop = 0;

	while (currSector < 0xfffffffa && written < size && loop++ < 10000) {
		const sOffset = 512 + currSector * sectorSize;
		if (sOffset >= bytes.length) break;

		const toCopy = Math.min(sectorSize, size - written);
		out.set(bytes.subarray(sOffset, sOffset + toCopy), written);
		written += toCopy;

		currSector = fat[currSector] ?? 0xfffffffe;
	}

	return out;
}

/**
 * Cleans HWP UTF-16LE text by filtering out proprietary control markers
 * and mapping formatting tags to standard spaces and newlines.
 */
function cleanHwpText(rawChars: string): string {
	let text = "";
	for (let i = 0; i < rawChars.length; i++) {
		const code = rawChars.charCodeAt(i);
		// HWP control codes:
		// 0..8, 11..12, 14..31 are control characters or object placeholders
		if (code === 10 || code === 13) {
			text += "\n";
		} else if (code === 9) {
			text += "\t";
		} else if (code < 32) {
			// Inline control code (e.g. table, drawing, field, section break)
			if (code === 24 || code === 10) {
				text += "\n";
			} else {
				text += " ";
			}
		} else {
			text += rawChars[i];
		}
	}
	return text;
}

/**
 * Converts Hangul Word Processor (.hwp 5.x) documents into clean GitHub Flavored Markdown.
 */
export function convertHwpToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: HwpConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): HwpConversionResult {
	onProgress?.(0.05, "READ_CONTAINER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 512) {
		throw new Error(
			"Invalid HWP file: File size is smaller than the 512-byte OLE CFB header.",
		);
	}

	// Verify OLE signature
	let isOle = true;
	for (let i = 0; i < 8; i++) {
		if (bytes[i] !== OLE_SIGNATURE[i]) {
			isOle = false;
			break;
		}
	}

	if (!isOle) {
		// Fallback: check if raw HWP Document Header exists directly
		const sigStr = new TextDecoder("ascii").decode(bytes.subarray(0, 17));
		if (!sigStr.startsWith("HWP Document File")) {
			throw new Error(
				"Invalid HWP file: Missing OLE Compound Document signature or HWP header.",
			);
		}
	}

	onProgress?.(0.15, "PARSE_DIRECTORY");

	const { entries, sectorSize, fat } = parseCfbDirectory(bytes);

	// 1. Locate FileHeader stream
	const fileHeaderEntry = entries.find((e) => e.name === "FileHeader");
	let isCompressed = false;
	let version = "5.0";

	if (fileHeaderEntry && fileHeaderEntry.size >= 36) {
		const headerData = readStreamPayload(
			bytes,
			fileHeaderEntry.startSector,
			fileHeaderEntry.size,
			sectorSize,
			fat,
		);
		const sig = new TextDecoder("ascii").decode(headerData.subarray(0, 17));
		if (!sig.startsWith("HWP Document File")) {
			throw new Error(
				`Invalid HWP Document Header: Expected 'HWP Document File', found '${sig}'.`,
			);
		}

		// Flags at offset 36 (bit 0 = 1 if compressed)
		if (headerData.length > 36) {
			const flags = headerData[36]!;
			isCompressed = (flags & 1) !== 0;
		}

		// Version at offset 32 (4 bytes: major.minor.build.revision)
		if (headerData.length >= 36) {
			const major = headerData[35]!;
			const minor = headerData[34]!;
			version = `${major}.${minor}`;
		}
	}

	onProgress?.(0.3, "EXTRACT_SECTIONS");

	// 2. Locate BodyText Section streams (e.g. Section0, Section1...)
	const sectionEntries = entries.filter(
		(e) => e.type === 2 && e.name.toLowerCase().startsWith("section"),
	);

	if (sectionEntries.length === 0) {
		// Try finding any stream with section in the path
		const anySection = entries.find(
			(e) => e.type === 2 && e.name.includes("Section"),
		);
		if (anySection) sectionEntries.push(anySection);
	}

	const paragraphs: string[] = [];

	for (let sIdx = 0; sIdx < sectionEntries.length; sIdx++) {
		const sEntry = sectionEntries[sIdx]!;
		const rawSection = readStreamPayload(
			bytes,
			sEntry.startSector,
			sEntry.size,
			sectorSize,
			fat,
		);

		let sectionData = rawSection;
		if (isCompressed && rawSection.length > 0) {
			try {
				sectionData = inflateSync(rawSection);
			} catch {
				try {
					sectionData = decompressSync(rawSection);
				} catch {
					sectionData = rawSection;
				}
			}
		}

		onProgress?.(
			0.3 + 0.4 * ((sIdx + 1) / Math.max(1, sectionEntries.length)),
			"PARSE_PARAGRAPHS",
		);

		// Parse HWP Records in Section stream
		// Header (4 bytes): tag (10 bits), level (10 bits), size (12 bits)
		const sView = new DataView(
			sectionData.buffer,
			sectionData.byteOffset,
			sectionData.byteLength,
		);
		let ptr = 0;

		while (ptr + 4 <= sectionData.length) {
			const recordHead = sView.getUint32(ptr, true);
			ptr += 4;

			const tagId = recordHead & 0x3ff;
			let recordSize = (recordHead >> 20) & 0xfff;

			if (recordSize === 0xfff && ptr + 4 <= sectionData.length) {
				recordSize = sView.getUint32(ptr, true);
				ptr += 4;
			}

			if (ptr + recordSize > sectionData.length) {
				recordSize = sectionData.length - ptr;
			}

			const recordPayload = sectionData.subarray(ptr, ptr + recordSize);
			ptr += recordSize;

			// Tag 68 = HWPTAG_PARA_TEXT (Paragraph text)
			if (tagId === 68 && recordPayload.length >= 2) {
				// UTF-16LE text payload
				let rawText = "";
				for (let c = 0; c < recordPayload.length - 1; c += 2) {
					const code = (recordPayload[c]! | (recordPayload[c + 1]! << 8));
					rawText += String.fromCharCode(code);
				}

				const cleaned = cleanHwpText(rawText).trim();
				if (cleaned.length > 0) {
					paragraphs.push(cleaned);
				}
			}
		}
	}

	onProgress?.(0.85, "BUILD_MARKDOWN");

	// Deduce title from the first paragraph or generic fallback
	const firstPara = paragraphs[0]?.split("\n")[0]?.trim();
	const title =
		firstPara && firstPara.length < 80 ? firstPara : "Hangul Document";

	const includeFrontmatter = options.includeFrontmatter ?? true;
	let markdown = "";

	if (includeFrontmatter) {
		markdown += "---\n";
		markdown += `title: "${title.replace(/"/g, '\\"')}"\n`;
		markdown += `format: "Hangul Word Processor (HWP ${version})"\n`;
		markdown += `sections: ${Math.max(1, sectionEntries.length)}\n`;
		markdown += `paragraphs: ${paragraphs.length}\n`;
		markdown += "---\n\n";
	}

	markdown += `# ${title}\n\n`;

	// Format paragraphs
	for (let i = 0; i < paragraphs.length; i++) {
		const p = paragraphs[i]!;
		if (p === title && i === 0) continue;

		// If paragraph is short and looks like a chapter/section heading
		if (p.length < 60 && !p.endsWith(".") && !p.includes("\n")) {
			if (/^[0-9]+[\.\s]|^[I|V|X]+[\.\s]|제\s*[0-9]+\s*장/.test(p)) {
				markdown += `## ${p}\n\n`;
				continue;
			}
		}

		markdown += `${p}\n\n`;
	}

	onProgress?.(1.0, "COMPLETE");

	const metadata: HwpMetadata = {
		title,
		version,
		compressed: isCompressed,
		sectionCount: Math.max(1, sectionEntries.length),
		paragraphCount: paragraphs.length,
	};

	return {
		metadata,
		markdown: markdown.trim() + "\n",
	};
}
