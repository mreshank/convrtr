import type {
	EnexConversionOptions,
	EnexConversionResult,
	EnexMetadata,
	EnexNote,
} from "./types";

function unescapeXml(text: string): string {
	const hash = String.fromCharCode(35);
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(new RegExp(`&${hash}39;`, "g"), "'")
		.replace(/&nbsp;/g, " ")
		.replace(new RegExp(`&${hash}160;`, "g"), " ");
}

function parseEvernoteDate(dateStr: string): string {
	const trimmed = dateStr.trim();
	// Format: YYYYMMDDTHHMMSSZ (e.g. 20230501T143025Z)
	const m = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
	if (m) {
		const [, year, month, day, hour, min, sec] = m;
		return `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
	}
	return trimmed;
}

/**
 * Converts ENML (Evernote Markup Language) into clean GitHub Flavored Markdown.
 */
function convertEnmlToMarkdown(enml: string): string {
	let md = enml;

	// Extract content inside <en-note>...</en-note> if present
	const noteMatch = md.match(/<en-note[^>]*>([\s\S]*?)<\/en-note>/i);
	if (noteMatch?.[1]) {
		md = noteMatch[1];
	}

	// 1. Checklists: <en-todo checked="true"/> and <en-todo checked="false"/>
	md = md.replace(/<en-todo\s+[^>]*checked=["']true["'][^>]*\/?>/gi, "- [x] ");
	md = md.replace(/<en-todo\s+[^>]*checked=["']false["'][^>]*\/?>/gi, "- [ ] ");
	md = md.replace(/<en-todo\s*\/?>/gi, "- [ ] ");

	// 2. Attachments / Media: <en-media ... />
	md = md.replace(
		/<en-media\s+[^>]*type=["']([^"']+)["'][^>]*\/?>/gi,
		"[Attachment: $1]",
	);
	md = md.replace(/<en-media\s*\/?>/gi, "[Attachment]");

	// 3. Preformatted code blocks
	md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
		const cleanCode = unescapeXml(code.replace(/<br\s*\/?>/gi, "\n"));
		return `\n\`\`\`\n${cleanCode.trim()}\n\`\`\`\n`;
	});

	// 4. Inline code
	md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => {
		return `\`${unescapeXml(code)}\``;
	});

	// 5. Headings
	md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
	md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
	md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
	md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
	md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
	md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

	// 6. Blockquotes
	md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => {
		const lines = text.trim().split(/\r?\n/);
		return `\n${lines.map((l: string) => `> ${l}`).join("\n")}\n`;
	});

	// 7. Inline styling: bold, italic, strikethrough, underline
	md = md.replace(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, "**$1**");
	md = md.replace(/<(?:i|em)[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, "*$1*");
	md = md.replace(
		/<(?:s|strike|del)[^>]*>([\s\S]*?)<\/(?:s|strike|del)>/gi,
		"~~$1~~",
	);
	md = md.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "_$1_");

	// 8. Hyperlinks
	md = md.replace(
		/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
		"[$2]($1)",
	);

	// 9. Tables: convert HTML tables to Markdown pipe tables
	md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
		const rows: string[][] = [];
		const trMatches = tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

		for (const tr of trMatches) {
			const rowHtml = tr[1] ?? "";
			const cells: string[] = [];
			const cellMatches = rowHtml.matchAll(
				/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi,
			);
			for (const td of cellMatches) {
				const cellText = (td[1] ?? "").replace(/<[^>]+>/g, "").trim();
				cells.push(unescapeXml(cellText));
			}
			if (cells.length > 0) {
				rows.push(cells);
			}
		}

		if (rows.length === 0) return "";

		// Format GFM Table
		const colCount = Math.max(...rows.map((r) => r.length));
		let tableMd = "\n";

		// Header row
		const headerRow = rows[0] ?? [];
		while (headerRow.length < colCount) headerRow.push("");
		tableMd += `| ${headerRow.join(" | ")} |\n`;

		// Separator row
		tableMd += `| ${Array(colCount).fill("---").join(" | ")} |\n`;

		// Body rows
		for (let r = 1; r < rows.length; r++) {
			const row = rows[r] ?? [];
			while (row.length < colCount) row.push("");
			tableMd += `| ${row.join(" | ")} |\n`;
		}

		return `${tableMd}\n`;
	});

	// 10. Lists
	md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
	md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, "\n");

	// 11. Layout tags
	md = md.replace(/<br\s*\/?>/gi, "\n");
	md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
	md = md.replace(/<\/?(?:div|p)[^>]*>/gi, "\n");

	// 12. Strip remaining XML / HTML tags
	md = md.replace(/<[^>]+>/g, "");

	// 13. Unescape entities
	md = unescapeXml(md);

	// 14. Clean excessive blank lines
	md = md.replace(/\n{3,}/g, "\n\n").trim();

	return md;
}

