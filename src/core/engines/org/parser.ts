import type {
	OrgConversionResult,
	OrgMetadata,
	OrgToMarkdownOptions,
} from "./types";

function convertInlineOrgToMarkdown(text: string): string {
	let s = text;

	// Org links: [[url][description]] -> [description](url)
	s = s.replace(/\[\[([^\]]+)\]\[([^\]]+)\]\]/g, "[$2]($1)");

	// Org raw links: [[url]] -> [url](url)
	s = s.replace(/\[\[([^\]]+)\]\]/g, "[$1]($1)");

	// Bold: *bold* -> **bold** (ensure it's word-bounded and not a list bullet)
	s = s.replace(
		/(^|[^\w*])\*([^\s*](?:.*?[^\s*])?)\*([^\w*]|$)/g,
		"$1**$2**$3",
	);

	// Italic: /italic/ -> *italic*
	s = s.replace(/(^|[^\w/])\/([^\s/](?:.*?[^\s/])?)\/([^\w/]|$)/g, "$1*$2*$3");

	// Code: ~code~ -> `code`
	s = s.replace(/(^|[^\w~])~([^\s~](?:.*?[^\s~])?)~([^\w~]|$)/g, "$1`$2`$3");

	// Verbatim: =verbatim= -> `verbatim`
	s = s.replace(/(^|[^\w=])=([^\s=](?:.*?[^\s=])?)=([^\w=]|$)/g, "$1`$2`$3");

	// Strikethrough: +strike+ -> ~~strike~~
	s = s.replace(
		/(^|[^\w+])\+([^\s+](?:.*?[^\s+])?)\+([^\w+]|$)/g,
		"$1~~$2~~$3",
	);

	// Underline: _underline_ -> <u>underline</u>
	s = s.replace(
		/(^|[^\w_])_([^\s_](?:.*?[^\s_])?)_([^\w_]|$)/g,
		"$1<u>$2</u>$3",
	);

	return s;
}

/**
 * Parses an Emacs Org Mode (.org) document and converts it into standard
 * GitHub Flavored Markdown (GFM) with optional YAML frontmatter.
 */
