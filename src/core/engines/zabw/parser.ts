import { gunzipSync } from "fflate";
import type {
	ZabwConversionResult,
	ZabwMetadata,
	ZabwToMarkdownOptions,
} from "./types";

function unescapeXml(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(new RegExp(`&${String.fromCharCode(35)}39;`, "g"), "'")
		.replace(new RegExp(`&${String.fromCharCode(35)}160;`, "g"), " ");
}

/**
 * Parses character styles in an AbiWord paragraph segment.
 */
function parseInlineFormatting(xml: string): string {
	// Links: <a href="url">text</a>
	let formatted = xml.replace(
		/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
		(_, href, text) => `[${parseInlineFormatting(text)}](${href})`,
	);

	// Character runs: <c props="...">text</c>
	formatted = formatted.replace(
		/<c(?:\s+props=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/c>/gi,
		(_, props, text) => {
			let inner = unescapeXml(text);
			if (!inner.trim()) return inner;

			const propStr = props || "";
			const isBold = /font-weight:\s*bold/i.test(propStr);
			const isItalic = /font-style:\s*italic/i.test(propStr);
			const isStrike = /text-decoration:\s*line-through/i.test(propStr);
			const isCode = /font-family:\s*(?:monospace|courier|consolas)/i.test(
				propStr,
			);

			if (isCode) inner = `\`${inner}\``;
			if (isStrike) inner = `~~${inner}~~`;
			if (isItalic) inner = `*${inner}*`;
			if (isBold) inner = `**${inner}**`;

			return inner;
		},
	);

	// Clean any other tags inside the paragraph
	formatted = formatted.replace(/<[^>]+>/g, "");
	return unescapeXml(formatted);
}

/**
 * Parses an AbiWord table block into GFM Markdown table.
 */
function parseTable(tableXml: string): string {
	const rowMatches = tableXml.matchAll(/<cell[^>]*>([\s\S]*?)<\/cell>/gi);
	const cells: string[] = [];

	for (const match of rowMatches) {
		const cellContent = match[1] ?? "";
		const cellText = parseInlineFormatting(cellContent)
			.replace(/\n+/g, " ")
			.trim();
		cells.push(cellText);
	}

	if (cells.length === 0) return "";

	// AbiWord tables can be simple list of cells or rows
	// If 2+ cells, format as a 2-column or uniform table
	const colCount = Math.min(cells.length, 3);
	const lines: string[] = [];

	for (let i = 0; i < cells.length; i += colCount) {
		const rowCells = cells.slice(i, i + colCount);
		while (rowCells.length < colCount) rowCells.push("");
		lines.push(`| ${rowCells.join(" | ")} |`);
		if (i === 0) {
			lines.push(`| ${rowCells.map(() => "---").join(" | ")} |`);
		}
	}

	return lines.join("\n");
}

/**
 * Converts AbiWord Gzipped Document (.zabw) or XML (.abw) to Markdown.
 */
export function convertZabwToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: ZabwToMarkdownOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): ZabwConversionResult {
	onProgress?.(0.1, "DECOMPRESS_GZIP");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 8) {
		throw new Error(
			"Invalid ZABW file: Buffer too small for compressed document.",
		);
	}

	let xmlString = "";

	// Check for GZIP magic 0x1f, 0x8b
	if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
		try {
			const decompressed = gunzipSync(bytes);
			xmlString = new TextDecoder("utf-8").decode(decompressed);
		} catch {
			throw new Error("Failed to decompress AbiWord Gzip container.");
		}
	} else {
		// Attempt direct UTF-8 decode for plain .abw
		xmlString = new TextDecoder("utf-8").decode(bytes);
	}

	if (
		!xmlString.includes("<abiword") &&
		!xmlString.includes("<!DOCTYPE abiword")
	) {
		throw new Error(
			"Invalid ZABW file: Missing '<abiword' document declaration.",
		);
	}

	onProgress?.(0.3, "EXTRACT_METADATA");

	const metadata: ZabwMetadata = {};

	// Extract <metadata><m key="...">value</m></metadata>
	const metaMatches = xmlString.matchAll(
		/<m\s+key=["']([^"']+)["'][^>]*>([\s\S]*?)<\/m>/gi,
	);
	for (const m of metaMatches) {
		const key = (m[1] ?? "").toLowerCase();
		const val = unescapeXml(m[2] ?? "").trim();
		if (!val) continue;

		if (key.includes("title")) metadata.title = val;
		else if (key.includes("creator") || key.includes("author"))
			metadata.author = val;
		else if (key.includes("subject") || key.includes("description"))
			metadata.subject = val;
		else if (key.includes("keyword")) metadata.keywords = val;
		else if (key.includes("generator")) metadata.generator = val;
	}

	onProgress?.(0.6, "RENDER_MARKDOWN");

	const lines: string[] = [];

	// Optional frontmatter
	if (options.includeFrontmatter !== false) {
		const fmLines: string[] = [];
		if (metadata.title) fmLines.push(`title: "${metadata.title}"`);
		if (metadata.author) fmLines.push(`author: "${metadata.author}"`);
		if (metadata.subject) fmLines.push(`description: "${metadata.subject}"`);
		if (metadata.keywords) fmLines.push(`keywords: "${metadata.keywords}"`);
		if (fmLines.length > 0) {
			lines.push("---", ...fmLines, "---", "");
		}
	}

	// Match elements inside <section>
	// Find <p ...>...</p> and <table ...>...</table>
	const blockRegex = /<(p|table)([\s\S]*?)<\/\1>/gi;
	let blockMatch: RegExpExecArray | null = null;

	while (true) {
		blockMatch = blockRegex.exec(xmlString);
		if (!blockMatch) break;

		const tag = blockMatch[1]?.toLowerCase();
		const content = blockMatch[0];

		if (tag === "table") {
			const tableMd = parseTable(content);
			if (tableMd) {
				lines.push(tableMd, "");
			}
			continue;
		}

		if (tag === "p") {
			const tagOpenMatch = content.match(/^<p([^>]*)>/i);
			const attrs = tagOpenMatch?.[1] || "";
			const innerXml = content.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "");

			const text = parseInlineFormatting(innerXml).trim();
			if (!text) continue;

			// Check headings
			const styleMatch = attrs.match(/style=["']([^"']+)["']/i);
			const style = styleMatch?.[1] || "";
			const propsMatch = attrs.match(/props=["']([^"']+)["']/i);
			const props = propsMatch?.[1] || "";

			let headingLevel = 0;
			const hMatch = style.match(/Heading\s*(\d)/i);
			if (hMatch?.[1]) {
				headingLevel = Number.parseInt(hMatch[1], 10);
			} else if (/heading-level:\s*(\d)/i.test(props)) {
				const hl = props.match(/heading-level:\s*(\d)/i);
				if (hl?.[1]) headingLevel = Number.parseInt(hl[1], 10);
			}

			if (headingLevel >= 1 && headingLevel <= 6) {
				const headingText = text.replace(/^\*\*([\s\S]*)\*\*$/, "$1").trim();
				lines.push(`${"#".repeat(headingLevel)} ${headingText}`, "");
			} else if (/style=["'](?:Block\s*Text|Blockquote)["']/i.test(attrs)) {
				lines.push(`> ${text}`, "");
			} else if (
				/list-tag/i.test(attrs) ||
				/style=["'](?:List\s*Item|Bullet\s*List)["']/i.test(attrs) ||
				/list-style:/i.test(props)
			) {
				lines.push(`- ${text}`);
			} else {
				lines.push(text, "");
			}
		}
	}

	onProgress?.(0.95, "FINALIZE");

	const markdown = `${lines.join("\n").trim()}\n`;
	const markdownBuffer = new TextEncoder().encode(markdown).buffer;

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		markdownBuffer,
		metadata,
	};
}
