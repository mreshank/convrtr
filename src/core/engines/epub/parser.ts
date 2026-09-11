import { unzipSync } from "fflate";
import type {
	EpubChapter,
	EpubConversionResult,
	EpubMetadata,
	EpubToMarkdownOptions,
} from "./types";

/**
 * Decodes common HTML entities into plain text characters.
 */
function decodeHtmlEntities(str: string): string {
	return str
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
			String.fromCharCode(Number.parseInt(hex, 16)),
		);
}

/**
 * Converts XHTML/HTML content into clean, semantic Markdown text.
 */
export function htmlToMarkdown(html: string): string {
	let text = html;

	// 1. Remove XML declarations and DOCTYPE
	text = text.replace(/<\?xml[^>]*\?>/gi, "");
	text = text.replace(/<!DOCTYPE[^>]*>/gi, "");

	// 2. Remove script and style elements entirely
	text = text.replace(
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		"",
	);
	text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
	text = text.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "");

	// 3. Convert headings
	text = text.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n");
	text = text.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n");
	text = text.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n");
	text = text.replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n");
	text = text.replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, "\n\n##### $1\n\n");
	text = text.replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, "\n\n###### $1\n\n");

	// 4. Code blocks and inline code
	text = text.replace(
		/<pre\b[^>]*><code\b[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
		"\n\n```\n$1\n```\n\n",
	);
	text = text.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

	// 5. Blockquotes
	text = text.replace(
		/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi,
		(_, quote) => `\n\n> ${quote.trim().replace(/\n/g, "\n> ")}\n\n`,
	);

	// 6. Bold, italics, underline
	text = text.replace(
		/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi,
		"**$1**",
	);
	text = text.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");

	// 7. Links
	text = text.replace(
		/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
		"[$2]($1)",
	);

	// 8. Lists and items
	text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
	text = text.replace(/<\/(?:ul|ol)>/gi, "\n\n");

	// 9. Paragraphs, breaks, and horizontal rules
	text = text.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
	text = text.replace(/<br\s*\/?>/gi, "\n");
	text = text.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

	// 10. Strip remaining HTML tags
	text = text.replace(/<[^>]+>/g, "");

	// 11. Decode entities
	text = decodeHtmlEntities(text);

	// 12. Normalize whitespace and blank lines
	const cleanLines = text.split("\n").map((l) => l.trimEnd());
	const result = cleanLines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	return result;
}

/**
 * Resolves a relative path within an archive directory.
 */
function resolvePath(baseDir: string, relativePath: string): string {
	if (!baseDir) return relativePath;
	const parts = baseDir.split("/").filter(Boolean);
	const relParts = relativePath.split("/");

	for (const p of relParts) {
		if (p === ".") continue;
		if (p === "..") {
			parts.pop();
		} else {
			parts.push(p);
		}
	}

	return parts.join("/");
}

/**
 * Parses an EPUB (.epub) archive and converts all ordered chapters to clean Markdown.
 */
