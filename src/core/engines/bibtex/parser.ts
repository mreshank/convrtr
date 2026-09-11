import { SITE } from "@/lib/site";
import type {
	BibtexConversionResult,
	BibtexEntry,
	BibtexToMarkdownOptions,
} from "./types";

/**
 * Decodes common LaTeX special characters, accents, and formatting commands.
 */
export function decodeLatex(text: string): string {
	if (!text) return "";

	let s = text;

	// LaTeX accents: {\"a}, \"a, {\"u}, \"{u}, \'{e}, etc.
	const accentMap: Record<string, string> = {
		'\\"a': "ä",
		'\\"o': "ö",
		'\\"u': "ü",
		'\\"A': "Ä",
		'\\"O': "Ö",
		'\\"U': "Ü",
		"\\'a": "á",
		"\\'e": "é",
		"\\'i": "í",
		"\\'o": "ó",
		"\\'u": "ú",
		"\\'y": "ý",
		"\\'A": "Á",
		"\\'E": "É",
		"\\'I": "Í",
		"\\'O": "Ó",
		"\\'U": "Ú",
		"\\'Y": "Ý",
		"\\`a": "à",
		"\\`e": "è",
		"\\`i": "ì",
		"\\`o": "ò",
		"\\`u": "ù",
		"\\`A": "À",
		"\\`E": "È",
		"\\`I": "Ì",
		"\\`O": "Ò",
		"\\`U": "Ù",
		"\\^a": "â",
		"\\^e": "ê",
		"\\^i": "î",
		"\\^o": "ô",
		"\\^u": "û",
		"\\^A": "Â",
		"\\^E": "Ê",
		"\\^I": "Î",
		"\\^O": "Ô",
		"\\^U": "Û",
		"\\~a": "ã",
		"\\~o": "õ",
		"\\~n": "ñ",
		"\\~A": "Ã",
		"\\~O": "Õ",
		"\\~N": "Ñ",
		"\\c{c}": "ç",
		"\\c{C}": "Ç",
		"\\ss": "ß",
		"\\aa": "å",
		"\\AA": "Å",
		"\\ae": "æ",
		"\\AE": "Æ",
		"\\oe": "œ",
		"\\OE": "Œ",
		"\\o": "ø",
		"\\O": "Ø",
		"\\l": "ł",
		"\\L": "Ł",
	};

	// Replace braced accents like {\"a} or \'{e} or \c{c}
	for (const [cmd, char] of Object.entries(accentMap)) {
		s = s.replaceAll(`{${cmd}}`, char);
		s = s.replaceAll(cmd, char);
	}

	// Dashes and quotes
	s = s.replaceAll("---", "—");
	s = s.replaceAll("--", "–");
	s = s.replaceAll("``", '"');
	s = s.replaceAll("''", '"');
	s = s.replaceAll("\\&", "&");
	s = s.replaceAll("\\%", "%");
	s = s.replaceAll("\\$", "$");
	s = s.replaceAll("\\_", "_");
	s = s.replaceAll("\\#", "#");
	s = s.replaceAll("\\textendash", "–");
	s = s.replaceAll("\\textemdash", "—");

	// Strip remaining isolated curly braces used in BibTeX for capital protection
	s = s.replace(/\{([^{}]+)\}/g, "$1");
	s = s.replace(/\{([^{}]+)\}/g, "$1"); // second pass for nested

	// Normalize spaces
	s = s.replace(/\s+/g, " ").trim();

	return s;
}

/**
 * Parses individual author strings ("Last, First and Last2, First2") into clean names.
 */
function parseAuthors(authorField: string): string[] {
	if (!authorField) return [];

	const rawAuthors = authorField.split(/\s+and\s+/i);
	return rawAuthors.map((raw) => {
		const decoded = decodeLatex(raw);
		if (decoded.includes(",")) {
			const parts = decoded.split(",").map((p) => p.trim());
			if (parts.length >= 2 && parts[0] && parts[1]) {
				return `${parts[1]} ${parts[0]}`;
			}
		}
		return decoded;
	});
}

