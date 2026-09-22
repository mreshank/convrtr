import { zipSync } from "fflate";

export interface MboxSplitResult {
	messageCount: number;
	zipBytes: Uint8Array;
}

/**
 * Splits an mboxrd mailbox into individual RFC 5322 (.eml) messages.
 *
 * mboxrd separates messages with `^From <sender> <date>` lines and escapes
 * any literal body line starting with "From " as ">From ". Splitting is the
 * exact inverse: cut on unescaped From-lines, strip the separator, unescape
 * `>From` → `From`. Message bytes are otherwise preserved bit-exact (headers,
 * MIME bodies, attachments), so every .eml imports cleanly into Thunderbird,
 * Apple Mail, Outlook or archival pipelines.
 */
export function splitMbox(fileBytes: Uint8Array): MboxSplitResult {
	const text = new TextDecoder("utf-8").decode(fileBytes);
	const lines = text.split("\n");

	const starts: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (/^From \S+.*\d{4}/.test(lines[i] ?? "")) starts.push(i);
	}

	if (starts.length === 0) {
		throw new Error(
			"No mbox message separators found: expected `From sender date` lines (mboxrd format from Thunderbird, Apple Mail or Gmail Takeout).",
		);
	}

	const entries: Record<string, Uint8Array> = {};
	for (let k = 0; k < starts.length; k++) {
		const from = (starts[k] ?? 0) + 1; // skip the separator itself
		const to =
			k + 1 < starts.length ? (starts[k + 1] ?? lines.length) : lines.length;
		const body = lines
			.slice(from, to)
			.map((l) => (l.startsWith(">From ") ? l.slice(1) : l))
			.join("\n")
			.replace(/\n+$/, "");
		if (!body.trim()) continue;
		const subject = extractSubject(body);
		const name = `${String(entries ? Object.keys(entries).length + 1 : 1).padStart(3, "0")}${subject ? `-${slugify(subject)}` : ""}.eml`;
		entries[name] = new TextEncoder().encode(`${body}\n`);
	}

	const names = Object.keys(entries);
	if (names.length === 0) {
		throw new Error("Mailbox holds no readable messages after splitting.");
	}
	return { messageCount: names.length, zipBytes: zipSync(entries) };
}

function extractSubject(message: string): string {
	const headEnd = message.search(/\n\n/);
	const head = headEnd === -1 ? message : message.slice(0, headEnd);
	// Unfold continuation lines, find Subject (case-insensitive).
	const unfolded = head.replace(/\n[ \t]+/g, " ");
	const m = /^subject:(.*)$/im.exec(unfolded);
	return (m?.[1] ?? "").trim().slice(0, 60);
}

function slugify(s: string): string {
	const slug = s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return slug || "message";
}

export function convertMboxToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Splitting mailbox on From-lines...");
	const result = splitMbox(new Uint8Array(input));
	onProgress?.(0.7, `Packing ${result.messageCount} messages...`);
	onProgress?.(1.0, "Complete");
	const buf = result.zipBytes.buffer.slice(
		result.zipBytes.byteOffset,
		result.zipBytes.byteOffset + result.zipBytes.byteLength,
	);
	return buf as ArrayBuffer;
}
