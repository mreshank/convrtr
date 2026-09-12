import type {
	OpmlConversionOptions,
	OpmlConversionResult,
	OpmlDocument,
	OpmlHead,
	OpmlOutlineNode,
} from "./types";

function decodeXmlEntities(text: string): string {
	return text
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

function parseAttributes(attrString: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const attrRegex = /([a-zA-Z_0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	let match = attrRegex.exec(attrString);
	while (match) {
		const key = match[1];
		if (key) {
			const value = match[2] ?? match[3] ?? "";
			attrs[key] = decodeXmlEntities(value);
		}
		match = attrRegex.exec(attrString);
	}
	return attrs;
}

export function parseOpml(xmlText: string): OpmlDocument {
	if (!xmlText || typeof xmlText !== "string") {
		throw new Error("Invalid input: Expected non-empty XML string for OPML");
	}

	const isOpml = /<opml[\s>]/i.test(xmlText);
	if (!isOpml) {
		throw new Error("Invalid OPML: Document missing <opml> root element");
	}

	const versionMatch = xmlText.match(/<opml[^>]*version=["']([^"']+)["']/i);
	const version = versionMatch?.[1] ?? "2.0";

	// Parse <head>
	const head: OpmlHead = {};
	const headMatch = xmlText.match(/<head>([\s\S]*?)<\/head>/i);
	if (headMatch && headMatch[1]) {
		const headContent = headMatch[1];
		const titleMatch = headContent.match(/<title>([\s\S]*?)<\/title>/i);
		if (titleMatch?.[1]) head.title = decodeXmlEntities(titleMatch[1].trim());

		const createdMatch = headContent.match(
			/<dateCreated>([\s\S]*?)<\/dateCreated>/i,
		);
		if (createdMatch?.[1])
			head.dateCreated = decodeXmlEntities(createdMatch[1].trim());

		const modifiedMatch = headContent.match(
			/<dateModified>([\s\S]*?)<\/dateModified>/i,
		);
		if (modifiedMatch?.[1])
			head.dateModified = decodeXmlEntities(modifiedMatch[1].trim());

		const ownerMatch = headContent.match(/<ownerName>([\s\S]*?)<\/ownerName>/i);
		if (ownerMatch?.[1])
			head.ownerName = decodeXmlEntities(ownerMatch[1].trim());

		const emailMatch = headContent.match(
			/<ownerEmail>([\s\S]*?)<\/ownerEmail>/i,
		);
		if (emailMatch?.[1])
			head.ownerEmail = decodeXmlEntities(emailMatch[1].trim());
	}

	// Parse <body> outlines
	const bodyMatch = xmlText.match(/<body>([\s\S]*?)<\/body>/i);
	const bodyContent = bodyMatch?.[1] || "";

	const bodyNodes = parseOutlineElements(bodyContent);

	return {
		version,
		head,
		body: bodyNodes,
	};
}

function parseOutlineElements(content: string): OpmlOutlineNode[] {
	const nodes: OpmlOutlineNode[] = [];
	// Matches <outline ... /> or <outline ...> ... </outline>
	const outlineTagRegex =
		/<outline\b([^>]*?)(?:\/>|>([\s\S]*?)<\/outline\s*>)/gi;

	let match = outlineTagRegex.exec(content);
	while (match) {
		const attrString = match[1] ?? "";
		const innerContent = match[2];

		const attrs = parseAttributes(attrString);
		const text = attrs.text || attrs.title || "";
		if (text || attrs.xmlUrl || attrs.url) {
			const isChecked =
				attrs._status === "checked" ||
				attrs.completed === "true" ||
				attrs.done === "true";
			const isUnchecked =
				attrs._status === "unchecked" ||
				attrs.completed === "false" ||
				attrs.done === "false";

			let status: "checked" | "unchecked" | undefined;
			if (isChecked) status = "checked";
			else if (isUnchecked) status = "unchecked";

			const children = innerContent ? parseOutlineElements(innerContent) : [];

			nodes.push({
				text,
				title: attrs.title,
				type: attrs.type,
				xmlUrl: attrs.xmlUrl,
				htmlUrl: attrs.htmlUrl,
				url: attrs.url,
				description: attrs.description,
				note: attrs._note || attrs.note,
				status,
				category: attrs.category,
				children,
			});
		}

		match = outlineTagRegex.exec(content);
	}

	return nodes;
}

export function convertOpmlToMarkdown(
	input: string | Uint8Array | ArrayBuffer,
	options: OpmlConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): OpmlConversionResult {
	onProgress?.(0.1, "PARSING_OPML");

	let xmlText = "";
	if (typeof input === "string") {
		xmlText = input;
	} else if (input instanceof Uint8Array) {
		xmlText = new TextDecoder("utf-8").decode(input);
	} else {
		xmlText = new TextDecoder("utf-8").decode(new Uint8Array(input));
	}

	const document = parseOpml(xmlText);
	onProgress?.(0.5, "CONVERTING_MARKDOWN");

	const lines: string[] = [];

	// Frontmatter
	const includeFrontmatter = options.includeFrontmatter !== false;
	if (includeFrontmatter) {
		const metaFields: string[] = [];
		if (document.head.title) {
			metaFields.push(`title: "${document.head.title.replace(/"/g, '\\"')}"`);
		}
		if (document.head.dateCreated) {
			metaFields.push(`dateCreated: "${document.head.dateCreated}"`);
		}
		if (document.head.dateModified) {
			metaFields.push(`dateModified: "${document.head.dateModified}"`);
		}
		if (document.head.ownerName) {
			metaFields.push(
				`author: "${document.head.ownerName.replace(/"/g, '\\"')}"`,
			);
		}
		if (document.head.ownerEmail) {
			metaFields.push(`email: "${document.head.ownerEmail}"`);
		}

		if (metaFields.length > 0) {
			lines.push("---");
			lines.push(...metaFields);
			lines.push("---");
			lines.push("");
		}
	}

	// Main Title Heading
	if (document.head.title) {
		lines.push(`# ${document.head.title}`);
		lines.push("");
	}

	let totalNodes = 0;
	let feedCount = 0;
	let maxDepth = 0;

	function traverseStats(nodeList: OpmlOutlineNode[], depth: number) {
		maxDepth = Math.max(maxDepth, depth);
		for (const n of nodeList) {
			totalNodes++;
			if (n.xmlUrl || n.type === "rss" || n.type === "atom") {
				feedCount++;
			}
			if (n.children.length > 0) {
				traverseStats(n.children, depth + 1);
			}
		}
	}
	traverseStats(document.body, 1);

	const renderFeedsAsTable = options.renderFeedsAsTable !== false;

	// Render nodes
	function renderNodes(nodeList: OpmlOutlineNode[], depth: number) {
		for (const node of nodeList) {
			// Check if this node is a folder containing exclusively or mostly feeds
			const childFeeds = node.children.filter(
				(c) => c.xmlUrl || c.type === "rss",
			);
			const isFeedContainer =
				renderFeedsAsTable &&
				childFeeds.length > 0 &&
				childFeeds.length === node.children.length;

			if (isFeedContainer) {
				// Render as a section heading and table
				const headingLevel = Math.min(6, Math.max(2, depth + 1));
				lines.push(`${"#".repeat(headingLevel)} ${node.text || "Feeds"}`);
				lines.push("");
				lines.push("| Feed Title | Site | Feed URL |");
				lines.push("| --- | --- | --- |");

				for (const feed of node.children) {
					const title = feed.text || feed.title || "Untitled";
					const siteLink = feed.htmlUrl ? `[Website](${feed.htmlUrl})` : "—";
					const feedLink = feed.xmlUrl ? `[RSS Feed](${feed.xmlUrl})` : "—";
					lines.push(`| ${title} | ${siteLink} | ${feedLink} |`);
				}
				lines.push("");
				continue;
			}

			// Render as outline item
			const indent = "  ".repeat(depth);
			let itemPrefix = "- ";
			if (node.status === "checked") {
				itemPrefix = "- [x] ";
			} else if (node.status === "unchecked") {
				itemPrefix = "- [ ] ";
			}

			let itemText = node.text;
			const targetUrl = node.htmlUrl || node.url;
			if (targetUrl) {
				itemText = `[${node.text}](${targetUrl})`;
			} else if (node.xmlUrl) {
				itemText = `[${node.text}](${node.xmlUrl})`;
			}

			lines.push(`${indent}${itemPrefix}${itemText}`);

			if (node.description || node.note) {
				const noteText = node.note || node.description;
				if (noteText) {
					lines.push(`${indent}  > ${noteText}`);
				}
			}

			if (node.children.length > 0) {
				renderNodes(node.children, depth + 1);
			}
		}
	}

	renderNodes(document.body, 0);

	onProgress?.(1.0, "COMPLETE");

	return {
		markdown: lines.join("\n").trim() + "\n",
		document,
		stats: {
			totalNodes,
			feedCount,
			outlineDepth: maxDepth,
		},
	};
}
