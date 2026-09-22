interface TelegramTextPart {
	type?: string;
	text?: string;
	href?: string;
}

type TelegramText = string | Array<string | TelegramTextPart>;

interface TelegramMessage {
	id?: number;
	type?: string;
	date?: string;
	date_unixtime?: string;
	from?: string;
	from_id?: string;
	actor?: string;
	action?: string;
	text?: TelegramText;
	media_type?: string;
	photo?: string;
	file?: string;
	sticker_emoji?: string;
	mime_type?: string;
	width?: number;
	height?: number;
	duration_seconds?: number;
}

interface TelegramChat {
	name?: string;
	type?: string;
	id?: number | string;
	messages?: TelegramMessage[];
}

export interface TelegramSection {
	chatName: string;
	chatType: string;
	participants: string[];
	messageCount: number;
	blocks: Array<{
		date: string;
		time: string;
		sender: string;
		text: string;
		system: boolean;
		media: string | null;
	}>;
}

/**
 * Converts a Telegram Desktop JSON export into archival Markdown.
 *
 * Accepts both shapes Telegram produces: a single-chat file
 * (`{name, type, id, messages}`) and a full `result.json`
 * (`{chats: {list: [...]}}`), which becomes one dated section per chat.
 * Message `text` arrives as a plain string or a rich-text array
 * (`{type: text_link|bold|…}` parts) — links survive as `[text](href)`,
 * everything else flattens to text. Service events (joins, pins, calls)
 * render as italic system lines; photos/voice/video/stickers become
 * `[Photo 1920x1080]`-style markers so nothing vanishes silently.
 */
export function parseTelegramChat(fileBytes: Uint8Array): TelegramSection[] {
	const raw = new TextDecoder("utf-8").decode(fileBytes);
	let doc: unknown;
	try {
		doc = JSON.parse(raw) as unknown;
	} catch {
		throw new Error("Invalid Telegram export: file is not valid JSON.");
	}

	const chats = extractChats(doc);
	if (chats.length === 0) {
		throw new Error(
			"No chats found: expected a Telegram Desktop export with a `messages` array (single chat) or `chats.list` (full result.json).",
		);
	}

	return chats.map((chat) => {
		const blocks: TelegramSection["blocks"] = [];
		const participants: string[] = [];
		let messageCount = 0;

		for (const m of chat.messages ?? []) {
			if (m.type === "service") {
				blocks.push({
					date: dayOf(m.date),
					time: timeOf(m.date),
					sender: "",
					text: describeService(m),
					system: true,
					media: null,
				});
				continue;
			}
			if (m.type !== undefined && m.type !== "message") continue;
			const sender = m.from ?? m.actor ?? "Unknown";
			const { text, media } = flattenText(m);
			if (!text && !media) continue;
			messageCount++;
			if (!participants.includes(sender)) participants.push(sender);
			blocks.push({
				date: dayOf(m.date),
				time: timeOf(m.date),
				sender,
				text,
				system: false,
				media,
			});
		}

		return {
			chatName: chat.name ?? "Telegram chat",
			chatType: chat.type ?? "chat",
			participants,
			messageCount,
			blocks,
		};
	});
}

function extractChats(doc: unknown): TelegramChat[] {
	if (typeof doc !== "object" || doc === null) return [];
	const root = doc as Record<string, unknown>;
	if (Array.isArray(root.messages)) return [root as unknown as TelegramChat];
	const chats = root.chats as Record<string, unknown> | undefined;
	const list = chats?.list;
	if (Array.isArray(list)) return list as TelegramChat[];
	return [];
}

function flattenText(m: TelegramMessage): {
	text: string;
	media: string | null;
} {
	let text = "";
	const t = m.text;
	if (typeof t === "string") {
		text = t;
	} else if (Array.isArray(t)) {
		text = t
			.map((part) => {
				if (typeof part === "string") return part;
				if (typeof part === "object" && part !== null) {
					if (part.type === "text_link" && part.href) {
						return `[${part.text ?? ""}](${part.href})`;
					}
					return part.text ?? "";
				}
				return "";
			})
			.join("");
	}
	return { text: text.trim(), media: describeMedia(m) };
}

