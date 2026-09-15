import { unzipSync } from "fflate";
import { convertRtfToMarkdown } from "../rtf/parser";
import type {
	RtfdConversionResult,
	RtfdMetadata,
	RtfdToMarkdownOptions,
} from "./types";

/**
 * Converts Apple Rich Text Format with Attachments (.rtfd) bundles into GFM Markdown.
 */
export function convertRtfdToMarkdown(
	input: ArrayBuffer | Uint8Array,
	options: RtfdToMarkdownOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): RtfdConversionResult {
	onProgress?.(0.1, "INSPECT_CONTAINER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 8) {
		throw new Error(
			"Invalid RTFD document: Buffer too small for RTFD container.",
		);
	}

	let rtfBytes: Uint8Array | null = null;
	const attachments: string[] = [];

	// Check if ZIP archive container (0x50 0x4b 0x03 0x04)
	if (
		bytes[0] === 0x50 &&
		bytes[1] === 0x4b &&
		bytes[2] === 0x03 &&
		bytes[3] === 0x04
	) {
		onProgress?.(0.2, "UNZIP_BUNDLE");
		let unzipped: Record<string, Uint8Array>;
		try {
			unzipped = unzipSync(bytes);
		} catch {
			throw new Error("Failed to decompress RTFD package archive.");
		}

		for (const [filename, fileData] of Object.entries(unzipped)) {
			const cleanName = filename.replace(/^.*[/\\]/, "");
			if (!cleanName || cleanName.startsWith(".")) continue;

			if (
				cleanName.toLowerCase() === "txt.rtf" ||
				cleanName.toLowerCase().endsWith(".rtf")
			) {
				rtfBytes = fileData;
			} else {
				attachments.push(cleanName);
			}
		}

		if (!rtfBytes) {
			throw new Error(
				"Invalid RTFD bundle: Missing 'TXT.rtf' document stream in archive.",
			);
		}
	} else {
		// Single RTF file or stream
		rtfBytes = bytes;
	}

	onProgress?.(0.4, "PARSE_RTF_BODY");

	const rtfResult = convertRtfToMarkdown(
		rtfBytes,
		{
			includeFrontmatter: false,
			documentTitle: options.documentTitle,
		},
		(ratio, phase) => onProgress?.(0.4 + ratio * 0.4, phase),
	);

	onProgress?.(0.85, "RESOLVE_ATTACHMENTS");

	let bodyMarkdown = rtfResult.markdownText;

	// In NeXT/Apple RTFD, attachment tags can be embedded in RTF as \NeXTGraphic filename
	// If any attachments exist, insert references into markdown if not already referenced
	if (attachments.length > 0) {
		const attachmentSection: string[] = ["", "### Attachments", ""];
		for (const att of attachments) {
			const isImage = /\.(png|jpe?g|gif|webp|tiff?|bmp|svg)$/i.test(att);
			if (isImage) {
				attachmentSection.push(`![${att}](${att})`);
			} else {
				attachmentSection.push(`- [${att}](${att})`);
			}
		}
		bodyMarkdown = `${bodyMarkdown.trim()}\n\n${attachmentSection.join("\n")}\n`;
	}

	onProgress?.(0.95, "FINALIZE");

	const metadata: RtfdMetadata = {
		title: rtfResult.metadata.title,
		author: rtfResult.metadata.author,
		generator: rtfResult.metadata.generator || "Apple RTFD",
		attachments,
	};

	const lines: string[] = [];
	if (options.includeFrontmatter !== false) {
		const fmLines: string[] = [];
		if (metadata.title) fmLines.push(`title: "${metadata.title}"`);
		if (metadata.author) fmLines.push(`author: "${metadata.author}"`);
		if (metadata.generator) fmLines.push(`generator: "${metadata.generator}"`);
		if (attachments.length > 0) {
			fmLines.push(
				`attachments: [${attachments.map((a) => `"${a}"`).join(", ")}]`,
			);
		}
		if (fmLines.length > 0) {
			lines.push("---", ...fmLines, "---", "");
		}
	}

	lines.push(bodyMarkdown.trim());
	const markdown = `${lines.join("\n").trim()}\n`;
	const markdownBuffer = new TextEncoder().encode(markdown).buffer;

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown,
		markdownBuffer,
		metadata,
	};
}
