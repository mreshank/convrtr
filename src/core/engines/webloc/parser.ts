/**
 * macOS Safari Internet Location (.webloc) Parser & Extractor.
 *
 * .webloc files are Apple Property Lists created when dragging a URL from
 * Safari or Chrome on macOS to the Finder/Desktop. They exist in two variants:
 * 1. XML plist (starting with `<?xml` or `<plist`) containing `<key>URL</key><string>...</string>`.
 * 2. Binary plist (starting with `bplist00`) containing a serialized dictionary.
 *
 * Windows, Android, and Linux cannot open .webloc files natively.
 * This engine extracts the target URL and produces:
 * - Standard Windows Internet Shortcut (.url)
 * - Clickable HTML Redirect Document (.html)
 * - Markdown Link (.md)
 */

export interface WeblocData {
	url: string;
	title?: string;
}

export function parseWebloc(input: Uint8Array): WeblocData {
	if (input.length < 8) {
		throw new Error("Invalid .webloc file: file is too small.");
	}

	const isBinary =
		input[0] === 0x62 &&
		input[1] === 0x70 &&
		input[2] === 0x6c &&
		input[3] === 0x69 &&
		input[4] === 0x73 &&
		input[5] === 0x74 &&
		input[6] === 0x30 &&
		input[7] === 0x30; // "bplist00"

	if (isBinary) {
		return parseBinaryPlist(input);
	}

	// XML plist or plain text plist
	const text = new TextDecoder("utf-8", { fatal: false }).decode(input);
	return parseXmlPlist(text);
}

function parseXmlPlist(xml: string): WeblocData {
	// Look for <key>URL</key>\s*<string>(.*?)</string>
	const urlMatch = /<key>\s*URL\s*<\/key>\s*<string>([\s\S]*?)<\/string>/i.exec(
		xml,
	);
	if (urlMatch?.[1]) {
		const url = decodeXmlEntities(urlMatch[1].trim());
		const titleMatch =
			/<key>\s*(?:Title|name)\s*<\/key>\s*<string>([\s\S]*?)<\/string>/i.exec(
				xml,
			);
		const title = titleMatch?.[1]
			? decodeXmlEntities(titleMatch[1].trim())
			: undefined;
		return { url, title };
	}

	// Fallback: any <string>http...</string> tag
	const genericMatch = /<string>\s*(https?:\/\/[^\s<]+)\s*<\/string>/i.exec(
		xml,
	);
	if (genericMatch?.[1]) {
		return { url: decodeXmlEntities(genericMatch[1].trim()) };
	}

	// Raw URL pattern search in text
	const rawUrlMatch = /(https?:\/\/[^\s<"']+)/i.exec(xml);
	if (rawUrlMatch?.[1]) {
		return { url: rawUrlMatch[1].trim() };
	}

	throw new Error(
		"Failed to find URL in .webloc file: missing <key>URL</key> tag.",
	);
}

function decodeXmlEntities(str: string): string {
	return str
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}

function parseBinaryPlist(bytes: Uint8Array): WeblocData {
	if (bytes.length >= 32) {
		const text = new TextDecoder("latin1").decode(bytes);
		const urlMatch = /(https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;%=]+)/.exec(
			text,
		);
		if (urlMatch?.[1]) {
			let cleanUrl = urlMatch[1];
			while (
				cleanUrl.length > 0 &&
				(cleanUrl.charCodeAt(cleanUrl.length - 1) < 32 ||
					cleanUrl.charCodeAt(cleanUrl.length - 1) > 126)
			) {
				cleanUrl = cleanUrl.slice(0, -1);
			}
			return { url: cleanUrl };
		}
	}

	throw new Error("Unable to extract valid web URL from binary .webloc plist.");
}

export type WeblocOutputFormat = "url" | "html" | "markdown" | "txt";

export function formatWebloc(
	data: WeblocData,
	format: WeblocOutputFormat = "url",
): string {
	const url = data.url;
	const title = data.title || url;

	switch (format) {
		case "url":
			return `[InternetShortcut]\r\nURL=${url}\r\n`;

		case "html":
			return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta http-equiv="refresh" content="0; url=${escapeHtml(url)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>...</p>
</body>
</html>
`;

		case "markdown":
			return `[${title}](${url})\n`;

		case "txt":
			return `${url}\n`;
	}
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function convertWebloc(
	input: ArrayBuffer,
	format: WeblocOutputFormat = "url",
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing .webloc file...");
	const data = parseWebloc(new Uint8Array(input));

	onProgress?.(0.7, `Generating ${format.toUpperCase()} shortcut...`);
	const text = formatWebloc(data, format);

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(text).buffer as ArrayBuffer;
}