function describeMedia(m: TelegramMessage): string | null {
	const bits: string[] = [];
	const dims =
		m.width !== undefined && m.height !== undefined
			? ` ${m.width}x${m.height}`
			: "";
	const dur = m.duration_seconds !== undefined ? ` ${m.duration_seconds}s` : "";
	if (m.media_type === "sticker") {
		bits.push(`[Sticker${m.sticker_emoji ? ` ${m.sticker_emoji}` : ""}]`);
	} else if (m.media_type === "voice_message") {
		bits.push(`[Voice message${dur}]`);
	} else if (m.media_type === "video_message") {
		bits.push(`[Video message${dur}]`);
	} else if (m.media_type === "animation") {
		bits.push(`[GIF${dims}]`);
	} else if (m.media_type === "video_file") {
		bits.push(`[Video${dur}${dims}]`);
	} else if (m.media_type === "audio_file") {
		bits.push(`[Audio${dur}]`);
	} else if (m.media_type) {
		bits.push(`[${humanise(m.media_type)}]`);
	}
	if (m.photo && !m.media_type) bits.push(`[Photo${dims}]`);
	if (m.file) bits.push(`[File: ${m.file}]`);
	return bits.length > 0 ? bits.join(" ") : null;
}

function describeService(m: TelegramMessage): string {
	const actor = m.actor ?? m.from ?? "Someone";
	const action = m.action ?? "event";
	const detail = flattenText(m).text;
	const pretty: Record<string, string> = {
		phone_call: "had a call",
		pin_message: "pinned a message",
		join_group_by_link: "joined via invite link",
	};
	const verb = pretty[action] ?? humanise(action);
	return `${actor} — ${verb}${detail ? `: ${detail}` : ""}`;
}

function humanise(s: string): string {
	return s.replace(/_/g, " ");
}

function dayOf(iso: string | undefined): string {
	if (!iso) return "";
	return iso.slice(0, 10);
}

function timeOf(iso: string | undefined): string {
	if (!iso) return "";
	return iso.slice(11, 19);
}

function escapeMd(s: string): string {
	return s.replace(/\\/g, "\\\\");
}

export function renderTelegramMarkdown(sections: TelegramSection[]): string {
	const out: string[] = [];
	for (const sec of sections) {
		out.push(`# ${escapeMd(sec.chatName)}`);
		out.push("");
		out.push(
			`_${sec.messageCount} messages · ${sec.participants.length} participants · ${escapeMd(sec.chatType)}_`,
		);
		out.push("");
		if (sec.participants.length > 0) {
			out.push("## Participants");
			out.push("");
			for (const p of sec.participants) out.push(`- ${escapeMd(p)}`);
			out.push("");
		}
		let currentDate = "";
		for (const b of sec.blocks) {
			if (b.date && b.date !== currentDate) {
				currentDate = b.date;
				out.push(`## ${currentDate}`);
				out.push("");
			}
			if (b.system) {
				out.push(`*${escapeMd(b.text)}*`);
			} else {
				const head = b.time
					? `**${escapeMd(b.sender)}** · ${b.time}`
					: `**${escapeMd(b.sender)}**`;
				out.push(head);
				out.push("");
				if (b.text) out.push(escapeMd(b.text));
				if (b.media) {
					if (b.text) out.push("");
					out.push(`*${escapeMd(b.media)}*`);
				}
			}
			out.push("");
		}
	}
	out.push(
		"_Converted locally by convrtr from a Telegram Desktop JSON export._",
	);
	out.push("");
	return out.join("\n");
}

export function convertTelegramToMarkdown(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Reading Telegram export...");
	const sections = parseTelegramChat(new Uint8Array(input));
	onProgress?.(0.6, "Formatting messages...");
	const md = renderTelegramMarkdown(sections);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(md).buffer as ArrayBuffer;
}
