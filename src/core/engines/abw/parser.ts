import { gunzipSync } from "fflate";
import type {
	AbwConversionOptions,
	AbwConversionResult,
	AbwMetadata,
} from "./types";

function decodeXml(input: Uint8Array | ArrayBuffer | string): string {
	if (typeof input === "string") {
		return input;
	}
	let bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	// Check for GZIP header (0x1F 0x8B 0x08) -> .zabw compressed AbiWord
	if (
		bytes.length >= 3 &&
		bytes[0] === 0x1f &&
		bytes[1] === 0x8b &&
		bytes[2] === 0x08
	) {
		try {
			bytes = gunzipSync(bytes);
		} catch {
			throw new Error("Failed to decompress gzipped AbiWord (.zabw) archive.");
		}
	}

	// Detect encoding from XML prolog if present
	let encoding = "utf-8";
	const preview = new TextDecoder("latin1").decode(bytes.subarray(0, 250));
	const match = preview.match(/encoding=["']([^"']+)["']/i);
	if (match?.[1]) {
		const enc = match[1].toLowerCase().trim();
		try {
			new TextDecoder(enc);
			encoding = enc;
		} catch {
			encoding = "utf-8";
		}
	}

	try {
		return new TextDecoder(encoding).decode(bytes);
	} catch {
		return new TextDecoder("utf-8").decode(bytes);
	}
}

function unescapeXml(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(new RegExp(`&${String.fromCharCode(35)}39;`, "g"), "'")
		.replace(new RegExp(`&${String.fromCharCode(35)}160;`, "g"), " ")
		.replace(/&nbsp;/g, " ");
}

/**
 * Parses inline spans (<c props="...">, <a>, <image>) inside paragraph text.
 */
function parseInline(
	content: string,
	preserveImages = true,
): { text: string; imageCount: number } {
	let imageCount = 0;

	// Handle images
	let result = content.replace(
		/<image\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/image>)/gi,
		(_, attrs, inner) => {
			imageCount++;
			if (!preserveImages) return "";

			const mimeMatch = attrs.match(/mime-type=["']([^"']+)["']/i);
			const dataMatch =
				attrs.match(/data=["']([^"']+)["']/i) ||
				(inner ? inner.match(/([A-Za-z0-9+/=]{10,})/i) : null);
			const mime = mimeMatch?.[1] ?? "image/png";
			const data = dataMatch?.[1]?.replace(/\s+/g, "");

			if (data) {
				return `\n\n![Embedded Image](data:${mime};base64,${data})\n\n`;
			}
			return "";
		},
	);

	// Handle links <a href="...">...</a>
	result = result.replace(
		/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
		(_, href, text) => {
			const label = unescapeXml(text.replace(/<[^>]+>/g, "")).trim();
			return label ? `[${label}](${href})` : href;
		},
	);

	// Handle styled spans <c props="...">text</c>
	result = result.replace(
		/<c(?:\s+props=["']([^"']+)["'])?>([\s\S]*?)<\/c>/gi,
		(_, props, text) => {
			let inner = unescapeXml(text);
			if (!inner || !props) return inner;

			const isBold = /font-weight:bold/i.test(props);
			const isItalic = /font-style:italic/i.test(props);
			const isStrike = /text-decoration:line-through/i.test(props);
			const isSuper = /text-position:superscript/i.test(props);
			const isSub = /text-position:subscript/i.test(props);
			const isCode =
				/font-family:(?:Courier|Courier New|Consolas|monospace)/i.test(props);

			if (isCode) inner = `\`${inner.trim()}\``;
			if (isBold) inner = `**${inner.trim()}**`;
			if (isItalic) inner = `*${inner.trim()}*`;
			if (isStrike) inner = `~~${inner.trim()}~~`;
			if (isSuper) inner = `<sup>${inner.trim()}</sup>`;
			if (isSub) inner = `<sub>${inner.trim()}</sub>`;

			return inner;
		},
	);

	// Strip any remaining XML tags and unescape
	result = unescapeXml(result.replace(/<[^>]+>/g, ""));
	return { text: result.replace(/[ \t]+/g, " ").trim(), imageCount };
}

/**
 * Converts an AbiWord (.abw / .zabw) XML document into GitHub Flavored Markdown.
 */
