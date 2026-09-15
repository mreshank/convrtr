import type {
	CwkConversionOptions,
	CwkConversionResult,
	CwkMetadata,
} from "./types";

/**
 * Maps Mac OS Roman character codes (128..255) to Unicode characters.
 */
function decodeMacRomanByte(code: number): string {
	if (code < 128) {
		return String.fromCharCode(code);
	}
	const MAC_ROMAN_MAP: Record<number, string> = {
		128: "Ä",
		129: "Å",
		130: "Ç",
		131: "É",
		132: "Ñ",
		133: "Ö",
		134: "Ü",
		135: "á",
		136: "à",
		137: "â",
		138: "ä",
		139: "ã",
		140: "å",
		141: "ç",
		142: "é",
		143: "è",
		144: "ê",
		145: "ë",
		146: "í",
		147: "ì",
		148: "î",
		149: "ï",
		150: "ñ",
		151: "ó",
		152: "ò",
		153: "ô",
		154: "ö",
		155: "õ",
		156: "ú",
		157: "ù",
		158: "û",
		159: "ü",
		160: "†",
		161: "°",
		162: "¢",
		163: "£",
		164: "§",
		165: "•",
		166: "¶",
		167: "ß",
		168: "®",
		169: "©",
		170: "™",
		171: "´",
		172: "¨",
		173: "≠",
		174: "Æ",
		175: "Ø",
		176: "∞",
		177: "±",
		178: "≤",
		179: "≥",
		180: "¥",
		181: "µ",
		182: "∂",
		183: "∑",
		184: "∏",
		185: "π",
		186: "∫",
		187: "ª",
		188: "º",
		189: "Ω",
		190: "æ",
		191: "ø",
		192: "¿",
		193: "¡",
		194: "¬",
		195: "√",
		196: "ƒ",
		197: "≈",
		198: "∆",
		199: "«",
		200: "»",
		201: "…",
		202: " ",
		203: "À",
		204: "Ã",
		205: "Õ",
		206: "Œ",
		207: "œ",
		208: "–",
		209: "—",
		210: '"',
		211: '"',
		212: "'",
		213: "'",
		214: "÷",
		215: "◊",
		216: "ÿ",
		217: "Ÿ",
		218: "⁄",
		219: "€",
		220: "‹",
		221: "›",
		222: "ﬁ",
		223: "ﬂ",
		224: "‡",
		225: "·",
		226: "‚",
		227: "„",
		228: "‰",
		229: "Â",
		230: "Ê",
		231: "Á",
		232: "Ë",
		233: "È",
		234: "Í",
		235: "Î",
		236: "Ï",
		237: "Ì",
		238: "Ó",
		239: "Ô",
		240: "",
		241: "Ò",
		242: "Ú",
		243: "Û",
		244: "Ù",
		245: "ı",
		246: "ˆ",
		247: "˜",
		248: "¯",
		249: "˘",
		250: "˙",
		251: "˚",
		252: "¸",
		253: "˝",
		254: "˛",
		255: "ˇ",
	};
	return MAC_ROMAN_MAP[code] ?? "?";
}

function decodeMacRoman(bytes: Uint8Array): string {
	let result = "";
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i] ?? 0;
		// Map CR to LF, preserve tabs and standard printable ASCII
		if (b === 0x0d) {
			result += "\n";
		} else if (b === 0x0a || b === 0x09 || (b >= 0x20 && b <= 0x7e)) {
			result += String.fromCharCode(b);
		} else if (b >= 128) {
			result += decodeMacRomanByte(b);
		}
	}
	return result;
}

function decodeTextBytes(bytes: Uint8Array): string {
	try {
		return new TextDecoder("utf-8", { fatal: true })
			.decode(bytes)
			.replace(/\r/g, "\n");
	} catch {
		return decodeMacRoman(bytes);
	}
}

/**
 * Converts ClarisWorks / AppleWorks (.cwk) documents into clean GitHub Flavored Markdown.
 */
