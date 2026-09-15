import type {
	NbConversionOptions,
	NbConversionResult,
	NbMetadata,
} from "./types";

const WOLFRAM_CHAR_MAP: Record<string, string> = {
	Alpha: "α",
	Beta: "β",
	Gamma: "γ",
	Delta: "δ",
	Epsilon: "ε",
	Zeta: "ζ",
	Eta: "η",
	Theta: "θ",
	Iota: "ι",
	Kappa: "κ",
	Lambda: "λ",
	Mu: "μ",
	Nu: "ν",
	Xi: "ξ",
	Omicron: "ο",
	Pi: "π",
	Rho: "ρ",
	Sigma: "σ",
	Tau: "τ",
	Upsilon: "υ",
	Phi: "φ",
	Chi: "χ",
	Psi: "ψ",
	Omega: "ω",
	ODoubleDot: "ö",
	UDoubleDot: "ü",
	ADoubleDot: "ä",
	oDoubleDot: "ö",
	uDoubleDot: "ü",
	aDoubleDot: "ä",
	EAcute: "é",
	eAcute: "é",
	Infinity: "∞",
	RightArrow: "->",
	Rule: "->",
	RuleDelayed: ":>",
	LeftArrow: "<-",
	Equal: "==",
	NotEqual: "!=",
	LessEqual: "<=",
	GreaterEqual: ">=",
	Element: "∈",
	NotElement: "∉",
	Integral: "∫",
	Sum: "∑",
	Product: "∏",
	PartialD: "∂",
	Times: "×",
	Divide: "÷",
	PlusMinus: "±",
	MinusPlus: "∓",
	Cross: "×",
	CenterDot: "·",
	Sqrt: "√",
	Micro: "µ",
	Degree: "°",
};

/**
 * Decodes Wolfram special character escape sequences like `\[Alpha]` and `\.xx` hex bytes.
 */
export function decodeWolframText(raw: string): string {
	let text = raw;

	// Replace named entities: \[Name]
	text = text.replace(/\\\[([a-zA-Z0-9]+)\]/g, (_, name: string) => {
		return WOLFRAM_CHAR_MAP[name] ?? `[${name}]`;
	});

	// Replace 2-digit hex escapes: \.xx
	text = text.replace(/\\\.([0-9a-fA-F]{2})/g, (_, hex: string) => {
		try {
			const code = Number.parseInt(hex, 16);
			return String.fromCharCode(code);
		} catch {
			return hex;
		}
	});

	// Replace 4-digit hex escapes: \:xxxx
	text = text.replace(/\\:([0-9a-fA-F]{4})/g, (_, hex: string) => {
		try {
			const code = Number.parseInt(hex, 16);
			return String.fromCharCode(code);
		} catch {
			return hex;
		}
	});

	// Unescape standard C escapes
	text = text
		.replace(/\\n/g, "\n")
		.replace(/\\t/g, "\t")
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, "\\");

	return text;
}

/**
 * Extracts balanced bracketed arguments: Foo[a, b, c]
 */
function extractBalancedExpression(
	source: string,
	startIndex: number,
	openChar = "[",
	closeChar = "]",
): { content: string; endIndex: number } | null {
	let depth = 0;
	let inString = false;
	let isEscaped = false;
	let startPos = -1;

	for (let i = startIndex; i < source.length; i++) {
		const char = source[i];

		if (isEscaped) {
			isEscaped = false;
			continue;
		}
		if (char === "\\" && inString) {
			isEscaped = true;
			continue;
		}
		if (char === '"') {
			inString = !inString;
			continue;
		}
		if (inString) continue;

		if (char === openChar) {
			if (depth === 0) startPos = i + 1;
			depth++;
		} else if (char === closeChar) {
			depth--;
			if (depth === 0 && startPos !== -1) {
				return {
					content: source.substring(startPos, i),
					endIndex: i,
				};
			}
		}
	}
	return null;
}

/**
 * Recursively parses Mathematica BoxData / TextData / RowBox expressions into formatted text.
 */