export function convertAbwToMarkdown(
	input: Uint8Array | ArrayBuffer | string,
	options: AbwConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): AbwConversionResult {
	onProgress?.(0.05, "READ_XML");
	const xml = decodeXml(input);

	if (!/<abiword/i.test(xml)) {
		throw new Error(
			"Invalid AbiWord document: Missing <abiword> root element.",
		);
	}

	onProgress?.(0.2, "EXTRACT_METADATA");

	// Extract document metadata
	const metadata: AbwMetadata = {};
	const versionMatch = xml.match(/<abiword[^>]*version=["']([^"']+)["']/i);
	if (versionMatch?.[1]) {
		metadata.version = versionMatch[1];
	}

	const metaBlockMatch = xml.match(/<metadata>([\s\S]*?)<\/metadata>/i);
	if (metaBlockMatch?.[1]) {
		const mBlock = metaBlockMatch[1];
		const mRegex = /<m\s+key=["']([^"']+)["']>([\s\S]*?)<\/m>/gi;
		let mMatch = mRegex.exec(mBlock);

		while (mMatch !== null) {
			const key = mMatch[1]?.toLowerCase().trim();
			const val = unescapeXml(mMatch[2] ?? "").trim();
			if (key && val) {
				if (key === "dc.title") metadata.title = val;
				else if (key === "dc.creator") metadata.creator = val;
				else if (key === "dc.description") metadata.description = val;
				else if (key === "dc.date") metadata.date = val;
				else if (key === "dc.subject") metadata.subject = val;
				else if (key === "abiword.keywords") {
					metadata.keywords = val
						.split(/[,;]+/)
						.map((s) => s.trim())
						.filter(Boolean);
				}
			}
			mMatch = mRegex.exec(mBlock);
		}
	}

	onProgress?.(0.4, "PARSE_CONTENT");

	const preserveImages = options.preserveImages ?? true;
	const includeMetadata = options.includeMetadata ?? true;
	let totalImageCount = 0;
	const out: string[] = [];

	// Render YAML frontmatter
	if (
		includeMetadata &&
		(metadata.title ||
			metadata.creator ||
			metadata.description ||
			metadata.date)
	) {
		out.push("---");
		if (metadata.title) out.push(`title: ${JSON.stringify(metadata.title)}`);
		if (metadata.creator)
			out.push(`author: ${JSON.stringify(metadata.creator)}`);
		if (metadata.date) out.push(`date: ${JSON.stringify(metadata.date)}`);
		if (metadata.description)
			out.push(`description: ${JSON.stringify(metadata.description)}`);
		if (metadata.keywords && metadata.keywords.length > 0) {
			out.push(`tags:\n${metadata.keywords.map((k) => `  - ${k}`).join("\n")}`);
		}
		out.push("---\n");
	}

	// Parse sections
	const sectionMatch = xml.match(/<section[^>]*>([\s\S]*?)<\/section>/gi);
	const contentSource = sectionMatch ? sectionMatch.join("\n") : xml;

	// Extract tables and paragraphs
	// Match <table> or <p> tags sequentially
	const elementRegex = /<(table|p)([\s\S]*?)>([\s\S]*?)<\/\1>/gi;
	let elMatch = elementRegex.exec(contentSource);

	while (elMatch !== null) {
		const tag = elMatch[1]?.toLowerCase();
		const attrs = elMatch[2] ?? "";
		const inner = elMatch[3] ?? "";

		if (tag === "table") {
			// Parse table cells: <cell x="col" y="row">...</cell>
			const cellRegex = /<cell\s+([^>]*?)>([\s\S]*?)<\/cell>/gi;
			let cMatch = cellRegex.exec(inner);

			interface GridCell {
				x: number;
				y: number;
				text: string;
			}
			const cells: GridCell[] = [];
			const defaultRow = 0;
			let defaultCol = 0;

			while (cMatch !== null) {
				const cAttrs = cMatch[1] ?? "";
				const cInner = cMatch[2] ?? "";

				const xMatch = cAttrs.match(/x=["'](\d+)["']/i);
				const yMatch = cAttrs.match(/y=["'](\d+)["']/i);
				const x =
					xMatch?.[1] !== undefined
						? Number.parseInt(xMatch[1], 10)
						: defaultCol++;
				const y =
					yMatch?.[1] !== undefined
						? Number.parseInt(yMatch[1], 10)
						: defaultRow;

				const parsed = parseInline(cInner, preserveImages);
				totalImageCount += parsed.imageCount;
				cells.push({ x, y, text: parsed.text });
				cMatch = cellRegex.exec(inner);
			}

			if (cells.length > 0) {
				const maxY = Math.max(...cells.map((c) => c.y));
				const maxX = Math.max(...cells.map((c) => c.x));

				// Build rows
				const grid: string[][] = Array.from({ length: maxY + 1 }, () =>
					Array.from({ length: maxX + 1 }, () => ""),
				);

				for (const c of cells) {
					const targetRow = grid[c.y];
					if (targetRow) {
						targetRow[c.x] = c.text;
					}
				}

				// Output Markdown table
				const headerRow = grid[0] ?? [];
				out.push(`| ${headerRow.map((h) => h || " ").join(" | ")} |`);
				out.push(`| ${headerRow.map(() => "---").join(" | ")} |`);

				for (let r = 1; r < grid.length; r++) {
					const row = grid[r] ?? [];
					out.push(`| ${row.map((cell) => cell || " ").join(" | ")} |`);
				}
				out.push("");
			}
		} else if (tag === "p") {
			// Check heading or special styles
			const isH1 = /heading:1|Heading 1/i.test(attrs);
			const isH2 = /heading:2|Heading 2/i.test(attrs);
			const isH3 = /heading:3|Heading 3/i.test(attrs);
			const isH4 = /heading:4|Heading 4/i.test(attrs);
			const isH5 = /heading:5|Heading 5/i.test(attrs);
			const isH6 = /heading:6|Heading 6/i.test(attrs);

			const isQuote = /style=["'](?:Block Text|Quote|Blockquote)["']/i.test(
				attrs,
			);
			const isBullet = /style=["']Bullet List["']|list-tag=["']\d+["']/i.test(
				attrs,
			);
			const isNumbered = /style=["']Numbered List["']/i.test(attrs);

			const parsed = parseInline(inner, preserveImages);
			totalImageCount += parsed.imageCount;

			if (parsed.text) {
				if (isH1) out.push(`# ${parsed.text}\n`);
				else if (isH2) out.push(`## ${parsed.text}\n`);
				else if (isH3) out.push(`### ${parsed.text}\n`);
				else if (isH4) out.push(`#### ${parsed.text}\n`);
				else if (isH5) out.push(`##### ${parsed.text}\n`);
				else if (isH6) out.push(`###### ${parsed.text}\n`);
				else if (isQuote) out.push(`> ${parsed.text}\n`);
				else if (isBullet) out.push(`- ${parsed.text}`);
				else if (isNumbered) out.push(`1. ${parsed.text}`);
				else out.push(`${parsed.text}\n`);
			}
		}
		elMatch = elementRegex.exec(contentSource);
	}

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown: `${out.join("\n").trim()}\n`,
		metadata,
		imageCount: totalImageCount,
	};
}
