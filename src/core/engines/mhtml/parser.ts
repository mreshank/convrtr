/**
 * MHTML (.mhtml, .mht) Web Archive parser and standalone HTML inliner.
 * Unpacks MIME multipart web archives from Chrome/Edge and inlines all images/CSS into universal standalone HTML.
 */

export type MhtmlPart = {
	contentType: string;
	contentTransferEncoding: string;
	contentLocation: string;
	contentId: string;
	body: string;
	rawBytes: Uint8Array;
};

/**
 * Decodes quoted-printable string according to RFC 2045.
 */
function decodeQuotedPrintable(input: string): string {
	// Soft line breaks
	let s = input.replace(/=\r?\n/g, "");
	// Hex byte escape sequences
	s = s.replace(/=([A-Fa-f0-9]{2})/g, (_match, hex) => {
		const code = parseInt(hex, 16);
		return String.fromCharCode(code);
	});
	return s;
}

/**
 * Extracts boundary string from MHTML header.
 */
function extractBoundary(text: string): string | null {
	const match = text.match(/boundary="?([^"\r\n;]+)"?/i);
	return match?.[1] ? match[1].trim() : null;
}

/**
 * Parses MIME multipart headers and body from an MHTML document.
 */
export function parseMhtml(text: string): {
	htmlPart: MhtmlPart | null;
	assets: Map<string, { mime: string; dataUrl: string }>;
} {
	const boundary = extractBoundary(text);
	if (!boundary) {
		throw new Error(
			"parseMhtml: No valid multipart boundary found in MHTML header",
		);
	}

	const parts = text.split(`--${boundary}`);
	let htmlPart: MhtmlPart | null = null;
	const assets = new Map<string, { mime: string; dataUrl: string }>();

	for (const part of parts) {
		if (!part || part.trim() === "--") continue;

		const splitIndex =
			part.indexOf("\n\n") !== -1
				? part.indexOf("\n\n")
				: part.indexOf("\r\n\r\n");
		if (splitIndex === -1) continue;

		const headerSection = part.slice(0, splitIndex);
		const bodySection = part.slice(splitIndex).trim();

		let contentType = "application/octet-stream";
		let encoding = "7bit";
		let location = "";
		let cid = "";

		const headerLines = headerSection.split(/\r?\n/);
		for (const line of headerLines) {
			const lower = line.toLowerCase();
			if (lower.startsWith("content-type:")) {
				const match = line.slice(13).match(/([^;\r\n]+)/);
				if (match?.[1]) contentType = match[1].trim();
			} else if (lower.startsWith("content-transfer-encoding:")) {
				encoding = line.slice(26).trim().toLowerCase();
			} else if (lower.startsWith("content-location:")) {
				location = line.slice(17).trim();
			} else if (lower.startsWith("content-id:")) {
				cid = line.slice(11).replace(/[<>]/g, "").trim();
			}
		}

		let decodedBody = bodySection;
		let base64Payload = "";

		if (encoding === "quoted-printable") {
			decodedBody = decodeQuotedPrintable(bodySection);
		} else if (encoding === "base64") {
			// Strip all internal whitespace/newlines from base64 string
			base64Payload = bodySection.replace(/\s+/g, "");
		}

		if (contentType.toLowerCase().includes("text/html") && !htmlPart) {
			htmlPart = {
				contentType,
				contentTransferEncoding: encoding,
				contentLocation: location,
				contentId: cid,
				body: decodedBody,
				rawBytes: new Uint8Array(0),
			};
		} else if (base64Payload) {
			const dataUrl = `data:${contentType};base64,${base64Payload}`;
			if (location) assets.set(location, { mime: contentType, dataUrl });
			if (cid) {
				assets.set(`cid:${cid}`, { mime: contentType, dataUrl });
				assets.set(cid, { mime: contentType, dataUrl });
			}
		}
	}

	return { htmlPart, assets };
}

/**
 * Converts MHTML web archive into a self-contained, standalone single-file HTML document.
 */
export function convertMhtmlToHtml(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "DECODE_TEXT");
	const text = new TextDecoder("utf-8", { fatal: false }).decode(input);

	if (
		!text.includes("MIME-Version:") &&
		!text.includes("multipart/related") &&
		!text.includes("Content-Type:")
	) {
		throw new Error("convertMhtml: Input is not a valid MHTML web archive");
	}

	onProgress?.(0.3, "PARSE_PARTS");
	const { htmlPart, assets } = parseMhtml(text);

	if (!htmlPart?.body) {
		throw new Error(
			"convertMhtml: No root HTML document found inside MHTML archive",
		);
	}

	onProgress?.(0.6, "INLINE_ASSETS");
	let inlinedHtml = htmlPart.body;

	// Replace all linked assets and cids with data URLs
	for (const [key, asset] of assets.entries()) {
		if (!key) continue;
		// Escape special regex chars
		const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`(["'\\(=])\\s*${escapedKey}\\s*(["'\\)])`, "g");
		inlinedHtml = inlinedHtml.replace(regex, `$1${asset.dataUrl}$2`);
	}

	onProgress?.(1.0, "DONE");
	const encoded = new TextEncoder().encode(inlinedHtml);
	return encoded.buffer as ArrayBuffer;
}
