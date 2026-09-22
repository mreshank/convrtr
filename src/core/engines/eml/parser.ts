export interface EmlText {
	from: string;
	to: string;
	date: string;
	subject: string;
	body: string;
	attachments: string[];
}

function decodeWords(s: string): string {
	// RFC 2047 encoded-words: =?charset?B|Q?text?=
	return s.replace(
		/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
		(_m, charset: string, enc: string, text: string) => {
			try {
				if (enc.toUpperCase() === "B") {
					const bin = Uint8Array.from(atob(text.replace(/\s+/g, "")), (c) =>
						c.charCodeAt(0),
					);
					return new TextDecoder(charset).decode(bin);
				}
				const bytes: number[] = [];
				for (let i = 0; i < text.length; i++) {
					const ch = text[i] ?? "";
					if (ch === "_") bytes.push(32);
					else if (ch === "=" && i + 2 < text.length) {
						bytes.push(Number.parseInt(text.slice(i + 1, i + 3), 16));
						i += 2;
					} else {
						bytes.push(ch.charCodeAt(0));
					}
				}
				return new TextDecoder(charset).decode(new Uint8Array(bytes));
			} catch {
				return text;
			}
		},
	);
}

function decodeBody(
	bytes: Uint8Array,
	encoding: string,
	charset: string,
): string {
	let raw = bytes;
	const enc = encoding.trim().toLowerCase();
	if (enc === "base64") {
		try {
			const clean = new TextDecoder("ascii").decode(bytes).replace(/\s+/g, "");
			raw = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
		} catch {
			// fall through with raw bytes
		}
	} else if (enc === "quoted-printable") {
		const out: number[] = [];
		for (let i = 0; i < bytes.length; i++) {
			const b = bytes[i] ?? 0;
			if (b === 0x3d) {
				// Soft break (=CRLF) vs hex pair.
				const n1 = bytes[i + 1];
				const n2 = bytes[i + 2];
				if (n1 === 0x0d && n2 === 0x0a) {
					i += 2;
					continue;
				}
				if (n1 === 0x0a) {
					i += 1;
					continue;
				}
				const hex = String.fromCharCode(n1 ?? 0, n2 ?? 0);
				const v = Number.parseInt(hex, 16);
				if (Number.isFinite(v)) {
					out.push(v);
					i += 2;
					continue;
				}
			}
			out.push(b);
		}
		raw = new Uint8Array(out);
	}
	try {
		return new TextDecoder(charset).decode(raw);
	} catch {
		return new TextDecoder("windows-1252").decode(raw);
	}
}