function parseBoxExpression(expr: string): string {
	const trimmed = expr.trim();
	if (!trimmed) return "";

	// Plain quoted string
	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return decodeWolframText(trimmed.slice(1, -1));
	}

	// RowBox[{ ... }]
	if (trimmed.startsWith("RowBox[")) {
		const parsed = extractBalancedExpression(trimmed, 6, "[", "]");
		if (parsed) {
			return parseBoxList(parsed.content);
		}
	}

	// TextData[{ ... }]
	if (trimmed.startsWith("TextData[")) {
		const parsed = extractBalancedExpression(trimmed, 8, "[", "]");
		if (parsed) {
			return parseBoxList(parsed.content);
		}
	}

	// BoxData[ ... ]
	if (trimmed.startsWith("BoxData[")) {
		const parsed = extractBalancedExpression(trimmed, 7, "[", "]");
		if (parsed) {
			return parseBoxExpression(parsed.content);
		}
	}

	// StyleBox[content, options...]
	if (trimmed.startsWith("StyleBox[")) {
		const parsed = extractBalancedExpression(trimmed, 8, "[", "]");
		if (parsed) {
			const parts = splitTopLevel(parsed.content, ",");
			const innerContent = parseBoxExpression(parts[0] ?? "");
			const opts = parts.slice(1).join(" ");
			if (
				opts.includes('FontWeight -> "Bold"') ||
				opts.includes('FontWeight->"Bold"')
			) {
				return `**${innerContent}**`;
			}
			if (
				opts.includes('FontSlant -> "Italic"') ||
				opts.includes('FontSlant->"Italic"')
			) {
				return `*${innerContent}*`;
			}
			if (opts.includes('"Code"')) {
				return `\`${innerContent}\``;
			}
			return innerContent;
		}
	}

	// SuperscriptBox[base, exp]
	if (trimmed.startsWith("SuperscriptBox[")) {
		const parsed = extractBalancedExpression(trimmed, 14, "[", "]");
		if (parsed) {
			const parts = splitTopLevel(parsed.content, ",");
			const base = parseBoxExpression(parts[0] ?? "");
			const exp = parseBoxExpression(parts[1] ?? "");
			return `${base}^(${exp})`;
		}
	}

	// SubscriptBox[base, sub]
	if (trimmed.startsWith("SubscriptBox[")) {
		const parsed = extractBalancedExpression(trimmed, 12, "[", "]");
		if (parsed) {
			const parts = splitTopLevel(parsed.content, ",");
			const base = parseBoxExpression(parts[0] ?? "");
			const sub = parseBoxExpression(parts[1] ?? "");
			return `${base}_(${sub})`;
		}
	}

	// FractionBox[num, den]
	if (trimmed.startsWith("FractionBox[")) {
		const parsed = extractBalancedExpression(trimmed, 11, "[", "]");
		if (parsed) {
			const parts = splitTopLevel(parsed.content, ",");
			const num = parseBoxExpression(parts[0] ?? "");
			const den = parseBoxExpression(parts[1] ?? "");
			return `(${num}) / (${den})`;
		}
	}

	// SqrtBox[rad]
	if (trimmed.startsWith("SqrtBox[")) {
		const parsed = extractBalancedExpression(trimmed, 7, "[", "]");
		if (parsed) {
			const rad = parseBoxExpression(parsed.content);
			return `√(${rad})`;
		}
	}

	// ButtonBox[title, ..., ButtonData -> {URL["url"], ...}]
	if (trimmed.startsWith("ButtonBox[")) {
		const parsed = extractBalancedExpression(trimmed, 9, "[", "]");
		if (parsed) {
			const parts = splitTopLevel(parsed.content, ",");
			const label = parseBoxExpression(parts[0] ?? "");
			const urlMatch = parsed.content.match(/URL\["([^"]+)"\]/);
			if (urlMatch?.[1]) {
				return `[${label}](${urlMatch[1]})`;
			}
			return label;
		}
	}

	// GridBox[{ {row1}, {row2} }]
	if (trimmed.startsWith("GridBox[")) {
		const parsed = extractBalancedExpression(trimmed, 7, "[", "]");
		if (parsed) {
			return parseGridBox(parsed.content);
		}
	}

	// Fallback: strip quotes if present or clean strings
	return decodeWolframText(trimmed.replace(/^"|"$/g, ""));
}

