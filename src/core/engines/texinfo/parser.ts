import type {
	TexinfoConversionOptions,
	TexinfoConversionResult,
	TexinfoMetadata,
} from "./types";

/**
 * Replaces Texinfo inline macros with Markdown syntax.
 */
function cleanInline(text: string): string {
	let res = text;

	// Handle escaped characters
	res = res.replace(/@@/g, "\0AT\0");
	res = res.replace(/@\{/g, "\0LBRACE\0");
	res = res.replace(/@\}/g, "\0RBRACE\0");

	// Replace @dots{}
	res = res.replace(/@dots\{\}/g, "...");

	// Replace links @uref{url, text} or @uref{url}
	res = res.replace(/@uref\{([^,}]+),\s*([^}]+)\}/g, "[$2]($1)");
	res = res.replace(/@uref\{([^}]+)\}/g, "<$1>");
	res = res.replace(/@url\{([^,}]+),\s*([^}]+)\}/g, "[$2]($1)");
	res = res.replace(/@url\{([^}]+)\}/g, "<$1>");

	// Replace email @email{addr, text} or @email{addr}
	res = res.replace(/@email\{([^,}]+),\s*([^}]+)\}/g, "[$2](mailto:$1)");
	res = res.replace(/@email\{([^}]+)\}/g, "<$1>");

	// Code and identifiers: @code, @samp, @command, @file, @var, @env, @option, @kbd, @key
	res = res.replace(
		/@(?:code|samp|command|file|var|env|option|kbd|key)\{([^}]+)\}/g,
		"`$1`",
	);

	// Bold: @strong, @b
	res = res.replace(/@(?:strong|b)\{([^}]+)\}/g, "**$1**");

	// Italics / emphasis: @emph, @i, @dfn, @cite
	res = res.replace(/@(?:emph|i|dfn|cite)\{([^}]+)\}/g, "*$1*");

	// Cross references @ref{node, text} or @ref{node}
	res = res.replace(/@(?:x|p)?ref\{([^,}]+),\s*([^}]+)\}/g, "*$2*");
	res = res.replace(/@(?:x|p)?ref\{([^}]+)\}/g, "*$1*");

	// Restore escaped characters
	res = res.replace(/\0AT\0/g, "@");
	res = res.replace(/\0LBRACE\0/g, "{");
	res = res.replace(/\0RBRACE\0/g, "}");

	return res;
}

/**
 * Parses GNU Texinfo source text (.texi / .texinfo) and converts it to GFM Markdown.
 */