function stripHtml(html: string): string {
	return html
		.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function splitHeaders(block: Uint8Array): {
	headers: Map<string, string>;
	rest: Uint8Array;
} {
	const text = new TextDecoder("ascii").decode(block);
	const match = /\r?\n\r?\n/.exec(text);
	const at = match ? (match.index ?? 0) : block.length;
	const headers = new Map<string, string>();
	let current: string | null = null;
	for (const line of text.slice(0, at).split(/\r?\n/)) {
		if ((line.startsWith(" ") || line.startsWith("\t")) && current) {
			headers.set(current, `${headers.get(current) ?? ""} ${line.trim()}`);
		} else {
			const idx = line.indexOf(":");
			if (idx > 0) {
				current = line.slice(0, idx).toLowerCase();
				headers.set(current, decodeWords(line.slice(idx + 1).trim()));
			}
		}
	}
	const skip = match ? match[0].length : 0;
	return { headers, rest: block.subarray(at + (match ? skip : 0)) };
}

function contentType(headers: Map<string, string>): {
	mime: string;
	params: Map<string, string>;
} {
	const raw = headers.get("content-type") ?? "text/plain";
	const [mime, ...rest] = raw.split(";");
	const params = new Map<string, string>();
	for (const part of rest) {
		const eq = part.indexOf("=");
		if (eq > 0) {
			params.set(
				part.slice(0, eq).trim().toLowerCase(),
				part
					.slice(eq + 1)
					.trim()
					.replace(/^"|"$/g, ""),
			);
		}
	}
	return { mime: (mime ?? "").trim().toLowerCase() || "text/plain", params };
}

function charsetOf(headers: Map<string, string>): string {
	const { params } = contentType(headers);
	const cs = (params.get("charset") ?? "utf-8")
		.toLowerCase()
		.replace(/_/g, "-");
	try {
		new TextDecoder(cs);
		return cs;
	} catch {
		return "windows-1252";
	}
}

/**
 * Extracts readable text from an RFC 822 message (`.eml`).
 *
 * Walks MIME multiparts (nested included), decodes quoted-printable/base64
 * bodies in their declared charsets, prefers text/plain but falls back to
 * HTML-stripped text/plain-from-html, and lists attachments by filename
 * instead of dumping binary. The Unix-thread answer ("just concatenate")
 * keeps every header and tag; this keeps the meaning.
 */
export function parseEml(fileBytes: Uint8Array): EmlText {
	const { headers, rest } = splitHeaders(fileBytes);
	const attachments: string[] = [];
	const texts: Array<{ flavor: string; text: string }> = [];

	const walk = (partHeaders: Map<string, string>, body: Uint8Array): void => {
		const ct = contentType(partHeaders);
		if (ct.mime.startsWith("multipart/")) {
			const boundary = ct.params.get("boundary") ?? "";
			if (!boundary) return;
			const text = new TextDecoder("ascii").decode(body);
			const chunks = text.split(`--${boundary}`);
			for (const chunk of chunks) {
				const trimmed = chunk.replace(/^\r?\n/, "").replace(/\r?\n--\s*$/, "");
				if (!trimmed.trim() || trimmed.trim() === "--") continue;
				const sub = splitHeaders(new TextEncoder().encode(trimmed));
				walk(sub.headers, sub.rest);
			}
			return;
		}
		const disp = (partHeaders.get("content-disposition") ?? "").toLowerCase();
		const dispName =
			/filename="([^"]+)"/i.exec(disp)?.[1]?.trim() ??
			/filename=([^;]+)/i.exec(disp)?.[1]?.trim() ??
			null;
		const filename = partHeadersFilename(partHeaders) ?? dispName;
		if (
			disp.startsWith("attachment") ||
			(filename && !ct.mime.startsWith("text/"))
		) {
			attachments.push(filename || ct.mime);
			return;
		}
		if (ct.mime === "text/plain" || ct.mime === "text/html") {
			const decoded = decodeBody(
				body,
				partHeaders.get("content-transfer-encoding") ?? "7bit",
				charsetOf(partHeaders),
			);
			texts.push({
				flavor: ct.mime,
				text: ct.mime === "text/html" ? stripHtml(decoded) : decoded.trim(),
			});
		} else if (!ct.mime.startsWith("multipart/")) {
			attachments.push(filename || ct.mime);
		}
	};

	walk(headers, rest);

	const plain = texts.find((t) => t.flavor === "text/plain" && t.text);
	const html = texts.find((t) => t.flavor === "text/html" && t.text);
	const body = plain?.text ?? html?.text ?? "";
	if (!body && attachments.length === 0) {
		throw new Error("No readable text or attachments found in this message.");
	}

	return {
		from: headers.get("from") ?? "",
		to: headers.get("to") ?? headers.get("cc") ?? "",
		date: headers.get("date") ?? "",
		subject: headers.get("subject") ?? "(no subject)",
		body,
		attachments,
	};
}

function partHeadersFilename(headers: Map<string, string>): string | null {
	const ct = headers.get("content-type") ?? "";
	const m = /name="([^"]+)"/i.exec(ct) ?? /name=([^;]+)/i.exec(ct);
	return m?.[1]?.trim() ?? null;
}

export function renderEmlText(eml: EmlText): string {
	const out: string[] = [];
	out.push(`Subject: ${eml.subject}`);
	if (eml.from) out.push(`From: ${eml.from}`);
	if (eml.to) out.push(`To: ${eml.to}`);
	if (eml.date) out.push(`Date: ${eml.date}`);
	out.push("");
	out.push(eml.body);
	if (eml.attachments.length > 0) {
		out.push("");
		out.push("Attachments:");
		for (const a of eml.attachments) out.push(`- ${a}`);
	}
	out.push("");
	return out.join("\n");
}

export function convertEmlToTxt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing MIME structure...");
	const eml = parseEml(new Uint8Array(input));
	onProgress?.(0.6, "Extracting text...");
	const txt = renderEmlText(eml);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(txt).buffer as ArrayBuffer;
}