function parseBoxList(content: string): string {
	const trimmed = content.trim();
	let inner = trimmed;
	if (inner.startsWith("{") && inner.endsWith("}")) {
		inner = inner.slice(1, -1);
	}
	const items = splitTopLevel(inner, ",");
	return items.map((item) => parseBoxExpression(item)).join("");
}

function parseGridBox(content: string): string {
	const trimmed = content.trim();
	let inner = trimmed;
	if (inner.startsWith("{") && inner.endsWith("}")) {
		inner = inner.slice(1, -1);
	}
	const rowsRaw = splitTopLevel(inner, ",");
	const tableRows: string[][] = [];

	for (const r of rowsRaw) {
		const rTrim = r.trim();
		if (rTrim.startsWith("{") && rTrim.endsWith("}")) {
			const cols = splitTopLevel(rTrim.slice(1, -1), ",");
			tableRows.push(cols.map((c) => parseBoxExpression(c)));
		}
	}

	if (tableRows.length === 0) return "";

	const maxCols = Math.max(...tableRows.map((r) => r.length));
	const lines: string[] = [];

	// Header row
	const headerRow = tableRows[0] ?? [];
	while (headerRow.length < maxCols) headerRow.push("");
	lines.push(`| ${headerRow.join(" | ")} |`);
	lines.push(`| ${Array(maxCols).fill("---").join(" | ")} |`);

	// Data rows
	for (let i = 1; i < tableRows.length; i++) {
		const row = tableRows[i] ?? [];
		while (row.length < maxCols) row.push("");
		lines.push(`| ${row.join(" | ")} |`);
	}

	return `\n${lines.join("\n")}\n`;
}

function splitTopLevel(str: string, delimiter: string): string[] {
	const result: string[] = [];
	let depth = 0;
	let inString = false;
	let isEscaped = false;
	let current = "";

	for (let i = 0; i < str.length; i++) {
		const c = str[i];
		if (isEscaped) {
			current += c;
			isEscaped = false;
			continue;
		}
		if (c === "\\" && inString) {
			current += c;
			isEscaped = true;
			continue;
		}
		if (c === '"') {
			inString = !inString;
			current += c;
			continue;
		}
		if (!inString) {
			if (c === "[" || c === "{" || c === "(") {
				depth++;
			} else if (c === "]" || c === "}" || c === ")") {
				depth--;
			} else if (c === delimiter && depth === 0) {
				result.push(current.trim());
				current = "";
				continue;
			}
		}
		current += c;
	}
	if (current.trim()) {
		result.push(current.trim());
	}
	return result;
}

interface ParsedCell {
	style: string;
	content: string;
}

/**
 * Parses raw Mathematica notebook text and extracts all Cell[...] expressions.
 */