export function convertTexinfoToMarkdown(
	input: ArrayBuffer | Uint8Array | string,
	options: TexinfoConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): TexinfoConversionResult {
	onProgress?.(0.1, "READ_DOCUMENT");

	let raw = "";
	if (typeof input === "string") {
		raw = input;
	} else {
		const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
		raw = new TextDecoder("utf-8").decode(bytes);
	}

	const lines = raw.split(/\r?\n/);
	const out: string[] = [];

	let title: string | undefined;
	let chapterCount = 0;
	let sectionCount = 0;

	type EnvType =
		| "example"
		| "itemize"
		| "enumerate"
		| "table"
		| "multitable"
		| "quotation"
		| "menu";

	const envStack: EnvType[] = [];
	let enumerateIndex = 1;
	let inTableItem = false;

	onProgress?.(0.3, "PARSE_DIRECTIVES");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const trimmed = line.trim();

		// Ignored comment lines
		if (
			trimmed.startsWith("@c ") ||
			trimmed.startsWith("@comment ") ||
			trimmed === "@c" ||
			trimmed === "@comment"
		) {
			continue;
		}

		// Document metadata
		if (trimmed.startsWith("@settitle ")) {
			title = cleanInline(trimmed.slice(10).trim());
			continue;
		}

		// End of Texinfo document
		if (trimmed === "@bye") {
			break;
		}

		// Skip menu blocks
		if (trimmed.startsWith("@menu")) {
			envStack.push("menu");
			continue;
		}
		if (trimmed.startsWith("@end menu")) {
			if (envStack.length > 0 && envStack[envStack.length - 1] === "menu") {
				envStack.pop();
			}
			continue;
		}
		if (envStack[envStack.length - 1] === "menu") {
			continue;
		}

		// Node directives
		if (trimmed.startsWith("@node ")) {
			if (options.preserveNodeAnchors) {
				const nodeName = trimmed.slice(6).split(",")[0]?.trim() || "";
				if (nodeName) {
					out.push(
						`<a id="${nodeName.toLowerCase().replace(/\s+/g, "-")}"></a>\n`,
					);
				}
			}
			continue;
		}

		// Headings
		if (
			trimmed.startsWith("@top ") ||
			trimmed.startsWith("@chapter ") ||
			trimmed.startsWith("@majorheading ")
		) {
			const text = cleanInline(
				trimmed.replace(/^@(?:top|chapter|majorheading)\s+/, "").trim(),
			);
			chapterCount++;
			out.push(`\n# ${text}\n`);
			continue;
		}

		if (trimmed.startsWith("@section ") || trimmed.startsWith("@heading ")) {
			const text = cleanInline(
				trimmed.replace(/^@(?:section|heading)\s+/, "").trim(),
			);
			sectionCount++;
			out.push(`\n## ${text}\n`);
			continue;
		}

		if (
			trimmed.startsWith("@subsection ") ||
			trimmed.startsWith("@subheading ")
		) {
			const text = cleanInline(
				trimmed.replace(/^@(?:subsection|subheading)\s+/, "").trim(),
			);
			out.push(`\n### ${text}\n`);
			continue;
		}

		if (
			trimmed.startsWith("@subsubsection ") ||
			trimmed.startsWith("@subsubheading ")
		) {
			const text = cleanInline(
				trimmed.replace(/^@(?:subsubsection|subsubheading)\s+/, "").trim(),
			);
			out.push(`\n#### ${text}\n`);
			continue;
		}

		// Block environment starters
		if (
			trimmed.startsWith("@example") ||
			trimmed.startsWith("@smallexample") ||
			trimmed.startsWith("@lisp") ||
			trimmed.startsWith("@smalllisp")
		) {
			envStack.push("example");
			out.push("\n```");
			continue;
		}

		if (
			trimmed === "@end example" ||
			trimmed === "@end smallexample" ||
			trimmed === "@end lisp" ||
			trimmed === "@end smalllisp"
		) {
			if (envStack.length > 0 && envStack[envStack.length - 1] === "example") {
				envStack.pop();
			}
			out.push("```\n");
			continue;
		}

		// Inside code example block: preserve indentation and text verbatim
		if (envStack[envStack.length - 1] === "example") {
			out.push(line);
			continue;
		}

		// Quotation environment
		if (trimmed.startsWith("@quotation")) {
			envStack.push("quotation");
			continue;
		}
		if (trimmed === "@end quotation") {
			if (
				envStack.length > 0 &&
				envStack[envStack.length - 1] === "quotation"
			) {
				envStack.pop();
			}
			continue;
		}

		// List environments
		if (trimmed.startsWith("@itemize")) {
			envStack.push("itemize");
			continue;
		}
		if (trimmed === "@end itemize") {
			if (envStack.length > 0 && envStack[envStack.length - 1] === "itemize") {
				envStack.pop();
			}
			out.push("");
			continue;
		}

		if (trimmed.startsWith("@enumerate")) {
			envStack.push("enumerate");
			enumerateIndex = 1;
			continue;
		}
		if (trimmed === "@end enumerate") {
			if (
				envStack.length > 0 &&
				envStack[envStack.length - 1] === "enumerate"
			) {
				envStack.pop();
			}
			out.push("");
			continue;
		}

		// Table environments
		if (trimmed.startsWith("@table ")) {
			envStack.push("table");
			inTableItem = false;
			continue;
		}
		if (trimmed === "@end table") {
			if (envStack.length > 0 && envStack[envStack.length - 1] === "table") {
				envStack.pop();
			}
			inTableItem = false;
			out.push("");
			continue;
		}

		// Multitable (GFM table)
		if (trimmed.startsWith("@multitable")) {
			envStack.push("multitable");
			continue;
		}
		if (trimmed === "@end multitable") {
			if (
				envStack.length > 0 &&
				envStack[envStack.length - 1] === "multitable"
			) {
				envStack.pop();
			}
			out.push("");
			continue;
		}

		// List / Table items
		const currentEnv = envStack[envStack.length - 1];

		if (trimmed.startsWith("@item") || trimmed.startsWith("@itemx")) {
			const isItemx = trimmed.startsWith("@itemx");
			const itemContent = trimmed.replace(/^@itemx?\s*/, "").trim();

			if (currentEnv === "itemize") {
				out.push(`- ${cleanInline(itemContent)}`);
				continue;
			}
			if (currentEnv === "enumerate") {
				out.push(`${enumerateIndex++}. ${cleanInline(itemContent)}`);
				continue;
			}
			if (currentEnv === "table") {
				inTableItem = true;
				if (isItemx) {
					out.push(`- **${cleanInline(itemContent)}**`);
				} else {
					out.push(`\n- **${cleanInline(itemContent)}**:`);
				}
				continue;
			}
			if (currentEnv === "multitable") {
				// Parse row cells separated by @tab
				const cells = itemContent
					.split("@tab")
					.map((c) => cleanInline(c.trim()));
				out.push(`| ${cells.join(" | ")} |`);
				continue;
			}
		}

		// Skip other structural @-directives without printable content
		if (
			trimmed.startsWith("@") &&
			!trimmed.startsWith("@code") &&
			!trimmed.startsWith("@var")
		) {
			if (
				trimmed.startsWith("@set ") ||
				trimmed.startsWith("@clear ") ||
				trimmed.startsWith("@include ") ||
				trimmed.startsWith("@syncodeindex ") ||
				trimmed.startsWith("@noindent")
			) {
				continue;
			}
		}

		// Normal paragraph text
		if (trimmed.length > 0) {
			const cleaned = cleanInline(line);
			if (currentEnv === "quotation") {
				out.push(`> ${cleaned}`);
			} else if (currentEnv === "table" && inTableItem) {
				out.push(`  ${cleaned}`);
			} else {
				out.push(cleaned);
			}
		} else {
			out.push("");
		}
	}

	onProgress?.(0.9, "FINALIZE");

	// Add top title heading if parsed and not already in document
	let markdown = out
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	if (title && !markdown.startsWith("# ")) {
		markdown = `# ${title}\n\n${markdown}`;
	}

	const metadata: TexinfoMetadata = {
		title,
		chapterCount,
		sectionCount,
		lineCount: lines.length,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		metadata,
	};
}