export function convertEpubToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: EpubToMarkdownOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): EpubConversionResult {
	onProgress?.(0.05, "READ");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(bytes);
	} catch {
		throw new Error(
			"Invalid EPUB file: Unable to unpack ZIP container. File may be corrupted.",
		);
	}

	onProgress?.(0.15, "LOCATE_PACKAGE");

	// 1. Locate container.xml
	const containerXmlBytes = unzipped["META-INF/container.xml"];
	if (!containerXmlBytes) {
		throw new Error(
			"Invalid EPUB file: Missing 'META-INF/container.xml' package descriptor.",
		);
	}

	const containerXml = new TextDecoder("utf-8").decode(containerXmlBytes);
	const opfMatch = containerXml.match(/full-path="([^"]+)"/i);
	if (!opfMatch?.[1]) {
		throw new Error(
			"Invalid EPUB file: Could not determine OPF package path from container.xml.",
		);
	}

	const opfPath = opfMatch[1].trim();
	const opfBytes = unzipped[opfPath];
	if (!opfBytes) {
		throw new Error(
			`Invalid EPUB file: Package document '${opfPath}' not found inside archive.`,
		);
	}

	onProgress?.(0.25, "PARSE_METADATA");

	// 2. Parse OPF
	const opfXml = new TextDecoder("utf-8").decode(opfBytes);
	const opfDir = opfPath.includes("/")
		? opfPath.substring(0, opfPath.lastIndexOf("/"))
		: "";

	// Extract Dublin Core metadata
	const titleMatch = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
	const creatorMatch = opfXml.match(
		/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i,
	);
	const langMatch = opfXml.match(
		/<dc:language[^>]*>([\s\S]*?)<\/dc:language>/i,
	);
	const descMatch = opfXml.match(
		/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i,
	);
	const dateMatch = opfXml.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
	const publisherMatch = opfXml.match(
		/<dc:publisher[^>]*>([\s\S]*?)<\/dc:publisher>/i,
	);

	const metadata: EpubMetadata = {
		title: titleMatch?.[1]
			? decodeHtmlEntities(titleMatch[1].trim())
			: "Untitled E-Book",
		creator: creatorMatch?.[1]
			? decodeHtmlEntities(creatorMatch[1].trim())
			: undefined,
		language: langMatch?.[1]?.trim(),
		description: descMatch?.[1]
			? decodeHtmlEntities(descMatch[1].trim())
			: undefined,
		date: dateMatch?.[1]?.trim(),
		publisher: publisherMatch?.[1]
			? decodeHtmlEntities(publisherMatch[1].trim())
			: undefined,
	};

	// Extract manifest items
	const manifestMap = new Map<string, string>(); // id -> fullPath
	const itemRegex = /<item\b([^>]+)>/gi;
	let itemMatch: RegExpExecArray | null;

	while (true) {
		itemMatch = itemRegex.exec(opfXml);
		if (!itemMatch) break;
		const attrs = itemMatch[1] ?? "";
		const idMatch = attrs.match(/id="([^"]+)"/i);
		const hrefMatch = attrs.match(/href="([^"]+)"/i);

		if (idMatch && hrefMatch && idMatch[1] && hrefMatch[1]) {
			const id = idMatch[1];
			const href = hrefMatch[1];
			// Decode URI component (e.g. %20 -> space)
			const decodedHref = decodeURIComponent(href);
			const fullPath = resolvePath(opfDir, decodedHref);
			manifestMap.set(id, fullPath);
		}
	}

	// Extract spine reading order
	const spineIds: string[] = [];
	const itemrefRegex = /<itemref\b[^>]*idref="([^"]+)"/gi;
	let itemrefMatch: RegExpExecArray | null;

	while (true) {
		itemrefMatch = itemrefRegex.exec(opfXml);
		if (!itemrefMatch) break;
		if (itemrefMatch[1]) {
			spineIds.push(itemrefMatch[1]);
		}
	}

	if (spineIds.length === 0) {
		throw new Error(
			"Invalid EPUB file: No reading order items found in <spine>.",
		);
	}

	onProgress?.(0.4, "CONVERT_CHAPTERS");

	// 3. Process each spine chapter
	const chapters: EpubChapter[] = [];

	for (let i = 0; i < spineIds.length; i++) {
		const id = spineIds[i];
		if (!id) continue;
		const chapterPath = manifestMap.get(id);
		if (!chapterPath) continue;

		const chapterBytes = unzipped[chapterPath];
		if (!chapterBytes) continue;

		const chapterHtml = new TextDecoder("utf-8").decode(chapterBytes);
		const markdown = htmlToMarkdown(chapterHtml);

		if (markdown.length > 0) {
			// Try extracting chapter title from first heading
			const firstHeading = markdown.match(/^#+\s+(.+)$/m);
			const chapterTitle = firstHeading ? firstHeading[1] : undefined;

			chapters.push({
				id,
				href: chapterPath,
				title: chapterTitle,
				markdown,
			});
		}

		onProgress?.(0.4 + (i / spineIds.length) * 0.5, "CONVERT_CHAPTERS");
	}

	if (chapters.length === 0) {
		throw new Error(
			"Failed to convert EPUB: No readable chapter text could be extracted.",
		);
	}

	onProgress?.(0.95, "SYNTHESIZE");

	// 4. Assemble final Markdown document
	const sections: string[] = [];

	if (options.includeFrontmatter !== false) {
		const frontmatterLines = ["---"];
		frontmatterLines.push(`title: "${metadata.title.replace(/"/g, '\\"')}"`);
		if (metadata.creator) {
			frontmatterLines.push(
				`author: "${metadata.creator.replace(/"/g, '\\"')}"`,
			);
		}
		if (metadata.language) {
			frontmatterLines.push(`language: "${metadata.language}"`);
		}
		if (metadata.publisher) {
			frontmatterLines.push(
				`publisher: "${metadata.publisher.replace(/"/g, '\\"')}"`,
			);
		}
		if (metadata.date) {
			frontmatterLines.push(`date: "${metadata.date}"`);
		}
		frontmatterLines.push(`chapters: ${chapters.length}`);
		frontmatterLines.push("---\n");
		sections.push(frontmatterLines.join("\n"));
	}

	const divider = options.includeDividers !== false ? "\n\n---\n\n" : "\n\n";
	const chaptersText = chapters.map((c) => c.markdown).join(divider);
	sections.push(chaptersText);

	const markdownText = sections.join("\n");
	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		chapters,
		markdownText,
	};
}
