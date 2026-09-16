import type {
	TroffConversionOptions,
	TroffConversionResult,
	TroffMetadata,
} from "./types";

/**
 * Tokenizes a troff request line into arguments, respecting quotes.
 */
function tokenizeTroffArgs(line: string): string[] {
	const args: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			inQuotes = !inQuotes;
		} else if (!inQuotes && (ch === " " || ch === "\t")) {
			if (current.length > 0) {
				args.push(current);
				current = "";
			}
		} else {
			current += ch;
		}
	}
	if (current.length > 0) {
		args.push(current);
	}
	return args;
}

/**
 * Replaces troff inline escape sequences with Markdown equivalents.
 */
function parseInlineEscapes(
	text: string,
	stringMap: Map<string, string>,
): string {
	let s = text;

	// String register interpolation: \*(name, \*x, \*[name]
	s = s.replace(/\\\*\[(.*?)\]/g, (_, name) => stringMap.get(name) ?? "");
	s = s.replace(
		/\\\*\(([a-zA-Z0-9_]{2})/g,
		(_, name) => stringMap.get(name) ?? "",
	);
	s = s.replace(/\\\*([a-zA-Z0-9_])/g, (_, name) => stringMap.get(name) ?? "");

	// Spacing and zero-width escapes
	s = s.replace(/\\[\^&|%]/g, "");
	s = s.replace(/\\-/g, "-");
	s = s.replace(/\\e/g, "\\");
	s = s.replace(/\\ /g, " ");
	s = s.replace(/\\\(em/g, "—");
	s = s.replace(/\\\(en/g, "–");
	s = s.replace(/\\\(cq/g, "’");
	s = s.replace(/\\\(oq/g, "‘");
	s = s.replace(/\\\(dq/g, '"');
	s = s.replace(/\\\(bu/g, "•");

	// Inline font switching: \fB, \fI, \f(CW, \f(CR, \fR, \fP
	s = s.replace(/\\f\((?:CW|CR)(.*?)\\f[RP]/g, "`$1`");
	s = s.replace(/\\fC(.*?)\\f[RP]/g, "`$1`");
	s = s.replace(/\\fB(.*?)\\f[RP]/g, "**$1**");
	s = s.replace(/\\f\(BI(.*?)\\f[RP]/g, "***$1***");
	s = s.replace(/\\fI(.*?)\\f[RP]/g, "*$1*");

	// Clean up any remaining dangling font escapes
	s = s.replace(/\\f[BIRCW0-9P]/g, "");
	s = s.replace(/\\f\([A-Z0-9]{2}/g, "");

	return s;
}

/**
 * Formats alternating font arguments (e.g. .BI, .BR, .IR, .IB, .RB, .RI)
 */
function formatAlternatingArgs(
	args: string[],
	style1: (s: string) => string,
	style2: (s: string) => string,
): string {
	return args
		.map((arg, idx) => (idx % 2 === 0 ? style1(arg) : style2(arg)))
		.join("");
}

/**
 * Converts AT&T troff source files into clean GitHub Flavored Markdown.
 */
export function convertTroffToMarkdown(
	input: ArrayBuffer | Uint8Array | string,
	_options: TroffConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): TroffConversionResult {
	onProgress?.(0.1, "DECODE_TEXT");

	let sourceText = "";
	if (typeof input === "string") {
		sourceText = input;
	} else if (input instanceof Uint8Array) {
		sourceText = new TextDecoder("utf-8").decode(input);
	} else {
		sourceText = new TextDecoder("utf-8").decode(new Uint8Array(input));
	}

	const rawLines = sourceText.split(/\r?\n/);
	const lineCount = rawLines.length;

	let docTitle: string | undefined;
	let headingCount = 0;
	let macrosDefined = 0;

	const stringMap = new Map<string, string>();
	const output: string[] = [];

	let inPreformatted = false;
	let inMacroDef = false;
	let inBlockquote = false;
	let nextIsTitle = false;
	let nextIsSectionHeading = false;
	let nextHeadingLevel = 2;

	onProgress?.(0.3, "PARSE_TROFF");

	for (let i = 0; i < rawLines.length; i++) {
		const rawLine = rawLines[i] ?? "";
		const trimmed = rawLine.trim();

		// Handle macro definition body skipping
		if (inMacroDef) {
			if (trimmed === ".." || trimmed === '.\\"' || trimmed === "'.") {
				inMacroDef = false;
			}
			continue;
		}

		// Check for troff comments: .\" or '\"
		if (
			trimmed.startsWith('.\\"') ||
			trimmed.startsWith(".\\#") ||
			trimmed.startsWith("'\\\"") ||
			trimmed.startsWith("'\\#")
		) {
			continue;
		}

		// Preformatted blocks (eqn or table or no-fill)
		if (
			trimmed === ".nf" ||
			trimmed === ".EX" ||
			trimmed === ".EQ" ||
			trimmed === ".TS"
		) {
			if (!inPreformatted) {
				inPreformatted = true;
				output.push("```");
			}
			continue;
		}
		if (
			trimmed === ".fi" ||
			trimmed === ".EE" ||
			trimmed === ".EN" ||
			trimmed === ".TE"
		) {
			if (inPreformatted) {
				inPreformatted = false;
				output.push("```");
			}
			continue;
		}

		if (inPreformatted) {
			output.push(parseInlineEscapes(rawLine, stringMap));
			continue;
		}

		// Non-request text lines
		if (!rawLine.startsWith(".") && !rawLine.startsWith("'")) {
			if (trimmed.length === 0) {
				output.push("");
				continue;
			}

			const processedText = parseInlineEscapes(rawLine, stringMap);

			if (nextIsTitle) {
				docTitle = processedText;
				output.push(`# ${processedText}`);
				output.push("");
				headingCount++;
				nextIsTitle = false;
				continue;
			}

			if (nextIsSectionHeading) {
				const prefix = "#".repeat(nextHeadingLevel);
				output.push("");
				output.push(`${prefix} ${processedText}`);
				output.push("");
				headingCount++;
				nextIsSectionHeading = false;
				nextHeadingLevel = 2;
				continue;
			}

			if (inBlockquote) {
				output.push(`> ${processedText}`);
			} else {
				output.push(processedText);
			}
			continue;
		}

		// Parse request command line
		const tokens = tokenizeTroffArgs(rawLine.slice(1));
		if (tokens.length === 0) continue;

		const req = tokens[0] ?? "";
		const args = tokens.slice(1);

		switch (req) {
			// Title & Document Header Requests
			case "TL": {
				// ms macro title: next line is title
				nextIsTitle = true;
				break;
			}

			case "tl": {
				// Classical troff three-part title: .tl 'left'center'right'
				const rawArgs = rawLine.slice(3).trim();
				const delim = rawArgs[0] ?? "'";
				const parts = rawArgs
					.split(delim)
					.filter((_, idx) => idx > 0 && idx < 4);
				const center = parts[1]?.trim() || parts[0]?.trim() || "";
				if (center && !docTitle) {
					docTitle = parseInlineEscapes(center, stringMap);
					output.push(`# ${docTitle}`);
					output.push("");
					headingCount++;
				}
				break;
			}

			case "NH": {
				// Numbered heading: .NH [level] [title]
				const level = Number.parseInt(args[0] ?? "1", 10) || 1;
				nextHeadingLevel = Math.min(6, Math.max(1, level + 1));
				const inlineTitle = args.slice(level > 0 ? 1 : 0).join(" ");
				if (inlineTitle.trim().length > 0) {
					const prefix = "#".repeat(nextHeadingLevel);
					output.push("");
					output.push(
						`${prefix} ${parseInlineEscapes(inlineTitle, stringMap)}`,
					);
					output.push("");
					headingCount++;
				} else {
					nextIsSectionHeading = true;
				}
				break;
			}

			case "SH":
			case "H": {
				// Section heading
				const headingText = args.join(" ");
				if (headingText.trim().length > 0) {
					output.push("");
					output.push(`## ${parseInlineEscapes(headingText, stringMap)}`);
					output.push("");
					headingCount++;
				} else {
					nextIsSectionHeading = true;
					nextHeadingLevel = 2;
				}
				break;
			}

			// Macro definition: .de name
			case "de": {
				inMacroDef = true;
				macrosDefined++;
				break;
			}

			// String definition: .ds name string
			case "ds": {
				const strName = args[0] ?? "";
				const strVal = args.slice(1).join(" ");
				if (strName) {
					stringMap.set(strName, strVal);
				}
				break;
			}

			// Paragraph and layout requests
			case "PP":
			case "LP":
			case "P":
			case "sp": {
				output.push("");
				inBlockquote = false;
				break;
			}

			case "QP": {
				// Quoted paragraph / blockquote
				output.push("");
				inBlockquote = true;
				break;
			}

			case "IP": {
				// Indented paragraph with bullet
				const marker = args[0] ? parseInlineEscapes(args[0], stringMap) : "•";
				const rest = args.slice(1).join(" ");
				output.push("");
				if (marker === "•" || marker === "\\(bu") {
					output.push(`* ${parseInlineEscapes(rest, stringMap)}`.trim());
				} else {
					output.push(
						`* **${marker}** ${parseInlineEscapes(rest, stringMap)}`.trim(),
					);
				}
				break;
			}

			case "br": {
				output.push("");
				break;
			}

			// Font requests
			case "B": {
				const text = parseInlineEscapes(args.join(" "), stringMap);
				output.push(`**${text}**`);
				break;
			}

			case "I": {
				const text = parseInlineEscapes(args.join(" "), stringMap);
				output.push(`*${text}*`);
				break;
			}

			case "BI": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `**${parseInlineEscapes(s, stringMap)}**`,
					(s) => `*${parseInlineEscapes(s, stringMap)}*`,
				);
				output.push(formatted);
				break;
			}

			case "IB": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `*${parseInlineEscapes(s, stringMap)}*`,
					(s) => `**${parseInlineEscapes(s, stringMap)}**`,
				);
				output.push(formatted);
				break;
			}

			case "BR": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `**${parseInlineEscapes(s, stringMap)}**`,
					(s) => parseInlineEscapes(s, stringMap),
				);
				output.push(formatted);
				break;
			}

			case "RB": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => parseInlineEscapes(s, stringMap),
					(s) => `**${parseInlineEscapes(s, stringMap)}**`,
				);
				output.push(formatted);
				break;
			}

			case "IR": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `*${parseInlineEscapes(s, stringMap)}*`,
					(s) => parseInlineEscapes(s, stringMap),
				);
				output.push(formatted);
				break;
			}

			case "RI": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => parseInlineEscapes(s, stringMap),
					(s) => `*${parseInlineEscapes(s, stringMap)}*`,
				);
				output.push(formatted);
				break;
			}

			case "BX": {
				// Boxed text -> monospace code
				const text = parseInlineEscapes(args.join(" "), stringMap);
				output.push(`\`${text}\``);
				break;
			}

			case "UL": {
				// Underline -> italic
				const text = parseInlineEscapes(args.join(" "), stringMap);
				output.push(`*${text}*`);
				break;
			}

			default: {
				// Generic unhandled request
				break;
			}
		}
	}

	if (inPreformatted) {
		output.push("```");
	}

	onProgress?.(0.9, "CLEAN_MARKDOWN");

	let markdown = output.join("\n");
	markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

	const metadata: TroffMetadata = {
		title: docTitle,
		headingCount,
		lineCount,
		macrosDefined,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		metadata,
	};
}
