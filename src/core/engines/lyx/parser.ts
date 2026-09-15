import type {
	LyxConversionOptions,
	LyxConversionResult,
	LyxMetadata,
} from "./types";

/**
 * Parses a LyX document layout line to extract formatted text and inline styling.
 */
function cleanLyxInline(text: string): string {
	let out = text;

	// Inset Formula: \begin_inset Formula $...$ \end_inset
	out = out.replace(
		/\\begin_inset Formula \\\[([\s\S]*?)\\\]\s*\\end_inset/g,
		(_, formula: string) => `\n$$\n${formula.trim()}\n$$\n`,
	);
	out = out.replace(
		/\\begin_inset Formula \$([\s\S]*?)\$\s*\\end_inset/g,
		(_, formula: string) => `$${formula.trim()}$`,
	);

	// Inset Graphics: \begin_inset Graphics filename path.png ... \end_inset
	out = out.replace(
		/\\begin_inset Graphics[\s\S]*?filename\s+([^\s\n]+)[\s\S]*?\\end_inset/g,
		(_, filename: string) => `![Graphic](${filename.trim()})`,
	);

	// Inset URL/href: \begin_inset CommandInset href ... target "url" ... \end_inset
	out = out.replace(
		/\\begin_inset CommandInset href[\s\S]*?target\s+"([^"]+)"[\s\S]*?\\end_inset/g,
		(_, url: string) => `[${url}](${url})`,
	);

	// Strip remaining unhandled inset wrappers
	out = out.replace(/\\begin_inset [^\n]+/g, "");
	out = out.replace(/\\end_inset/g, "");

	// Clean LyX control tags
	out = out.replace(/\\backslash/g, "\\");
	out = out.replace(/\\slash/g, "/");
	out = out.replace(/\\series bold\s*/g, "**");
	out = out.replace(/\\series default\s*/g, "**");
	out = out.replace(/\\shape italic\s*/g, "*");
	out = out.replace(/\\shape default\s*/g, "*");
	out = out.replace(/\\emph on\s*/g, "*");
	out = out.replace(/\\emph default\s*/g, "*");
	out = out.replace(/\\family typewriter\s*/g, "`");
	out = out.replace(/\\family default\s*/g, "`");

	// Clean consecutive styling delimiters (** ** or * *)
	out = out.replace(/\*{4}/g, "");
	out = out.replace(/`{2}/g, "");

	return out.trim();
}

/**
 * Converts a LyX document (.lyx) to GitHub Flavored Markdown.
 */
export function convertLyxToMarkdown(
	input: ArrayBuffer | Uint8Array | string,
	options: LyxConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): LyxConversionResult {
	onProgress?.(0.1, "READ_DOCUMENT");

	let rawText = "";
	if (typeof input === "string") {
		rawText = input;
	} else {
		const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
		rawText = new TextDecoder("utf-8").decode(bytes);
	}

	if (!rawText.startsWith("#LyX") && !rawText.includes("\\begin_body")) {
		throw new Error(
			"Invalid LyX file: Missing '#LyX' header or '\\begin_body' declaration.",
		);
	}

	onProgress?.(0.3, "EXTRACT_METADATA");

	let textClass: string | undefined;
	const tcMatch = rawText.match(/\\textclass\s+([^\s\n]+)/);
	if (tcMatch?.[1]) {
		textClass = tcMatch[1];
	}

	const bodyStart = rawText.indexOf("\\begin_body");
	const bodyEnd = rawText.indexOf("\\end_body");
	const bodyText =
		bodyStart !== -1
			? rawText.substring(
					bodyStart + 11,
					bodyEnd !== -1 ? bodyEnd : rawText.length,
				)
			: rawText;

	onProgress?.(0.5, "PARSE_LAYOUTS");

	const lines = bodyText.split("\n");
	const mdParts: string[] = [];

	let title: string | undefined;
	let author: string | undefined;
	let sectionCount = 0;
	let formulaCount = 0;
	let tableCount = 0;
	let imageCount = 0;

	let currentLayout: string | null = null;
	const currentBuffer: string[] = [];
	let inTabular = false;
	const tabularRows: string[][] = [];

	const flushLayout = () => {
		if (!currentLayout && currentBuffer.length === 0) return;

		const joined = currentBuffer.join("\n").trim();
		currentBuffer.length = 0;
		if (!joined) {
			currentLayout = null;
			return;
		}

		const cleaned = cleanLyxInline(joined);
		if (!cleaned) {
			currentLayout = null;
			return;
		}

		switch (currentLayout) {
			case "Title":
				if (!title) title = cleaned;
				mdParts.push(`# ${cleaned}\n`);
				break;
			case "Author":
				if (!author) author = cleaned;
				mdParts.push(`*By ${cleaned}*\n`);
				break;
			case "Date":
				mdParts.push(`*${cleaned}*\n`);
				break;
			case "Chapter":
				sectionCount++;
				mdParts.push(`# ${cleaned}\n`);
				break;
			case "Section":
				sectionCount++;
				mdParts.push(`## ${cleaned}\n`);
				break;
			case "Subsection":
				mdParts.push(`### ${cleaned}\n`);
				break;
			case "Subsubsection":
				mdParts.push(`#### ${cleaned}\n`);
				break;
			case "Abstract":
				mdParts.push(`> **Abstract:** ${cleaned}\n`);
				break;
			case "Itemize":
				mdParts.push(`* ${cleaned}`);
				break;
			case "Enumerate":
				mdParts.push(`1. ${cleaned}`);
				break;
			case "Code":
			case "LyX-Code":
				mdParts.push(`\`\`\`text\n${cleaned}\n\`\`\`\n`);
				break;
			case "Quote":
			case "Quotation":
				mdParts.push(`> ${cleaned}\n`);
				break;
			default:
				mdParts.push(`${cleaned}\n`);
				break;
		}

		currentLayout = null;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trimEnd() ?? "";

		if (line.includes("\\begin_inset Formula")) formulaCount++;
		if (line.includes("\\begin_inset Graphics")) imageCount++;

		if (line.startsWith("\\begin_inset Tabular")) {
			flushLayout();
			inTabular = true;
			tableCount++;
			continue;
		}

		if (inTabular) {
			if (line.startsWith("\\end_inset")) {
				inTabular = false;
				if (tabularRows.length > 0) {
					const maxCols = Math.max(...tabularRows.map((r) => r.length));
					const tableLines: string[] = [];
					const header = tabularRows[0] ?? [];
					while (header.length < maxCols) header.push("");
					tableLines.push(`| ${header.join(" | ")} |`);
					tableLines.push(`| ${Array(maxCols).fill("---").join(" | ")} |`);

					for (let r = 1; r < tabularRows.length; r++) {
						const row = tabularRows[r] ?? [];
						while (row.length < maxCols) row.push("");
						tableLines.push(`| ${row.join(" | ")} |`);
					}
					mdParts.push(`\n${tableLines.join("\n")}\n`);
					tabularRows.length = 0;
				}
				continue;
			}

			if (line.startsWith("<row>")) {
				tabularRows.push([]);
			} else if (line.startsWith("<cell") && tabularRows.length > 0) {
				const nextLine = lines[i + 1]?.trim() ?? "";
				const currentRow = tabularRows[tabularRows.length - 1];
				if (currentRow) {
					currentRow.push(cleanLyxInline(nextLine));
				}
			}
			continue;
		}

		if (line.startsWith("\\begin_layout")) {
			flushLayout();
			const layoutName = line.replace("\\begin_layout", "").trim();
			currentLayout = layoutName;
			continue;
		}

		if (line.startsWith("\\end_layout")) {
			flushLayout();
			continue;
		}

		if (currentLayout) {
			currentBuffer.push(line);
		}
	}

	flushLayout();

	onProgress?.(0.85, "BUILD_OUTPUT");

	let markdown = mdParts
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	if (options.includeFrontmatter) {
		const fmLines: string[] = ["---"];
		if (title) fmLines.push(`title: "${title}"`);
		if (author) fmLines.push(`author: "${author}"`);
		if (textClass) fmLines.push(`textClass: "${textClass}"`);
		fmLines.push('format: "lyx"');
		fmLines.push(`sections: ${sectionCount}`);
		fmLines.push(`formulas: ${formulaCount}`);
		fmLines.push("---", "");
		markdown = `${fmLines.join("\n")}\n${markdown}`;
	}

	const markdownBuffer = new TextEncoder().encode(markdown)
		.buffer as ArrayBuffer;

	const metadata: LyxMetadata = {
		title,
		author,
		textClass,
		sectionCount,
		formulaCount,
		tableCount,
		imageCount,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		markdownBuffer,
		metadata,
	};
}