export function convertCwkToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: CwkConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): CwkConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const rawBytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (rawBytes.length < 32) {
		throw new Error(
			"Invalid CWK file: Buffer size is smaller than the minimum ClarisWorks header.",
		);
	}

	// 1. Check for MacBinary wrapper (128 bytes header)
	let payload = rawBytes;
	let macFileName = "";

	if (rawBytes.length > 128 && rawBytes[0] === 0) {
		const typeSig = String.fromCharCode(
			rawBytes[65] ?? 0,
			rawBytes[66] ?? 0,
			rawBytes[67] ?? 0,
			rawBytes[68] ?? 0,
		);
		const creatorSig = String.fromCharCode(
			rawBytes[69] ?? 0,
			rawBytes[70] ?? 0,
			rawBytes[71] ?? 0,
			rawBytes[72] ?? 0,
		);

		if (
			typeSig === "CWRK" ||
			creatorSig === "BOBO" ||
			typeSig === "CWDB" ||
			typeSig === "CWSS"
		) {
			// Extract filename from MacBinary header (offset 1, length at offset 1 or null-terminated)
			const nameLen = Math.min(63, rawBytes[1] ?? 0);
			if (nameLen > 0) {
				macFileName = new TextDecoder("ascii").decode(
					rawBytes.subarray(2, 2 + nameLen),
				);
			}
			payload = rawBytes.subarray(128);
		}
	}

	onProgress?.(0.2, "INSPECT_FORMAT");

	// 2. Validate ClarisWorks / AppleWorks signatures
	let hasValidSig = false;
	let documentType = "Word Processing";
	const versionStr = "ClarisWorks 4.0 / 5.0";

	// Look for BOBO signature or version markers in first 64 bytes
	const headChunk = payload.subarray(0, Math.min(64, payload.length));
	for (let i = 0; i < headChunk.length - 4; i++) {
		if (
			headChunk[i] === 0x42 &&
			headChunk[i + 1] === 0x4f &&
			headChunk[i + 2] === 0x42 &&
			headChunk[i + 3] === 0x4f
		) {
			hasValidSig = true;
			break;
		}
	}

	// Check standard ClarisWorks header codes
	const view = new DataView(
		payload.buffer,
		payload.byteOffset,
		payload.byteLength,
	);
	if (!hasValidSig && payload.length >= 8) {
		const w0 = view.getUint16(0, false);
		const w1 = view.getUint16(2, false);
		if ((w0 === 0 && (w1 === 1 || w1 === 2 || w1 === 4)) || w0 === 1) {
			hasValidSig = true;
		}
	}

	// Check doc type code
	if (payload.length >= 8) {
		const docTypeCode = view.getUint16(6, false);
		if (docTypeCode === 1) documentType = "Word Processing";
		else if (docTypeCode === 2) documentType = "Drawing";
		else if (docTypeCode === 3) documentType = "Painting";
		else if (docTypeCode === 4) documentType = "Spreadsheet";
		else if (docTypeCode === 5) documentType = "Database";
	}

	if (!hasValidSig && macFileName === "") {
		throw new Error(
			"Invalid ClarisWorks file: Missing 'BOBO' signature or ClarisWorks document header.",
		);
	}

	onProgress?.(0.4, "EXTRACT_TEXT_BLOCKS");

	// 3. Scan and extract text streams starting past the header block
	const textSpans: string[] = [];
	let currentSpan: number[] = [];

	const startScan = Math.min(32, payload.length);
	for (let i = startScan; i < payload.length; i++) {
		const b = payload[i] ?? 0;

		// Text characters in MacRoman: printable ASCII (32..126), tabs, newlines, or high characters (128..255)
		if (
			b === 0x0d ||
			b === 0x0a ||
			b === 0x09 ||
			(b >= 0x20 && b <= 0x7e) ||
			b >= 128
		) {
			currentSpan.push(b);
		} else {
			// Delimiter byte (e.g. 0x00, formatting tags, binary headers)
			if (currentSpan.length >= 3) {
				const decoded = decodeTextBytes(new Uint8Array(currentSpan)).trim();
				// Filter out short binary garbage, signature markers, or font metadata names
				if (
					decoded.length > 1 &&
					decoded !== "BOBO" &&
					decoded !== "CWRK" &&
					!decoded.startsWith("Arial") &&
					!decoded.startsWith("Helvetica") &&
					!decoded.startsWith("Times")
				) {
					textSpans.push(decoded);
				}
			}
			currentSpan = [];
		}
	}

	if (currentSpan.length >= 3) {
		const decoded = decodeTextBytes(new Uint8Array(currentSpan)).trim();
		if (decoded.length > 0) {
			textSpans.push(decoded);
		}
	}

	onProgress?.(0.7, "STRUCTURE_MARKDOWN");

	// 4. Assemble semantic paragraphs and headings
	const paragraphs: string[] = [];
	for (const span of textSpans) {
		const lines = span
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.length > 0);
		for (const line of lines) {
			// Deduplicate consecutive identical noise lines
			if (
				paragraphs.length === 0 ||
				paragraphs[paragraphs.length - 1] !== line
			) {
				paragraphs.push(line);
			}
		}
	}

	const docTitle =
		macFileName ||
		(paragraphs[0] && paragraphs[0].length < 80
			? paragraphs[0]
			: "Untitled ClarisWorks Document");

	let bodyMarkdown = "";
	for (let i = 0; i < paragraphs.length; i++) {
		const p = paragraphs[i];
		if (!p) continue;

		// Treat first short line as title / heading if appropriate
		if (i === 0 && p.length < 80 && !p.startsWith("#")) {
			bodyMarkdown += `# ${p}\n\n`;
		} else if (p.startsWith("•") || p.startsWith("-") || p.startsWith("*")) {
			// Bullet item
			bodyMarkdown += `- ${p.replace(/^[•\-*]\s*/, "")}\n\n`;
		} else if (
			p.length < 60 &&
			!p.endsWith(".") &&
			!p.endsWith(",") &&
			!p.startsWith("#")
		) {
			// Subheading candidate
			bodyMarkdown += `## ${p}\n\n`;
		} else {
			bodyMarkdown += `${p}\n\n`;
		}
	}

	onProgress?.(0.9, "EMIT_MARKDOWN");

	let markdown = "";
	if (options.includeFrontmatter !== false) {
		markdown += "---\n";
		markdown += `title: ${JSON.stringify(docTitle)}\n`;
		markdown += `documentType: ${JSON.stringify(documentType)}\n`;
		markdown += `format: "ClarisWorks / AppleWorks (.cwk)"\n`;
		markdown += `paragraphs: ${paragraphs.length}\n`;
		markdown += "---\n\n";
	}
	markdown += `${bodyMarkdown.trim()}\n`;

	const metadata: CwkMetadata = {
		title: docTitle,
		documentType,
		version: versionStr,
		characterCount: markdown.length,
		paragraphCount: paragraphs.length,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		metadata,
	};
}
