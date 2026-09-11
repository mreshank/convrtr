import type {
	LatexConversionResult,
	LatexMetadata,
	LatexToMarkdownOptions,
} from "./types";

/**
 * Parses and converts a LaTeX (.tex / .latex) scientific document into clean,
 * semantic GitHub Flavored Markdown with preserved math expressions ($ and $$).
 */
export function convertLatexToMarkdown(
	input: Uint8Array | ArrayBuffer | string,
	options: LatexToMarkdownOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): LatexConversionResult {
	onProgress?.(0.1, "READ_INPUT");
	let text = "";
	if (typeof input === "string") {
		text = input;
	} else {
		const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
		text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
	}

	onProgress?.(0.2, "STRIP_COMMENTS");

	// 1. Strip comments (% ...), but preserve escaped \%
	text = text.replace(/(^|[^\\])%.*$/gm, "$1");

	// 2. Extract metadata
	const titleMatch = text.match(/\\title\s*\{([\s\S]*?)\}/i);
	const authorMatch = text.match(/\\author\s*\{([\s\S]*?)\}/i);
	const dateMatch = text.match(/\\date\s*\{([\s\S]*?)\}/i);

	const cleanTitle = titleMatch?.[1]
		? titleMatch[1].replace(/\\\\/g, " ").replace(/\\/g, "").trim()
		: undefined;
	const cleanAuthor = authorMatch?.[1]
		? authorMatch[1].replace(/\\\\/g, " ").replace(/\\/g, "").trim()
		: undefined;
	const cleanDate = dateMatch?.[1]
		? dateMatch[1].replace(/\\/g, "").trim()
		: undefined;

	// 3. Isolate document body
	const docStart = text.indexOf("\\begin{document}");
	if (docStart !== -1) {
		const docEnd = text.indexOf("\\end{document}");
		if (docEnd !== -1) {
			text = text.substring(docStart + 16, docEnd);
		} else {
			text = text.substring(docStart + 16);
		}
	}

	onProgress?.(0.4, "PROTECT_MATH_AND_CODE");

	// 4. Protect math and code blocks with placeholders
	const mathBlocks: string[] = [];
	const codeBlocks: string[] = [];
	let sectionCount = 0;

	// Verbatim and code listings
	text = text.replace(
		/\\begin\{(?:verbatim|lstlisting)\}([\s\S]*?)\\end\{(?:verbatim|lstlisting)\}/gi,
		(_, codeContent) => {
			const idx = codeBlocks.length;
			codeBlocks.push(`\`\`\`\n${codeContent.trim()}\n\`\`\``);
			return `__LATEX_CODE_${idx}__`;
		},
	);

	// Display math environments
	text = text.replace(
		/\\begin\{(?:equation\*?|align\*?|gather\*?|displaymath)\}([\s\S]*?)\\end\{(?:equation\*?|align\*?|gather\*?|displaymath)\}/gi,
		(_, mathContent) => {
			const idx = mathBlocks.length;
			mathBlocks.push(`$$\n${mathContent.trim()}\n$$`);
			return `__LATEX_MATH_${idx}__`;
		},
	);

	// Bracket display math \[ ... \]
	text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, mathContent) => {
		const idx = mathBlocks.length;
		mathBlocks.push(`$$\n${mathContent.trim()}\n$$`);
		return `__LATEX_MATH_${idx}__`;
	});

	// Double dollar display math $$ ... $$
	text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, mathContent) => {
		const idx = mathBlocks.length;
		mathBlocks.push(`$$\n${mathContent.trim()}\n$$`);
		return `__LATEX_MATH_${idx}__`;
	});

	// Inline math \( ... \)
	text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, mathContent) => {
		const idx = mathBlocks.length;
		mathBlocks.push(`$${mathContent.trim()}$`);
		return `__LATEX_MATH_${idx}__`;
	});

	// Inline math $ ... $ (avoid matching $$)
	text = text.replace(
		/(?<!\$)\$(?!\$)([\s\S]*?)(?<!\$)\$(?!\$)/g,
		(_, mathContent) => {
			const idx = mathBlocks.length;
			mathBlocks.push(`$${mathContent.trim()}$`);
			return `__LATEX_MATH_${idx}__`;
		},
	);

	onProgress?.(0.6, "CONVERT_ENVIRONMENTS");

	// 5. Convert lists
	text = text.replace(
		/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gi,
		(_, body) => {
			const items = body
				.split(/\\item\b/)
				.map((item: string) => item.trim())
				.filter((item: string) => item.length > 0);
			return `\n${items.map((item: string) => `- ${item}`).join("\n")}\n`;
		},
	);

	text = text.replace(
		/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi,
		(_, body) => {
			const items = body
				.split(/\\item\b/)
				.map((item: string) => item.trim())
				.filter((item: string) => item.length > 0);
			return `\n${items.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")}\n`;
		},
	);

	// Blockquotes
	text = text.replace(
		/\\begin\{(?:quote|quotation)\}([\s\S]*?)\\end\{(?:quote|quotation)\}/gi,
		(_, body) => {
			const lines = body
				.trim()
				.split("\n")
				.map((l: string) => `> ${l.trim()}`)
				.join("\n");
			return `\n${lines}\n`;
		},
	);

	onProgress?.(0.7, "CONVERT_SECTIONS_AND_FORMATTING");

	// 6. Headings
	text = text.replace(/\\section\*?\{([\s\S]*?)\}/gi, (_, title) => {
		sectionCount++;
		return `\n# ${title.trim()}\n`;
	});
	text = text.replace(/\\subsection\*?\{([\s\S]*?)\}/gi, (_, title) => {
		sectionCount++;
		return `\n## ${title.trim()}\n`;
	});
	text = text.replace(/\\subsubsection\*?\{([\s\S]*?)\}/gi, (_, title) => {
		sectionCount++;
		return `\n### ${title.trim()}\n`;
	});
	text = text.replace(/\\paragraph\*?\{([\s\S]*?)\}/gi, (_, title) => {
		return `\n#### ${title.trim()}\n`;
	});

	// 7. Inline styles
	text = text.replace(/\\textbf\{([\s\S]*?)\}/gi, "**$1**");
	text = text.replace(/\\textit\{([\s\S]*?)\}/gi, "*$1*");
	text = text.replace(/\\emph\{([\s\S]*?)\}/gi, "*$1*");
	text = text.replace(/\\texttt\{([\s\S]*?)\}/gi, "`$1`");
	text = text.replace(/\\underline\{([\s\S]*?)\}/gi, "<u>$1</u>");
	text = text.replace(/\\sout\{([\s\S]*?)\}/gi, "~~$1~~");

	// Links and references
	text = text.replace(/\\href\{([^}]+)\}\{([\s\S]*?)\}/gi, "[$2]($1)");
	text = text.replace(/\\url\{([^}]+)\}/gi, "[$1]($1)");
	text = text.replace(/\\cite\{([^}]+)\}/gi, "[$1]");
	text = text.replace(/\\ref\{([^}]+)\}/gi, "$1");
	text = text.replace(/\\label\{[^}]+\}/gi, "");

	// Typography & Symbols
	text = text.replace(/``/g, "“");
	text = text.replace(/''/g, "”");
	text = text.replace(/\\dots\b/gi, "…");
	text = text.replace(/\\ldots\b/gi, "…");
	text = text.replaceAll("---", "—");
	text = text.replaceAll("--", "–");
	text = text.replace(/\\&/g, "&");
	text = text.replace(/\\%/g, "%");
	text = text.replace(/\\\$/g, "$");
	text = text.replace(/\\#/g, "#");
	text = text.replace(/\\_/g, "_");
	text = text.replace(/~/g, " ");

	// Strip boilerplate macros
	text = text.replace(/\\maketitle\b/gi, "");
	text = text.replace(/\\tableofcontents\b/gi, "");
	text = text.replace(/\\newpage\b/gi, "\n\n");
	text = text.replace(/\\clearpage\b/gi, "\n\n");
	text = text.replace(/\\\\(?:\[[^\]]*\])?/g, "\n\n");

	onProgress?.(0.9, "RESTORE_BLOCKS");

	// 8. Restore protected math blocks
	text = text.replace(/__LATEX_MATH_(\d+)__/g, (_, idxStr) => {
		const idx = Number.parseInt(idxStr, 10);
		return mathBlocks[idx] ?? "";
	});

	// Restore code blocks
	text = text.replace(/__LATEX_CODE_(\d+)__/g, (_, idxStr) => {
		const idx = Number.parseInt(idxStr, 10);
		return codeBlocks[idx] ?? "";
	});

	// Normalize whitespace
	let cleanMarkdown = text
		.replace(/\r\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	// 9. Prepend YAML frontmatter if requested
	if (
		options.includeFrontmatter !== false &&
		(cleanTitle || cleanAuthor || cleanDate)
	) {
		const frontmatter: string[] = ["---"];
		if (cleanTitle) frontmatter.push(`title: ${JSON.stringify(cleanTitle)}`);
		if (cleanAuthor) frontmatter.push(`author: ${JSON.stringify(cleanAuthor)}`);
		if (cleanDate) frontmatter.push(`date: ${JSON.stringify(cleanDate)}`);
		frontmatter.push("format: latex-to-markdown");
		frontmatter.push("---");
		frontmatter.push("");

		cleanMarkdown = `${frontmatter.join("\n")}\n${cleanMarkdown}`;
	}

	const metadata: LatexMetadata = {
		title: cleanTitle,
		author: cleanAuthor,
		date: cleanDate,
		sectionCount,
		mathBlockCount: mathBlocks.length,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		markdownText: cleanMarkdown,
	};
}
