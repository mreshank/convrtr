import * as fflate from "fflate";

export interface WhatsappMessage {
	date: string;
	time: string;
	sender: string;
	text: string;
	system: boolean;
}

export interface WhatsappChatSummary {
	title: string;
	participants: string[];
	messageCount: number;
	mediaFiles: string[];
	messages: WhatsappMessage[];
}

/**
 * Parses a WhatsApp chat export (.txt, or .zip with media) into structured data.
 *
 * WhatsApp exports are timestamped plain-text lines in two locale families:
 * iOS `[M/D/YY, H:MM:SS] Sender: text` and Android `M/D/YY, H:MM - Sender: text`
 * (date order, separators and 12/24h clock vary by phone locale — the patterns
 * below accept all common variants). Lines without a timestamp continue the
 * previous message; lines with no sender are system notices. Media exports
 * arrive as a ZIP whose .txt chat file references sibling attachments.
 */
export function parseWhatsapp(fileBytes: Uint8Array): WhatsappChatSummary {
	let text: string;
	let mediaFiles: string[] = [];
	let title = "WhatsApp chat";

	if (
		fileBytes.length >= 4 &&
		fileBytes[0] === 0x50 &&
		fileBytes[1] === 0x4b &&
		fileBytes[2] === 0x03 &&
		fileBytes[3] === 0x04
	) {
		let unzipped: Record<string, Uint8Array>;
		try {
			unzipped = fflate.unzipSync(fileBytes);
		} catch (err) {
			throw new Error(
				`Failed to unpack WhatsApp export ZIP: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
		const txtPaths = Object.keys(unzipped).filter((p) =>
			p.toLowerCase().endsWith(".txt"),
		);
		if (txtPaths.length === 0) {
			throw new Error(
				"No chat text file (.txt) found inside this WhatsApp export ZIP.",
			);
		}
		txtPaths.sort(
			(a, b) => (unzipped[b]?.length ?? 0) - (unzipped[a]?.length ?? 0),
		);
		const chatPath = txtPaths[0] ?? "";
		const chatBytes = chatPath ? unzipped[chatPath] : undefined;
		if (!chatBytes) throw new Error("WhatsApp chat text is unreadable.");
		text = new TextDecoder("utf-8").decode(chatBytes);
		title =
			chatPath
				.split("/")
				.pop()
				?.replace(/\.txt$/i, "") ?? title;
		mediaFiles = Object.keys(unzipped).filter(
			(p) =>
				p !== chatPath && !p.endsWith("/") && !p.toLowerCase().endsWith(".txt"),
		);
	} else {
		text = new TextDecoder("utf-8").decode(fileBytes);
	}

	const messages: WhatsappMessage[] = [];
	const participants: string[] = [];
	let sawTimestamped = false;

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.replace(/^\uFEFF/, "");
		if (!line.trim() && messages.length === 0) continue;
		const parsed = parseLine(line);
		if (parsed) {
			sawTimestamped = true;
			messages.push(parsed);
			if (!parsed.system && !participants.includes(parsed.sender)) {
				participants.push(parsed.sender);
			}
		} else if (messages.length > 0 && line.trim()) {
			// Continuation of the previous message (multi-line text).
			const last = messages[messages.length - 1];
			if (last) last.text += `\n${line}`;
		}
		// Dateless preamble lines are dropped; files with no timestamped
		// line at all are rejected below.
	}

	if (!sawTimestamped) {
		throw new Error(
			"No chat messages recognised. Expected a WhatsApp export (.txt) with timestamped lines like `[1/2/24, 10:00:00] Ana: hello`.",
		);
	}

	return {
		title,
		participants,
		messageCount: messages.filter((m) => !m.system).length,
		mediaFiles,
		messages,
	};
}

const IOS_RE =
	/^\[(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]\s?(.*)$/;
const ANDROID_RE =
	/^(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\s+-\s?(.*)$/;

function parseLine(line: string): WhatsappMessage | null {
	let date = "";
	let time = "";
	let rest: string | null = null;

	const ios = IOS_RE.exec(line);
	if (ios) {
		date = ios[1] ?? "";
		time = ios[2] ?? "";
		rest = ios[3] ?? "";
	} else {
		const android = ANDROID_RE.exec(line);
		if (android) {
			date = android[1] ?? "";
			time = android[2] ?? "";
			rest = android[3] ?? "";
		}
	}
	if (rest === null) return null;

	// Split `Sender: message` on the first colon-space; no colon = system line.
	const sep = rest.indexOf(": ");
	if (sep === -1) {
		return { date, time, sender: "", text: rest, system: true };
	}
	return {
		date,
		time,
		sender: rest.slice(0, sep).trim(),
		text: rest.slice(sep + 2),
		system: false,
	};
}

function escapeMd(s: string): string {
	return s.replace(/\\/g, "\\\\");
}

export function renderWhatsappMarkdown(chat: WhatsappChatSummary): string {
	const out: string[] = [];
	out.push(`# ${escapeMd(chat.title)}`);
	out.push("");
	out.push(
		`_${chat.messageCount} messages · ${chat.participants.length} participants_`,
	);
	out.push("");
	if (chat.participants.length > 0) {
		out.push("## Participants");
		out.push("");
		for (const p of chat.participants) out.push(`- ${escapeMd(p)}`);
		out.push("");
	}
	let currentDate = "";
	for (const m of chat.messages) {
		if (m.date && m.date !== currentDate) {
			currentDate = m.date;
			out.push(`## ${currentDate}`);
			out.push("");
		}
		if (m.system) {
			out.push(`*${escapeMd(m.text)}*`);
		} else {
			const head = m.time
				? `**${escapeMd(m.sender)}** · ${m.time}`
				: `**${escapeMd(m.sender)}**`;
			out.push(head);
			out.push("");
			out.push(escapeMd(m.text));
		}
		out.push("");
	}
	if (chat.mediaFiles.length > 0) {
		out.push("## Attached media files");
		out.push("");
		out.push(
			"_Listed from the export ZIP — match these filenames against your unzipped export folder._",
		);
		out.push("");
		for (const f of chat.mediaFiles) out.push(`- \`${f}\``);
		out.push("");
	}
	out.push(
		"_Converted locally by convrtr. Note: iPhone exports silently truncate around ~40,000 messages — for very long chats, export Without Media._",
	);
	out.push("");
	return out.join("\n");
}

export function convertWhatsappToMarkdown(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Reading chat export...");
	const chat = parseWhatsapp(new Uint8Array(input));
	onProgress?.(0.6, "Formatting messages...");
	const md = renderWhatsappMarkdown(chat);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(md).buffer as ArrayBuffer;
}