/**
 * Parses a BibTeX (.bib) file into structured entries and clean Markdown.
 */
export function parseBibtex(
	input: string | Uint8Array | ArrayBuffer,
	options: BibtexToMarkdownOptions = {},
): BibtexConversionResult {
	let text = "";
	if (typeof input === "string") {
		text = input;
	} else if (input instanceof Uint8Array) {
		text = new TextDecoder("utf-8").decode(input);
	} else {
		text = new TextDecoder("utf-8").decode(new Uint8Array(input));
	}

	const entries: BibtexEntry[] = [];
	const len = text.length;
	let pos = 0;

	while (pos < len) {
		// Find start of next entry: '@'
		const atIdx = text.indexOf("@", pos);
		if (atIdx === -1) break;

		pos = atIdx + 1;

		// Read entry type
		let typeEnd = pos;
		while (typeEnd < len && /[a-zA-Z]/i.test(text[typeEnd] ?? "")) {
			typeEnd++;
		}

		const entryType = text.slice(pos, typeEnd).toLowerCase();
		pos = typeEnd;

		// Skip comments, string, preamble macros
		if (
			entryType === "comment" ||
			entryType === "string" ||
			entryType === "preamble"
		) {
			continue;
		}

		// Find opening delimiter: '{' or '('
		while (pos < len && text[pos] !== "{" && text[pos] !== "(") {
			pos++;
		}
		if (pos >= len) break;

		const openDelim = text[pos];
		const closeDelim = openDelim === "{" ? "}" : ")";
		pos++; // skip openDelim

		// Read cite key until ','
		const commaIdx = text.indexOf(",", pos);
		if (commaIdx === -1) break;

		const key = text.slice(pos, commaIdx).trim();
		pos = commaIdx + 1;

		const fields: Record<string, string> = {};

		// Parse key-value pairs until closeDelim
		let braceDepth = 1;
		while (pos < len && braceDepth > 0) {
			// Skip whitespace, commas, comments
			while (pos < len && /[\s,\n\r\t]/.test(text[pos] ?? "")) {
				pos++;
			}
			if (pos >= len) break;

			if (text[pos] === closeDelim) {
				braceDepth--;
				pos++;
				break;
			}

			// Read field name
			const fieldNameStart = pos;
			while (pos < len && /[a-zA-Z0-9_-]/i.test(text[pos] ?? "")) {
				pos++;
			}
			const fieldName = text.slice(fieldNameStart, pos).toLowerCase().trim();

			// Skip to '='
			while (pos < len && text[pos] !== "=" && text[pos] !== closeDelim) {
				pos++;
			}
			if (pos >= len || text[pos] === closeDelim) break;

			pos++; // skip '='

			// Skip whitespace to value
			while (pos < len && /[\s\n\r\t]/.test(text[pos] ?? "")) {
				pos++;
			}
			if (pos >= len) break;

			let val = "";
			const valStartChar = text[pos];

			if (valStartChar === "{") {
				pos++;
				let depth = 1;
				const vStart = pos;
				while (pos < len && depth > 0) {
					if (text[pos] === "{") depth++;
					else if (text[pos] === "}") depth--;
					if (depth > 0) pos++;
				}
				val = text.slice(vStart, pos);
				pos++; // skip closing '}'
			} else if (valStartChar === '"') {
				pos++;
				const vStart = pos;
				while (pos < len) {
					if (text[pos] === '"' && text[pos - 1] !== "\\") {
						break;
					}
					pos++;
				}
				val = text.slice(vStart, pos);
				pos++; // skip closing '"'
			} else {
				// Bare token or number (until ',' or closeDelim)
				const vStart = pos;
				while (
					pos < len &&
					text[pos] !== "," &&
					text[pos] !== closeDelim &&
					text[pos] !== "\n"
				) {
					pos++;
				}
				val = text.slice(vStart, pos).trim();
			}

			if (fieldName) {
				fields[fieldName] = val;
			}
		}

		if (key && Object.keys(fields).length > 0) {
			const title = fields.title ? decodeLatex(fields.title) : undefined;
			const authors = fields.author
				? parseAuthors(fields.author)
				: fields.editor
					? parseAuthors(fields.editor)
					: undefined;
			const year = fields.year ? decodeLatex(fields.year) : undefined;
			const journal = fields.journal ? decodeLatex(fields.journal) : undefined;
			const booktitle = fields.booktitle
				? decodeLatex(fields.booktitle)
				: undefined;
			const volume = fields.volume ? decodeLatex(fields.volume) : undefined;
			const number = fields.number ? decodeLatex(fields.number) : undefined;
			const pages = fields.pages ? decodeLatex(fields.pages) : undefined;
			const doi = fields.doi ? decodeLatex(fields.doi) : undefined;
			const url = fields.url ? decodeLatex(fields.url) : undefined;
			const publisher = fields.publisher
				? decodeLatex(fields.publisher)
				: undefined;
			const abstract = fields.abstract
				? decodeLatex(fields.abstract)
				: undefined;

			entries.push({
				key,
				type: entryType,
				title,
				authors,
				year,
				journal,
				booktitle,
				volume,
				number,
				pages,
				doi,
				url,
				publisher,
				abstract,
				fields,
			});
		}
	}

	const format = options.format ?? "table";
	let markdown = "";

	if (format === "json") {
		markdown = JSON.stringify(entries, null, 2);
	} else if (format === "list") {
		const lines: string[] = [
			"# Bibliography",
			"",
			`*Generated by [convrtr](${SITE}) — ${entries.length} references*`,
			"",
		];

		entries.forEach((entry, idx) => {
			const authorsStr = entry.authors?.join(", ") || "Unknown Authors";
			const yearStr = entry.year ? ` (${entry.year})` : "";
			const venueStr =
				entry.journal || entry.booktitle || entry.publisher || "";
			const titleStr = entry.title || entry.key;

			lines.push(`### ${idx + 1}. ${titleStr}${yearStr}`);
			lines.push(`- **Citation Key:** \`${entry.key}\` (${entry.type})`);
			lines.push(`- **Authors:** ${authorsStr}`);
			if (venueStr) {
				lines.push(`- **Venue / Publisher:** *${venueStr}*`);
			}
			if (entry.pages) {
				lines.push(`- **Pages:** ${entry.pages}`);
			}
			if (entry.doi) {
				lines.push(`- **DOI:** [${entry.doi}](https://doi.org/${entry.doi})`);
			} else if (entry.url) {
				lines.push(`- **URL:** [${entry.url}](${entry.url})`);
			}
			if (options.includeAbstract && entry.abstract) {
				lines.push("", `> **Abstract:** ${entry.abstract}`);
			}
			lines.push("");
		});

		markdown = lines.join("\n");
	} else {
		// Table format
		const lines: string[] = [
			"# Bibliography Table",
			"",
			`*Generated by [convrtr](${SITE}) — ${entries.length} references*`,
			"",
			"| Citation Key | Title | Authors | Year | Venue | DOI / Link |",
			`| ${":"}--- | ${":"}--- | ${":"}--- | ${":"}---: | ${":"}--- | ${":"}--- |`,
		];

		for (const entry of entries) {
			const safeTitle = (entry.title || entry.key).replaceAll("|", "\\|");
			const safeAuthors = (entry.authors?.join(", ") || "Unknown").replaceAll(
				"|",
				"\\|",
			);
			const year = entry.year || "—";
			const venue = (
				entry.journal ||
				entry.booktitle ||
				entry.publisher ||
				"—"
			).replaceAll("|", "\\|");

			let link = "—";
			if (entry.doi) {
				link = `[DOI](https://doi.org/${entry.doi})`;
			} else if (entry.url) {
				link = `[Link](${entry.url})`;
			}

			lines.push(
				`| \`${entry.key}\` | **${safeTitle}** | ${safeAuthors} | ${year} | *${venue}* | ${link} |`,
			);
		}

		markdown = lines.join("\n");
	}

	return {
		markdown,
		entries,
		entryCount: entries.length,
	};
}
