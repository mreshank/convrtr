import { unzipSync } from "fflate";
import type {
	SxwConversionResult,
	SxwMetadata,
	SxwToMarkdownOptions,
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

function stripTags(xml: string): string {
	return unescapeXml(
		xml
			.replace(/<text:s\s+text:c=["'](\d+)["']\s*\/>/gi, (_, count) =>
				" ".repeat(Number.parseInt(count, 10) || 1),
			)
			.replace(/<text:tab-stop\s*\/>/gi, "\t")
			.replace(/<text:line-break\s*\/>/gi, "\n")
			.replace(
				/<text:a\s+[^>]*xlink:href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/text:a>/gi,
				"[$2]($1)",
			)
			.replace(/<[^>]+>/g, ""),
	).trim();
}

export function convertSxwToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: SxwToMarkdownOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): SxwConversionResult {
	onProgress?.(0.1, "UNZIP_ARCHIVE");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (
		bytes.length < 4 ||
		bytes[0] !== 0x50 ||
		bytes[1] !== 0x4b ||
		bytes[2] !== 0x03 ||
		bytes[3] !== 0x04
	) {
		throw new Error("Invalid SXW file: Not a valid ZIP archive container.");
	}

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(bytes);
	} catch {
		throw new Error("Failed to decompress OpenOffice SXW ZIP package.");
	}

	const contentBytes = unzipped["content.xml"];
	if (!contentBytes) {
		throw new Error("Invalid OpenOffice SXW archive: Missing 'content.xml'.");
	}

	onProgress?.(0.3, "PARSE_METADATA");

	const decoder = new TextDecoder("utf-8");
	const metaBytes = unzipped["meta.xml"];
	let title: string | undefined;
	let creator: string | undefined;
	let date: string | undefined;
	let description: string | undefined;

	if (metaBytes) {
		const metaXml = decoder.decode(metaBytes);
		const titleMatch = metaXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
		if (titleMatch?.[1]) title = stripTags(titleMatch[1]);

		const creatorMatch = metaXml.match(
			/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i,
		);
		if (creatorMatch?.[1]) creator = stripTags(creatorMatch[1]);

		const dateMatch = metaXml.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
		if (dateMatch?.[1]) date = stripTags(dateMatch[1]);

		const descMatch = metaXml.match(
			/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i,
		);
		if (descMatch?.[1]) description = stripTags(descMatch[1]);
	}

	onProgress?.(0.5, "PARSE_BODY");

	const contentXml = decoder.decode(contentBytes);
	const lines: string[] = [];

	// Match top-level blocks: headings, paragraphs, lists, tables
	const blockRegex =
		/<text:h[^>]*>([\s\S]*?)<\/text:h>|<text:p[^>]*>([\s\S]*?)<\/text:p>|<text:(?:unordered|ordered)-list[^>]*>([\s\S]*?)<\/text:(?:unordered|ordered)-list>|<table:table[^>]*>([\s\S]*?)<\/table:table>/gi;

	let match: RegExpExecArray | null = null;
	let paragraphCount = 0;
	let wordCount = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex match loop
	while ((match = blockRegex.exec(contentXml)) !== null) {
		const [fullTag, headingContent, paraContent, listContent, tableContent] =
			match;

		if (headingContent !== undefined) {
			const levelMatch = fullTag.match(/text:level=["'](\d+)["']/i);
			const level = Math.min(
				6,
				Math.max(1, Number.parseInt(levelMatch?.[1] ?? "1", 10)),
			);
			const text = stripTags(headingContent);
			if (text) {
				lines.push(`${"#".repeat(level)} ${text}\n`);
				paragraphCount++;
				wordCount += text.split(/\s+/).filter(Boolean).length;
			}
		} else if (paraContent !== undefined) {
			const text = stripTags(paraContent);
			if (text) {
				lines.push(`${text}\n`);
				paragraphCount++;
				wordCount += text.split(/\s+/).filter(Boolean).length;
			}
		} else if (listContent !== undefined) {
			const isOrdered = fullTag.startsWith("<text:ordered-list");
			const itemMatches = listContent.matchAll(
				/<text:list-item[^>]*>([\s\S]*?)<\/text:list-item>/gi,
			);
			let itemIdx = 1;
			for (const itemMatch of itemMatches) {
				const itemText = stripTags(itemMatch[1] ?? "");
				if (itemText) {
					if (isOrdered) {
						lines.push(`${itemIdx++}. ${itemText}`);
					} else {
						lines.push(`- ${itemText}`);
					}
					paragraphCount++;
					wordCount += itemText.split(/\s+/).filter(Boolean).length;
				}
			}
			lines.push("");
		} else if (tableContent !== undefined) {
			const rows = [
				...tableContent.matchAll(
					/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/gi,
				),
			];
			if (rows.length > 0) {
				const parsedTable: string[][] = [];
				for (const row of rows) {
					const cells = [
						...(row[1] ?? "").matchAll(
							/<table:table-cell[^>]*>([\s\S]*?)<\/table:table-cell>/gi,
						),
					].map((c) => stripTags(c[1] ?? "").replace(/\|/g, "\\|"));
					if (cells.length > 0) {
						parsedTable.push(cells);
					}
				}

				if (parsedTable.length > 0) {
					const maxCols = Math.max(...parsedTable.map((r) => r.length));
					const firstRow = parsedTable[0] ?? [];
					const header = Array.from(
						{ length: maxCols },
						(_, i) => firstRow[i] || "",
					);
					lines.push(`| ${header.join(" | ")} |`);
					lines.push(`| ${Array(maxCols).fill("---").join(" | ")} |`);

					for (let i = 1; i < parsedTable.length; i++) {
						const r = parsedTable[i] ?? [];
						const rowCells = Array.from(
							{ length: maxCols },
							(_, ci) => r[ci] || "",
						);
						lines.push(`| ${rowCells.join(" | ")} |`);
					}
					lines.push("");
				}
			}
		}
	}

	// Fallback if structured blocks didn't capture text
	if (lines.length === 0) {
		const rawText = stripTags(contentXml);
		if (rawText) {
			lines.push(rawText);
			paragraphCount = 1;
			wordCount = rawText.split(/\s+/).filter(Boolean).length;
		}
	}

	onProgress?.(0.85, "FORMAT_MARKDOWN");

	let markdown = lines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	if (
		options.includeFrontmatter !== false &&
		(title || creator || date || description)
	) {
		const fm: string[] = ["---"];
		if (title) fm.push(`title: "${title.replace(/"/g, '\\"')}"`);
		if (creator) fm.push(`author: "${creator.replace(/"/g, '\\"')}"`);
		if (date) fm.push(`date: "${date}"`);
		if (description)
			fm.push(`description: "${description.replace(/"/g, '\\"')}"`);
		fm.push("---", "", "");
		markdown = fm.join("\n") + markdown;
	}

	onProgress?.(1.0, "COMPLETE");

	const metadata: SxwMetadata = {
		title,
		creator,
		date,
		description,
		paragraphCount,
		wordCount,
	};

	return {
		markdown,
		metadata,
	};
}
