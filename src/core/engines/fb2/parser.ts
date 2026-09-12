import type {
	Fb2ConversionOptions,
	Fb2ConversionResult,
	Fb2Image,
	Fb2Metadata,
} from "./types";

function decodeInput(input: Uint8Array | ArrayBuffer | string): string {
	if (typeof input === "string") {
		return input;
	}
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	// Quick check of the XML declaration for encoding
	let encoding = "utf-8";
	const headerPreview = new TextDecoder("latin1").decode(
		bytes.subarray(0, 200),
	);
	const match = headerPreview.match(/encoding=["']([^"']+)["']/i);
	if (match?.[1]) {
		const enc = match[1].toLowerCase().trim();
		try {
			// Test if TextDecoder supports this encoding
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

function cleanText(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(new RegExp(`&${String.fromCharCode(35)}39;`, "g"), "'")
		.replace(new RegExp(`&${String.fromCharCode(35)}160;`, "g"), " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Converts a FictionBook 2.0 (.fb2) e-book XML document into GitHub Flavored Markdown.
 */
export function convertFb2ToMarkdown(
	input: Uint8Array | ArrayBuffer | string,
	options: Fb2ConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): Fb2ConversionResult {
	onProgress?.(0.05, "READ_INPUT");
	const xml = decodeInput(input);

	if (!xml.includes("<FictionBook") && !xml.includes("<body")) {
		throw new Error(
			"Invalid FB2 document: Missing root '<FictionBook>' or '<body>' elements.",
		);
	}

	onProgress?.(0.15, "EXTRACT_METADATA");
	// Extract metadata from <title-info>
	let title = "Untitled Book";
	const titleMatch = xml.match(/<book-title>([\s\S]*?)<\/book-title>/i);
	if (titleMatch?.[1]) {
		title = cleanText(titleMatch[1]);
	}

	const authors: string[] = [];
	const authorRegex = /<author>([\s\S]*?)<\/author>/gi;
	let authorMatch = authorRegex.exec(xml);
	while (authorMatch) {
		const authorContent = authorMatch[1] ?? "";
		const first = authorContent.match(
			/<first-name>([\s\S]*?)<\/first-name>/i,
		)?.[1];
		const middle = authorContent.match(
			/<middle-name>([\s\S]*?)<\/middle-name>/i,
		)?.[1];
		const last = authorContent.match(
			/<last-name>([\s\S]*?)<\/last-name>/i,
		)?.[1];
		const nick = authorContent.match(/<nickname>([\s\S]*?)<\/nickname>/i)?.[1];

		const parts: string[] = [];
		if (first) parts.push(cleanText(first));
		if (middle) parts.push(cleanText(middle));
		if (last) parts.push(cleanText(last));
		if (parts.length > 0) {
			authors.push(parts.join(" "));
		} else if (nick) {
			authors.push(cleanText(nick));
		}
		authorMatch = authorRegex.exec(xml);
	}

	const genres: string[] = [];
	const genreRegex = /<genre>([\s\S]*?)<\/genre>/gi;
	let genreMatch = genreRegex.exec(xml);
	while (genreMatch) {
		if (genreMatch[1]) {
			const g = cleanText(genreMatch[1]);
			if (g && !genres.includes(g)) genres.push(g);
		}
		genreMatch = genreRegex.exec(xml);
	}

	let dateStr: string | undefined;
	const dateMatch = xml.match(/<date[^>]*>([\s\S]*?)<\/date>/i);
	if (dateMatch?.[1]) {
		dateStr = cleanText(dateMatch[1]);
	}

	let language: string | undefined;
	const langMatch = xml.match(/<lang>([\s\S]*?)<\/lang>/i);
	if (langMatch?.[1]) {
		language = cleanText(langMatch[1]);
	}

	onProgress?.(0.3, "EXTRACT_IMAGES");
	// Extract <binary> elements
	const images: Fb2Image[] = [];
	const imageMap = new Map<string, string>(); // id -> dataUri

	if (options.extractImages !== false) {
		const binaryRegex =
			/<binary\s+[^>]*id=["']([^"']+)["'][^>]*content-type=["']([^"']+)["'][^>]*>([\s\S]*?)<\/binary>/gi;
		let binMatch = binaryRegex.exec(xml);
		while (binMatch) {
			const id = binMatch[1] ?? "";
			const cType = binMatch[2] ?? "image/jpeg";
			const rawBase64 = (binMatch[3] ?? "").replace(/\s+/g, "");
			const dataUri = `data:${cType};base64,${rawBase64}`;

			images.push({
				id,
				contentType: cType,
				dataUri,
				byteLength: Math.floor((rawBase64.length * 3) / 4),
			});
			imageMap.set(id, dataUri);
			binMatch = binaryRegex.exec(xml);
		}
	}

	onProgress?.(0.5, "PARSE_SECTIONS");
	let sectionCount = 0;

	function formatInline(text: string): string {
		let s = text;
		// <strong> / <b> -> **text**
		s = s.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
		s = s.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
		// <emphasis> / <i> -> *text*
		s = s.replace(/<emphasis[^>]*>([\s\S]*?)<\/emphasis>/gi, "*$1*");
		s = s.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
		// <strikethrough> -> ~~text~~
		s = s.replace(
			/<strikethrough[^>]*>([\s\S]*?)<\/strikethrough>/gi,
			"~~$1~~",
		);
		// <code> -> `text`
		s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
		// <a ...> -> [text](href)
		s = s.replace(
			/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
			"[$2]($1)",
		);
		// <image l:href="#id" ...>
		s = s.replace(
			/<image\s+[^>]*(?:xlink:href|l:href)=["'](?:#)?([^"']+)["'][^>]*\/?>/gi,
			(_, id) => {
				const src = imageMap.get(id) ?? id;
				return `\n\n![${id}](${src})\n\n`;
			},
		);
		// Strip remaining HTML tags
		s = s.replace(/<[^>]+>/g, "");
		return cleanText(s);
	}

	function parseBlockContent(content: string, level: number): string {
		const out: string[] = [];

		// Process elements sequentially
		const tagRegex =
			/<(title|subtitle|epigraph|cite|poem|p|empty-line|image|section)([\s\S]*?)>([\s\S]*?)<\/\1>|<(empty-line|image)([\s\S]*?)\/?>/gi;

		let match = tagRegex.exec(content);

		while (match) {
			const tagName = (match[1] || match[4] || "").toLowerCase();
			const innerContent = match[3] ?? "";
			const attributes = match[2] || match[5] || "";

			if (tagName === "title") {
				const titleText = formatInline(innerContent);
				if (titleText) {
					const hLevel = Math.min(
						6,
						Math.max(1, level + (options.headingLevelOffset ?? 0)),
					);
					out.push(`${"#".repeat(hLevel)} ${titleText}\n`);
				}
			} else if (tagName === "subtitle") {
				const subText = formatInline(innerContent);
				if (subText) {
					const hLevel = Math.min(
						6,
						Math.max(2, level + 1 + (options.headingLevelOffset ?? 0)),
					);
					out.push(`${"#".repeat(hLevel)} ${subText}\n`);
				}
			} else if (tagName === "section") {
				sectionCount++;
				out.push(parseBlockContent(innerContent, level + 1));
			} else if (tagName === "epigraph" || tagName === "cite") {
				// Epigraph or citation
				const lines = innerContent
					.split(/<\/p>|<empty-line\s*\/?>/i)
					.map((line) => formatInline(line))
					.filter(Boolean);
				if (lines.length > 0) {
					out.push(lines.map((l) => `> ${l}`).join("\n>\n") + "\n");
				}
			} else if (tagName === "poem") {
				// Poem stanzas
				const verses: string[] = [];
				const vMatches = innerContent.match(/<v>([\s\S]*?)<\/v>/gi);
				if (vMatches) {
					for (const vm of vMatches) {
						verses.push(formatInline(vm));
					}
					out.push(verses.map((v) => `> *${v}*  `).join("\n") + "\n");
				}
			} else if (tagName === "p") {
				const pText = formatInline(innerContent);
				if (pText) {
					out.push(`${pText}\n`);
				}
			} else if (tagName === "empty-line") {
				out.push("");
			} else if (tagName === "image") {
				const idMatch = attributes.match(
					/(?:xlink:href|l:href)=["'](?:#)?([^"']+)["']/i,
				);
				if (idMatch?.[1]) {
					const id = idMatch[1];
					const src = imageMap.get(id) ?? id;
					out.push(`![${id}](${src})\n`);
				}
			}

			match = tagRegex.exec(content);
		}

		// If no block tags were found in content, fallback to plain paragraphs
		if (out.length === 0 && content.trim()) {
			const paragraphs = content
				.split(/\n\s*\n/)
				.map((p) => formatInline(p))
				.filter(Boolean);
			return `${paragraphs.join("\n\n")}\n\n`;
		}

		return out.join("\n");
	}

	// Extract primary <body> content
	const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
	const bodyContent = bodyMatch?.[1] ?? xml;

	const markdownBody = parseBlockContent(bodyContent, 1).trim();

	// Frontmatter
	let frontmatter = "";
	if (options.includeFrontmatter !== false) {
		const lines: string[] = ["---"];
		lines.push(`title: "${title.replace(/"/g, '\\"')}"`);
		if (authors.length > 0) {
			lines.push("authors:");
			for (const a of authors) {
				lines.push(`  - "${a.replace(/"/g, '\\"')}"`);
			}
		}
		if (genres.length > 0) {
			lines.push("genres:");
			for (const g of genres) {
				lines.push(`  - ${g}`);
			}
		}
		if (language) {
			lines.push(`language: ${language}`);
		}
		if (dateStr) {
			lines.push(`date: "${dateStr}"`);
		}
		lines.push("---", "", "");
		frontmatter = lines.join("\n");
	}

	onProgress?.(1.0, "COMPLETE");
	const markdown = `${frontmatter}${markdownBody}\n`;

	const metadata: Fb2Metadata = {
		title,
		authors,
		genres,
		date: dateStr,
		language,
		sectionCount: Math.max(1, sectionCount),
		imageCount: images.length,
	};

	return {
		markdown,
		metadata,
		images,
	};
}