function extractCells(notebookText: string): ParsedCell[] {
	const cells: ParsedCell[] = [];
	let pos = 0;

	while (pos < notebookText.length) {
		const cellIndex = notebookText.indexOf("Cell[", pos);
		if (cellIndex === -1) break;

		const expr = extractBalancedExpression(
			notebookText,
			cellIndex + 4,
			"[",
			"]",
		);
		if (!expr) {
			pos = cellIndex + 5;
			continue;
		}

		// If this is a CellGroupData wrapper, do not skip over the inner cells
		const trimmedExpr = expr.content.trim();
		if (trimmedExpr.startsWith("CellGroupData[")) {
			pos = cellIndex + 5;
			continue;
		}

		pos = expr.endIndex + 1;
		const parts = splitTopLevel(expr.content, ",");
		if (parts.length >= 2) {
			const bodyRaw = parts[0] ?? "";
			const styleRaw = parts[1] ?? "";
			const style = styleRaw.replace(/["\s]/g, "");
			const content = parseBoxExpression(bodyRaw);
			cells.push({ style, content });
		}
	}

	return cells;
}

/**
 * Converts a Wolfram Mathematica Notebook (.nb) into GitHub Flavored Markdown.
 */
export function convertNbToMarkdown(
	input: Uint8Array | ArrayBuffer | string,
	options: NbConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): NbConversionResult {
	onProgress?.(0.1, "READ_NOTEBOOK");

	let rawText = "";
	if (typeof input === "string") {
		rawText = input;
	} else {
		const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
		rawText = new TextDecoder("utf-8").decode(bytes);
	}

	if (
		!rawText.includes("Notebook[") &&
		!rawText.includes("Cell[") &&
		!rawText.includes("application/vnd.wolfram.mathematica")
	) {
		throw new Error(
			"Invalid Mathematica Notebook: Missing 'Notebook[' or 'Cell[' expression signature.",
		);
	}

	onProgress?.(0.3, "EXTRACT_CELLS");

	const cells = extractCells(rawText);
	if (cells.length === 0) {
		throw new Error(
			"Invalid Mathematica Notebook: No evaluatable cells found.",
		);
	}

	onProgress?.(0.6, "RENDER_MARKDOWN");

	let title: string | undefined;
	let inputCount = 0;
	let outputCount = 0;
	let textCount = 0;
	const sections: string[] = [];
	const mdParts: string[] = [];

	const codeLang = options.codeLanguage ?? "mathematica";
	const renderOutputs = options.renderOutputs !== false;

	for (const cell of cells) {
		const { style, content } = cell;
		const trimmedContent = content.trim();
		if (!trimmedContent) continue;

		switch (style) {
			case "Title":
				if (!title) title = trimmedContent;
				mdParts.push(`# ${trimmedContent}\n`);
				break;
			case "Subtitle":
				mdParts.push(`## ${trimmedContent}\n`);
				break;
			case "Subsubtitle":
				mdParts.push(`### ${trimmedContent}\n`);
				break;
			case "Chapter":
				mdParts.push(`# ${trimmedContent}\n`);
				sections.push(trimmedContent);
				break;
			case "Section":
				mdParts.push(`## ${trimmedContent}\n`);
				sections.push(trimmedContent);
				break;
			case "Subsection":
				mdParts.push(`### ${trimmedContent}\n`);
				break;
			case "Subsubsection":
				mdParts.push(`#### ${trimmedContent}\n`);
				break;
			case "Text":
				textCount++;
				mdParts.push(`${trimmedContent}\n`);
				break;
			case "Input":
			case "Code":
				inputCount++;
				mdParts.push(`\`\`\`${codeLang}\n${trimmedContent}\n\`\`\`\n`);
				break;
			case "Output":
				outputCount++;
				if (renderOutputs) {
					mdParts.push(
						`> **Output:**\n>\n> \`\`\`${codeLang}\n> ${trimmedContent.replace(/\n/g, "\n> ")}\n> \`\`\`\n`,
					);
				}
				break;
			case "Item":
				mdParts.push(`* ${trimmedContent}`);
				break;
			case "ItemNumbered":
				mdParts.push(`1. ${trimmedContent}`);
				break;
			case "Subitem":
				mdParts.push(`  * ${trimmedContent}`);
				break;
			case "SubitemNumbered":
				mdParts.push(`  1. ${trimmedContent}`);
				break;
			default:
				// Generic text or custom styles
				mdParts.push(`${trimmedContent}\n`);
				break;
		}
	}

	let generator: string | undefined;
	const genMatch = rawText.match(/CreatedBy\s*=\s*'([^']+)'/i);
	if (genMatch?.[1]) {
		generator = genMatch[1];
	}

	const metadata: NbMetadata = {
		title,
		cellCount: cells.length,
		inputCount,
		outputCount,
		textCount,
		sections,
		generator,
	};

	let markdown = mdParts
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	if (options.includeFrontmatter) {
		const fmLines: string[] = ["---"];
		if (title) fmLines.push(`title: "${title}"`);
		fmLines.push('format: "mathematica-nb"');
		fmLines.push(`cellCount: ${cells.length}`);
		fmLines.push(`inputCount: ${inputCount}`);
		fmLines.push(`outputCount: ${outputCount}`);
		if (generator) fmLines.push(`generator: "${generator}"`);
		fmLines.push("---", "");
		markdown = `${fmLines.join("\n")}\n${markdown}`;
	}

	onProgress?.(1.0, "COMPLETE");

	const markdownBuffer = new TextEncoder().encode(markdown)
		.buffer as ArrayBuffer;

	return {
		markdown,
		markdownBuffer,
		metadata,
	};
}