/**
 * Converts an Evernote XML Export (.enex) archive into clean GitHub Flavored Markdown.
 */
export function convertEnexToMarkdown(
	input: Uint8Array | ArrayBuffer | string,
	options: EnexConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): EnexConversionResult {
	onProgress?.(0.1, "READ_INPUT");

	let xml = "";
	if (typeof input === "string") {
		xml = input;
	} else {
		const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
		xml = new TextDecoder("utf-8").decode(bytes);
	}

	if (!xml.includes("<en-export") && !xml.includes("<note>")) {
		throw new Error(
			"Invalid ENEX file: Missing '<en-export>' root or '<note>' elements.",
		);
	}

	onProgress?.(0.3, "EXTRACT_NOTES");

	const noteMatches = xml.matchAll(/<note>([\s\S]*?)<\/note>/gi);
	const notes: EnexNote[] = [];
	const allTags = new Set<string>();
	let earliestDate: string | undefined;
	let latestDate: string | undefined;
	let totalChars = 0;

	for (const match of noteMatches) {
		const noteXml = match[1] ?? "";

		// Title
		const titleMatch = noteXml.match(/<title>([\s\S]*?)<\/title>/i);
		const title = titleMatch?.[1]
			? unescapeXml(titleMatch[1].trim())
			: "Untitled Note";

		// Created date
		const createdMatch = noteXml.match(/<created>([\s\S]*?)<\/created>/i);
		const created = createdMatch?.[1]
			? parseEvernoteDate(createdMatch[1])
			: undefined;

		// Updated date
		const updatedMatch = noteXml.match(/<updated>([\s\S]*?)<\/updated>/i);
		const updated = updatedMatch?.[1]
			? parseEvernoteDate(updatedMatch[1])
			: undefined;

		// Track dates
		if (created) {
			if (!earliestDate || created < earliestDate) earliestDate = created;
			if (!latestDate || created > latestDate) latestDate = created;
		}

		// Tags
		const tags: string[] = [];
		const tagMatches = noteXml.matchAll(/<tag>([\s\S]*?)<\/tag>/gi);
		for (const t of tagMatches) {
			const tagText = unescapeXml((t[1] ?? "").trim());
			if (tagText) {
				tags.push(tagText);
				allTags.add(tagText);
			}
		}

		// Content (CDATA or raw XML)
		let content = "";
		const cdataMatch = noteXml.match(
			/<content>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content>/i,
		);
		if (cdataMatch?.[1]) {
			content = cdataMatch[1];
		} else {
			const rawContentMatch = noteXml.match(/<content>([\s\S]*?)<\/content>/i);
			if (rawContentMatch?.[1]) {
				content = rawContentMatch[1];
			}
		}

		const markdownBody = convertEnmlToMarkdown(content);
		totalChars += markdownBody.length;

		notes.push({
			title,
			created,
			updated,
			tags,
			markdown: markdownBody,
		});
	}

	onProgress?.(0.7, "FORMAT_MARKDOWN");

	const includeFrontmatter = options.includeFrontmatter !== false;

	const formattedSections: string[] = notes.map((note) => {
		let out = "";
		if (includeFrontmatter) {
			out += "---\n";
			out += `title: "${note.title.replace(/"/g, '\\"')}"\n`;
			if (note.created) out += `created: ${note.created}\n`;
			if (note.updated) out += `updated: ${note.updated}\n`;
			if (note.tags.length > 0) {
				out += "tags:\n";
				for (const tag of note.tags) {
					out += `  - ${tag}\n`;
				}
			}
			out += "---\n\n";
		}

		out += `# ${note.title}\n\n`;
		out += note.markdown;
		return out;
	});

	const fullMarkdown = formattedSections.join("\n\n---\n\n");

	onProgress?.(1.0, "COMPLETE");

	const metadata: EnexMetadata = {
		noteCount: notes.length,
		totalCharacters: totalChars,
		tagList: Array.from(allTags),
		earliestDate,
		latestDate,
	};

	return {
		markdown: fullMarkdown,
		notes,
		metadata,
	};
}
