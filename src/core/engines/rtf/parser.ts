import type {
	RtfConversionResult,
	RtfMetadata,
	RtfToMarkdownOptions,
} from "./types";

interface RtfState {
	bold: boolean;
	italic: boolean;
	strike: boolean;
	fontSize: number; // in half-points (e.g. 24 = 12pt, 36 = 18pt)
	ignore: boolean;
	destination?: string;
	ucCount: number;
}

const IGNORED_DESTINATIONS = new Set([
	"fonttbl",
	"colortbl",
	"stylesheet",
	"info",
	"pict",
	"object",
	"generator",
	"xmlnstbl",
	"themedata",
	"colorschememapping",
	"listtable",
	"listoverridetable",
	"rsidtbl",
	"datastore",
	"panose",
]);

/**
 * Parses and converts Microsoft Rich Text Format (.rtf) text or binary bytes
 * into clean, semantic GitHub Flavored Markdown with optional YAML frontmatter.
 */
export function convertRtfToMarkdown(
	input: Uint8Array | ArrayBuffer | string,
	options: RtfToMarkdownOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): RtfConversionResult {
	onProgress?.(0.1, "READ_INPUT");
	let text = "";
	if (typeof input === "string") {
		text = input;
	} else {
		const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
		text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
	}

	if (!text.trim().startsWith("{\\rtf")) {
		throw new Error(
			"Invalid RTF document: File does not begin with '{\\rtf' header.",
		);
	}

	onProgress?.(0.3, "PARSE_TOKENS");

	// Metadata extraction pass
	let docTitle = options.documentTitle;
	let docAuthor: string | undefined;
	let docGenerator: string | undefined;

	const titleMatch = text.match(/{\\title\s+([^}]+)}/i);
	if (titleMatch?.[1]) {
		docTitle = titleMatch[1].trim();
	}
	const authorMatch = text.match(/{\\author\s+([^}]+)}/i);
	if (authorMatch?.[1]) {
		docAuthor = authorMatch[1].trim();
	}
	const generatorMatch = text.match(/{\\\*\\generator\s+([^}]+)}/i);
	if (generatorMatch?.[1]) {
		docGenerator = generatorMatch[1].trim();
	}

	// Lexing and state machine
	const stack: RtfState[] = [];
	let currentState: RtfState = {
		bold: false,
		italic: false,
		strike: false,
		fontSize: 24, // 12pt default
		ignore: false,
		ucCount: 1,
	};

	let output = "";
	let paragraphCount = 0;
	let i = 0;
	const len = text.length;

	let currentBlock = "";
	let blockBold = false;
	let blockItalic = false;
	let blockStrike = false;

	function flushBlock() {
		if (currentBlock.length === 0) return;
		let formatted = currentBlock;
		if (blockBold) formatted = `**${formatted}**`;
		if (blockItalic) formatted = `*${formatted}*`;
		if (blockStrike) formatted = `~~${formatted}~~`;
		output += formatted;
		currentBlock = "";
	}

	function appendChar(char: string) {
		if (currentState.ignore) return;
		if (
			currentState.bold !== blockBold ||
			currentState.italic !== blockItalic ||
			currentState.strike !== blockStrike
		) {
			flushBlock();
			blockBold = currentState.bold;
			blockItalic = currentState.italic;
			blockStrike = currentState.strike;
		}
		currentBlock += char;
	}

	while (i < len) {
		const ch = text[i];

		if (ch === "{") {
			// Push group
			stack.push({ ...currentState });
			i++;
			// Check if this group starts with a destination keyword
			if (text[i] === "\\" && text[i + 1] === "*") {
				i += 2; // skip \*
				if (text[i] === "\\") {
					i++;
					// Read destination name
					let dest = "";
					while (i < len && /[a-z]/i.test(text[i] ?? "")) {
						dest += text[i];
						i++;
					}
					if (text[i] === " ") i++; // optional trailing space
					currentState.destination = dest.toLowerCase();
					currentState.ignore = true;
				}
			}
			continue;
		}

		if (ch === "}") {
			flushBlock();
			// Pop group
			const prev = stack.pop();
			if (prev) {
				currentState = prev;
			}
			i++;
			continue;
		}

		if (ch === "\\") {
			i++;
			if (i >= len) break;
			const nextCh = text[i];

			// Escaped literals: \\, \{, \}
			if (nextCh === "\\" || nextCh === "{" || nextCh === "}") {
				appendChar(nextCh);
				i++;
				continue;
			}

			// Hex escape: \'xx
			if (nextCh === "'") {
				i++;
				const hex = text.substring(i, i + 2);
				i += 2;
				const byteVal = Number.parseInt(hex, 16);
				if (!Number.isNaN(byteVal)) {
					// Fallback to Latin-1 char
					appendChar(String.fromCharCode(byteVal));
				}
				continue;
			}

			// Symbol controls
			if (nextCh === "~") {
				appendChar(" "); // non-breaking space
				i++;
				continue;
			}
			if (nextCh === "_") {
				appendChar("-"); // non-breaking hyphen
				i++;
				continue;
			}

			// Control word: alphabetic string + optional numeric parameter
			let word = "";
			while (i < len && /[a-z]/i.test(text[i] ?? "")) {
				word += text[i];
				i++;
			}

			let hasParam = false;
			let paramStr = "";
			if (i < len && (text[i] === "-" || /[0-9]/.test(text[i] ?? ""))) {
				hasParam = true;
				paramStr += text[i];
				i++;
				while (i < len && /[0-9]/.test(text[i] ?? "")) {
					paramStr += text[i];
					i++;
				}
			}
			const param = hasParam ? Number.parseInt(paramStr, 10) : undefined;

			// Optional delimiter space
			if (i < len && text[i] === " ") {
				i++;
			}

			const lowerWord = word.toLowerCase();

			// Destination check
			if (IGNORED_DESTINATIONS.has(lowerWord)) {
				currentState.ignore = true;
				currentState.destination = lowerWord;
				continue;
			}

			if (currentState.ignore) {
				continue;
			}

			// Semantic controls
			if (lowerWord === "par") {
				flushBlock();
				output += "\n\n";
				paragraphCount++;
			} else if (lowerWord === "line") {
				flushBlock();
				output += "  \n";
			} else if (lowerWord === "tab") {
				appendChar("  ");
			} else if (lowerWord === "bullet") {
				flushBlock();
				output += "\n- ";
				while (i < len && text[i] === " ") {
					i++;
				}
			} else if (lowerWord === "emdash") {
				appendChar("—");
			} else if (lowerWord === "endash") {
				appendChar("–");
			} else if (lowerWord === "ldblquote") {
				appendChar("“");
			} else if (lowerWord === "rdblquote") {
				appendChar("”");
			} else if (lowerWord === "lquote") {
				appendChar("‘");
			} else if (lowerWord === "rquote") {
				appendChar("’");
			} else if (lowerWord === "b") {
				flushBlock();
				currentState.bold = param !== 0;
			} else if (lowerWord === "i") {
				flushBlock();
				currentState.italic = param !== 0;
			} else if (lowerWord === "strike") {
				flushBlock();
				currentState.strike = param !== 0;
			} else if (lowerWord === "fs") {
				if (param !== undefined) {
					currentState.fontSize = param;
				}
			} else if (lowerWord === "uc") {
				if (param !== undefined) {
					currentState.ucCount = param;
				}
			} else if (lowerWord === "u") {
				if (param !== undefined) {
					let code = param;
					if (code < 0) code += 65536;
					appendChar(String.fromCharCode(code));
					// Skip fallback characters declared by ucCount
					for (let k = 0; k < currentState.ucCount && i < len; k++) {
						if (text[i] === "\\") {
							// If fallback is an escaped character or command, skip it
							break;
						}
						i++;
					}
				}
			}
			continue;
		}

		// Regular character content (strip raw CR/LF from RTF encoding)
		if (ch && ch !== "\r" && ch !== "\n") {
			appendChar(ch);
		}
		i++;
	}

	flushBlock();
	onProgress?.(0.8, "CLEAN_MARKDOWN");

	// Clean up extra blank lines
	let cleanMarkdown = output
		.replace(/\r\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/^- +/gm, "- ")
		.trim();

	// Convert large standalone bold lines into headings (e.g. >16pt title)
	cleanMarkdown = cleanMarkdown.replace(
		/^\*\*(.+?)\*\*$/gm,
		(match, titleText) => {
			if (titleText.length < 80 && !titleText.includes("\n")) {
				return `## ${titleText}`;
			}
			return match;
		},
	);

	// Build frontmatter if requested
	if (options.includeFrontmatter !== false) {
		const frontmatterLines: string[] = ["---"];
		if (docTitle) {
			frontmatterLines.push(`title: ${JSON.stringify(docTitle)}`);
		}
		if (docAuthor) {
			frontmatterLines.push(`author: ${JSON.stringify(docAuthor)}`);
		}
		if (docGenerator) {
			frontmatterLines.push(`generator: ${JSON.stringify(docGenerator)}`);
		}
		frontmatterLines.push("format: rtf-to-markdown");
		frontmatterLines.push("---");
		frontmatterLines.push("");

		cleanMarkdown = `${frontmatterLines.join("\n")}\n${cleanMarkdown}`;
	}

	const metadata: RtfMetadata = {
		title: docTitle,
		author: docAuthor,
		generator: docGenerator,
		characterCount: cleanMarkdown.length,
		paragraphCount: Math.max(1, paragraphCount),
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		markdownText: cleanMarkdown,
	};
}
