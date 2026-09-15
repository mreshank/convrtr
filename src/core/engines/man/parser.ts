import type {
	ManConversionOptions,
	ManConversionResult,
	ManMetadata,
} from "./types";

/**
 * Tokenizes a roff macro line into arguments, respecting quotes.
 */
function tokenizeRoffArgs(line: string): string[] {
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
 * Replaces roff inline escape sequences with Markdown equivalents.
 */
function parseInlineEscapes(text: string): string {
	let s = text;

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
	// Monospace
	s = s.replace(/\\f\((?:CW|CR)(.*?)\\f[RP]/g, "`$1`");
	s = s.replace(/\\fC(.*?)\\f[RP]/g, "`$1`");
	// Bold
	s = s.replace(/\\fB(.*?)\\f[RP]/g, "**$1**");
	s = s.replace(/\\f\(BI(.*?)\\f[RP]/g, "***$1***");
	// Italic
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
 * Converts a Unix manual page (roff / man / mdoc) into GitHub Flavored Markdown.
 */
export function convertManToMarkdown(
	input: ArrayBuffer | Uint8Array | string,
	_options: ManConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): ManConversionResult {
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

	let title: string | undefined;
	let section: string | undefined;
	let date: string | undefined;
	let source: string | undefined;
	let manual: string | undefined;
	let sectionCount = 0;
	let currentNm = "";

	const output: string[] = [];
	let inPreformatted = false;
	let pendingTpTerm = false;
	let pendingTpDesc = false;
	let pendingIp = false;

	onProgress?.(0.3, "PARSE_ROFF");

	for (let i = 0; i < rawLines.length; i++) {
		const rawLine = rawLines[i] ?? "";
		const trimmed = rawLine.trim();

		// Check for roff comments
		if (
			trimmed.startsWith('.\\"') ||
			trimmed.startsWith(".\\#") ||
			trimmed.startsWith("'\\\"") ||
			trimmed.startsWith("'\\#")
		) {
			continue;
		}

		// Handle preformatted / verbatim block toggles
		if (trimmed === ".nf" || trimmed === ".EX") {
			if (!inPreformatted) {
				inPreformatted = true;
				output.push("```");
			}
			continue;
		}
		if (trimmed === ".fi" || trimmed === ".EE") {
			if (inPreformatted) {
				inPreformatted = false;
				output.push("```");
			}
			continue;
		}

		if (inPreformatted) {
			output.push(parseInlineEscapes(rawLine));
			continue;
		}

		// If line is not a macro command
		if (!rawLine.startsWith(".") && !rawLine.startsWith("'")) {
			if (trimmed.length === 0) {
				output.push("");
				pendingTpTerm = false;
				pendingTpDesc = false;
				pendingIp = false;
				continue;
			}

			const processedText = parseInlineEscapes(rawLine);

			if (pendingTpTerm) {
				output.push(processedText);
				pendingTpTerm = false;
				pendingTpDesc = true;
			} else if (pendingTpDesc) {
				output.push(`: ${processedText}`);
				pendingTpDesc = false;
			} else if (pendingIp) {
				output.push(`* ${processedText}`);
				pendingIp = false;
			} else {
				output.push(processedText);
			}
			continue;
		}

		// Parse macro command line
		const tokens = tokenizeRoffArgs(rawLine.slice(1));
		if (tokens.length === 0) continue;

		const macro = tokens[0] ?? "";
		const args = tokens.slice(1);

		switch (macro) {
			case "TH":
			case "Dt": {
				// .TH TITLE SECTION [DATE] [SOURCE] [MANUAL]
				title = args[0] ?? "UNTITLED";
				section = args[1] ?? "1";
				if (args[2] && !date) date = args[2];
				if (args[3] && !source) source = args[3];
				if (args[4] && !manual) manual = args[4];

				let header = `# ${title}(${section})`;
				if (manual) header += ` — ${manual}`;
				output.push(header);

				const metaParts: string[] = [];
				if (source) metaParts.push(`**Source:** ${source}`);
				if (date) metaParts.push(`**Date:** ${date}`);
				if (metaParts.length > 0) {
					output.push(`> ${metaParts.join(" | ")}`);
				}
				output.push("");
				break;
			}

			case "Dd": {
				// mdoc Document date
				date = args.join(" ");
				break;
			}

			case "Os": {
				// mdoc Operating system / manual
				manual = args.join(" ");
				break;
			}

			case "SH":
			case "Sh": {
				// Section heading
				const sectionTitle = parseInlineEscapes(args.join(" "));
				output.push("");
				output.push(`## ${sectionTitle}`);
				output.push("");
				sectionCount++;
				pendingTpTerm = false;
				pendingTpDesc = false;
				pendingIp = false;
				break;
			}

			case "SS":
			case "Ss": {
				// Subsection heading
				const subTitle = parseInlineEscapes(args.join(" "));
				output.push("");
				output.push(`### ${subTitle}`);
				output.push("");
				pendingTpTerm = false;
				pendingTpDesc = false;
				pendingIp = false;
				break;
			}

			case "PP":
			case "P":
			case "LP":
			case "Pp":
			case "sp": {
				output.push("");
				pendingTpTerm = false;
				pendingTpDesc = false;
				pendingIp = false;
				break;
			}

			case "TP": {
				// Hanging indent definition: term follows on next line
				output.push("");
				pendingTpTerm = true;
				pendingTpDesc = false;
				pendingIp = false;
				break;
			}

			case "IP": {
				// Indented paragraph
				output.push("");
				pendingIp = true;
				pendingTpTerm = false;
				pendingTpDesc = false;
				break;
			}

			case "B": {
				const text = parseInlineEscapes(args.join(" "));
				output.push(`**${text}**`);
				break;
			}

			case "I": {
				const text = parseInlineEscapes(args.join(" "));
				output.push(`*${text}*`);
				break;
			}

			case "BI": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `**${parseInlineEscapes(s)}**`,
					(s) => `*${parseInlineEscapes(s)}*`,
				);
				output.push(formatted);
				break;
			}

			case "IB": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `*${parseInlineEscapes(s)}*`,
					(s) => `**${parseInlineEscapes(s)}**`,
				);
				output.push(formatted);
				break;
			}

			case "BR": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `**${parseInlineEscapes(s)}**`,
					(s) => parseInlineEscapes(s),
				);
				output.push(formatted);
				break;
			}

			case "RB": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => parseInlineEscapes(s),
					(s) => `**${parseInlineEscapes(s)}**`,
				);
				output.push(formatted);
				break;
			}

			case "IR": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => `*${parseInlineEscapes(s)}*`,
					(s) => parseInlineEscapes(s),
				);
				output.push(formatted);
				break;
			}

			case "RI": {
				const formatted = formatAlternatingArgs(
					args,
					(s) => parseInlineEscapes(s),
					(s) => `*${parseInlineEscapes(s)}*`,
				);
				output.push(formatted);
				break;
			}

			case "RS":
			case "RE": {
				output.push("");
				break;
			}

			// mdoc macros
			case "Nm": {
				// Command/Name
				if (args.length > 0) {
					currentNm = args.join(" ");
				}
				const name = currentNm || title || "";
				output.push(`**${name}**`);
				break;
			}

			case "Nd": {
				// Name description
				const desc = parseInlineEscapes(args.join(" "));
				output.push(`— ${desc}`);
				break;
			}

			case "Fl": {
				// Flag/Option
				const flag = parseInlineEscapes(args.join(" "));
				output.push(`**-${flag}**`);
				break;
			}

			case "Ar": {
				// Argument
				const arg = parseInlineEscapes(args.join(" "));
				output.push(`*${arg}*`);
				break;
			}

			case "Op": {
				// Optional: .Op Fl v -> [**-v**]
				if (args[0] === "Fl") {
					const flag = parseInlineEscapes(args.slice(1).join(" "));
					output.push(`[**-${flag}**]`);
				} else if (args[0] === "Ar") {
					const arg = parseInlineEscapes(args.slice(1).join(" "));
					output.push(`[*${arg}*]`);
				} else {
					const opt = parseInlineEscapes(args.join(" "));
					output.push(`[${opt}]`);
				}
				break;
			}

			case "Xr": {
				// Cross reference: .Xr ls 1
				const manRef = args[0] ?? "";
				const manSec = args[1] ? `(${args[1]})` : "";
				output.push(`\`${manRef}${manSec}\``);
				break;
			}

			case "Pa": {
				// Path
				const path = parseInlineEscapes(args.join(" "));
				output.push(`\`${path}\``);
				break;
			}

			default: {
				// Generic macro or unhandled
				if (args.length > 0) {
					output.push(parseInlineEscapes(args.join(" ")));
				}
				break;
			}
		}
	}

	if (inPreformatted) {
		output.push("```");
	}

	onProgress?.(0.9, "CLEAN_MARKDOWN");

	// Normalize markdown spacing
	let markdown = output.join("\n");
	markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

	const metadata: ManMetadata = {
		title,
		section,
		date,
		source,
		manual,
		sectionCount,
		lineCount,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		metadata,
	};
}
