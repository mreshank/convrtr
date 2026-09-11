import { unzipSync } from "fflate";

interface XMindTopic {
	id?: string;
	title?: string;
	notes?: {
		plain?: { content?: string };
		realHTML?: { content?: string };
	};
	children?: {
		attached?: XMindTopic[];
	};
}

interface XMindSheet {
	id?: string;
	title?: string;
	rootTopic?: XMindTopic;
}

function formatTopic(topic: XMindTopic, depth: number): string[] {
	const lines: string[] = [];
	const title = topic.title?.trim() ?? "Untitled";

	if (depth === 1) {
		lines.push(`# ${title}\n`);
	} else if (depth === 2) {
		lines.push(`## ${title}\n`);
	} else if (depth === 3) {
		lines.push(`### ${title}\n`);
	} else {
		const indent = "  ".repeat(depth - 4);
		lines.push(`${indent}- ${title}`);
	}

	// Notes
	const noteText = topic.notes?.plain?.content?.trim();
	if (noteText) {
		const noteIndent = depth >= 4 ? "  ".repeat(depth - 3) : "> ";
		lines.push(`${noteIndent}${noteText}\n`);
	}

	// Recurse children
	if (topic.children?.attached && Array.isArray(topic.children.attached)) {
		for (const child of topic.children.attached) {
			lines.push(...formatTopic(child, depth + 1));
		}
	}

	return lines;
}

/**
 * Extracts and converts an XMind (.xmind) mindmap into clean hierarchical Markdown.
 */
export function convertXMindToMarkdown(input: ArrayBuffer): string {
	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(new Uint8Array(input));
	} catch (err) {
		throw new Error(
			`convertXMindToMarkdown: Not a valid .xmind ZIP archive (${err instanceof Error ? err.message : String(err)})`,
		);
	}

	const contentEntry = unzipped["content.json"];
	if (!contentEntry) {
		// Check for legacy content.xml
		const xmlEntry = unzipped["content.xml"];
		if (xmlEntry) {
			const text = new TextDecoder().decode(xmlEntry);
			// Simple extraction of title tags from XML
			const titles = [...text.matchAll(/<title>(.*?)<\/title>/g)].map(
				(m) => m[1],
			);
			if (titles.length > 0) {
				return titles
					.map((t, idx) => (idx === 0 ? `# ${t}\n` : `- ${t}`))
					.join("\n");
			}
		}
		throw new Error(
			"convertXMindToMarkdown: Neither content.json nor content.xml was found in the .xmind package",
		);
	}

	const jsonText = new TextDecoder().decode(contentEntry);
	let data: unknown;
	try {
		data = JSON.parse(jsonText);
	} catch (err) {
		throw new Error(
			`convertXMindToMarkdown: Malformed JSON in content.json (${err instanceof Error ? err.message : String(err)})`,
		);
	}

	const sheets: XMindSheet[] = Array.isArray(data)
		? data
		: [data as XMindSheet];
	const outputLines: string[] = [];

	for (const sheet of sheets) {
		if (sheet.title && sheets.length > 1) {
			outputLines.push(`---\n# Sheet: ${sheet.title}\n`);
		}
		if (sheet.rootTopic) {
			outputLines.push(...formatTopic(sheet.rootTopic, 1));
		}
	}

	return `${outputLines.join("\n").trim()}\n`;
}