export function parseOrgToMarkdown(
	input: string | Uint8Array | ArrayBuffer,
	options: OrgToMarkdownOptions = {},
): OrgConversionResult {
	let text = "";
	if (typeof input === "string") {
		text = input;
	} else if (input instanceof Uint8Array) {
		text = new TextDecoder("utf-8").decode(input);
	} else {
		text = new TextDecoder("utf-8").decode(new Uint8Array(input));
	}

	const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

	let title: string | undefined;
	let author: string | undefined;
	let date: string | undefined;
	const tags: string[] = [];
	let headingsCount = 0;
	let todoCount = 0;

	const outputLines: string[] = [];
	let inCodeBlock = false;
	let codeBlockLang = "";
	let inQuoteBlock = false;
	let inPropertyDrawer = false;

	for (let i = 0; i < rawLines.length; i++) {
		const line = rawLines[i] ?? "";
		const trimmed = line.trim();

		// 1. Code block handling: #+BEGIN_SRC / #+END_SRC
		const beginSrcMatch = trimmed.match(/^#\+BEGIN_SRC(?:\s+([\w#+-]+))?/i);
		if (beginSrcMatch) {
			inCodeBlock = true;
			codeBlockLang = beginSrcMatch[1]?.toLowerCase() || "";
			outputLines.push(`\`\`\`${codeBlockLang}`);
			continue;
		}

		if (trimmed.match(/^#\+END_SRC/i)) {
			inCodeBlock = false;
			outputLines.push("```");
			continue;
		}

		if (inCodeBlock) {
			outputLines.push(line);
			continue;
		}

		// 2. Quote block handling: #+BEGIN_QUOTE / #+END_QUOTE
		if (trimmed.match(/^#\+BEGIN_QUOTE/i)) {
			inQuoteBlock = true;
			continue;
		}

		if (trimmed.match(/^#\+END_QUOTE/i)) {
			inQuoteBlock = false;
			continue;
		}

		// 3. Property drawer handling: :PROPERTIES: ... :END:
		if (trimmed === ":PROPERTIES:") {
			inPropertyDrawer = true;
			continue;
		}

		if (inPropertyDrawer) {
			if (trimmed === ":END:") {
				inPropertyDrawer = false;
			}
			continue;
		}

		// 4. File-level metadata keywords: #+TITLE:, #+AUTHOR:, #+DATE:, #+TAGS:
		const titleMatch = trimmed.match(/^#\+TITLE:\s*(.+)$/i);
		if (titleMatch?.[1]) {
			title = titleMatch[1].trim();
			continue;
		}

		const authorMatch = trimmed.match(/^#\+AUTHOR:\s*(.+)$/i);
		if (authorMatch?.[1]) {
			author = authorMatch[1].trim();
			continue;
		}

		const dateMatch = trimmed.match(/^#\+DATE:\s*(.+)$/i);
		if (dateMatch?.[1]) {
			date = dateMatch[1].trim();
			continue;
		}

		const tagsMatch = trimmed.match(/^#\+TAGS:\s*(.+)$/i);
		if (tagsMatch?.[1]) {
			const parsedTags = tagsMatch[1]
				.split(/[\s,]+/)
				.map((t) => t.trim())
				.filter(Boolean);
			tags.push(...parsedTags);
			continue;
		}

		// Skip other Org directives like #+OPTIONS:, #+STARTUP:, etc.
		if (trimmed.match(/^#\+[A-Z_]+:/i)) {
			continue;
		}

		// 5. Headings: * Heading 1, ** Heading 2, etc.
		const headingMatch = line.match(/^(\*+)\s+(.+)$/);
		if (headingMatch?.[1] && headingMatch[2]) {
			headingsCount++;
			const level = headingMatch[1].length;
			let headingContent = headingMatch[2].trim();

			// Detect TODO / DONE / WAITING states
			const todoMatch = headingContent.match(
				/^(TODO|DONE|WAITING|CANCELLED)\s+(.+)$/,
			);
			if (todoMatch?.[1] && todoMatch[2]) {
				todoCount++;
				const state = todoMatch[1];
				const rest = todoMatch[2];
				const check = state === "DONE" ? "[x]" : "[ ]";
				headingContent = `${check} ${rest}`;
			}

			const mdHashes = "#".repeat(Math.min(level, 6));
			const convertedHeading = convertInlineOrgToMarkdown(headingContent);
			outputLines.push(`${mdHashes} ${convertedHeading}`);
			continue;
		}

		// 6. Checkboxes on list items: - [ ] Task, + [X] Done, - [-] In progress
		const checkboxMatch = line.match(/^(\s*[-+*]\s+)\[([ Xx-])\]\s+(.+)$/);
		if (checkboxMatch?.[1] && checkboxMatch[2] && checkboxMatch[3]) {
			todoCount++;
			const prefix = checkboxMatch[1];
			const box =
				checkboxMatch[2].toLowerCase() === "x" ? "x" : checkboxMatch[2];
			const content = convertInlineOrgToMarkdown(checkboxMatch[3]);
			outputLines.push(`${prefix}[${box}] ${content}`);
			continue;
		}

		// 7. Org tables: | Name | Age | and |---+---|
		if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
			// Separator line: |---+---| or |---|
			if (/^\|[-+]+(?:\|[-+]+)*\|$/.test(trimmed)) {
				const colCount =
					trimmed.split("+").length || trimmed.split("|").length - 1;
				const sepCells = new Array(Math.max(colCount, 1)).fill("---");
				outputLines.push(`| ${sepCells.join(" | ")} |`);
			} else {
				// Table data row
				const cells = trimmed
					.slice(1, -1)
					.split("|")
					.map((c) => convertInlineOrgToMarkdown(c.trim()));
				outputLines.push(`| ${cells.join(" | ")} |`);
			}
			continue;
		}

		// 8. Normal line formatting (quotes, lists, paragraphs)
		let processed = convertInlineOrgToMarkdown(line);
		if (inQuoteBlock) {
			processed = `> ${processed}`;
		}
		outputLines.push(processed);
	}

	// Build final Markdown document
	const finalParts: string[] = [];

	if (
		options.includeFrontmatter !== false &&
		(title || author || date || tags.length > 0)
	) {
		finalParts.push("---");
		if (title) finalParts.push(`title: "${title.replace(/"/g, '\\"')}"`);
		if (author) finalParts.push(`author: "${author.replace(/"/g, '\\"')}"`);
		if (date) finalParts.push(`date: "${date.replace(/"/g, '\\"')}"`);
		if (tags.length > 0) {
			finalParts.push("tags:");
			for (const t of tags) {
				finalParts.push(`  - "${t.replace(/"/g, '\\"')}"`);
			}
		}
		finalParts.push("---");
		finalParts.push("");
	}

	finalParts.push(outputLines.join("\n"));

	const metadata: OrgMetadata = {
		title,
		author,
		date,
		tags: tags.length > 0 ? tags : undefined,
		headingsCount,
		todoCount,
	};

	return {
		metadata,
		markdown: `${finalParts.join("\n").trim()}\n`,
	};
}
