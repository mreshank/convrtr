interface DiscordAuthor {
	id?: string;
	name?: string;
	nickname?: string;
	username?: string;
}

interface DiscordAttachment {
	url?: string;
	fileName?: string;
	fileSizeBytes?: number;
}

interface DiscordReaction {
	count?: number;
	emoji?: { name?: string };
}

interface DiscordEmbed {
	title?: string;
	description?: string;
	url?: string;
}

interface DiscordMessage {
	id?: string;
	timestamp?: string;
	timestampEdited?: string | null;
	content?: string;
	author?: DiscordAuthor;
	attachments?: DiscordAttachment[];
	embeds?: DiscordEmbed[];
	reactions?: DiscordReaction[];
}

export interface DiscordSection {
	serverName: string;
	channelName: string;
	participants: string[];
	messageCount: number;
	blocks: Array<{
		date: string;
		time: string;
		sender: string;
		text: string;
		attachments: string[];
		reactions: string | null;
		edited: boolean;
	}>;
}

/**
 * Converts a DiscordChatExporter (Tyrrrz) JSON export into archival Markdown.
 *
 * Discord's own privacy-portal dump is raw and unreadable; the community
 * standard is Tyrrrz's exporter (`{guild, channel, messages}` with typed
 * attachments, embeds and reactions). This renders that structure as dated
 * Markdown with an attachment manifest and reaction summaries — the readable
 * archive moderators, communities and legal requests actually need.
 * Tolerates bare `{messages}` and bare-array shapes too.
 */
export function parseDiscordChat(fileBytes: Uint8Array): DiscordSection[] {
	const raw = new TextDecoder("utf-8").decode(fileBytes);
	let doc: unknown;
	try {
		doc = JSON.parse(raw) as unknown;
	} catch {
		throw new Error("Invalid Discord export: file is not valid JSON.");
	}

	let messages: DiscordMessage[] | null = null;
	let serverName = "Discord";
	let channelName = "channel";
	if (Array.isArray(doc)) {
		messages = doc as DiscordMessage[];
	} else if (typeof doc === "object" && doc !== null) {
		const root = doc as Record<string, unknown>;
		if (Array.isArray(root.messages))
			messages = root.messages as DiscordMessage[];
		const guild = root.guild as Record<string, unknown> | undefined;
		const channel = root.channel as Record<string, unknown> | undefined;
		if (typeof guild?.name === "string") serverName = guild.name;
		if (typeof channel?.name === "string") channelName = channel.name;
	}

	if (!messages) {
		throw new Error(
			"No messages found: expected a DiscordChatExporter JSON export with a `messages` array.",
		);
	}

	const blocks: DiscordSection["blocks"] = [];
	const participants: string[] = [];
	for (const m of messages) {
		const sender =
			m.author?.nickname ?? m.author?.name ?? m.author?.username ?? "Unknown";
		if (!participants.includes(sender)) participants.push(sender);
		const attachments = (m.attachments ?? [])
			.map((a) => a.fileName ?? a.url ?? "")
			.filter(Boolean);
		for (const e of m.embeds ?? []) {
			if (e.title || e.description) {
				attachments.push(
					`[Embed: ${e.title ?? e.url ?? "link"}${e.description ? ` — ${e.description.slice(0, 120)}` : ""}]`,
				);
			} else if (e.url) {
				attachments.push(`[Embed: ${e.url}]`);
			}
		}
		const reactions = (m.reactions ?? [])
			.map((r) => `${r.emoji?.name ?? "?"} x${r.count ?? 1}`)
			.join(", ");
		blocks.push({
			date: (m.timestamp ?? "").slice(0, 10),
			time: (m.timestamp ?? "").slice(11, 19),
			sender,
			text: (m.content ?? "").trim(),
			attachments,
			reactions: reactions || null,
			edited: !!m.timestampEdited,
		});
	}

	return [
		{
			serverName,
			channelName,
			participants,
			messageCount: blocks.length,
			blocks,
		},
	];
}

function escapeMd(s: string): string {
	return s.replace(/\\/g, "\\\\");
}

export function renderDiscordMarkdown(sections: DiscordSection[]): string {
	const out: string[] = [];
	for (const sec of sections) {
		out.push(`# ${escapeMd(sec.channelName)}`);
		out.push("");
		out.push(
			`_${sec.messageCount} messages · ${sec.participants.length} participants · ${escapeMd(sec.serverName)}_`,
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
			const head = b.time
				? `**${escapeMd(b.sender)}** · ${b.time}${b.edited ? " _(edited)_" : ""}`
				: `**${escapeMd(b.sender)}**`;
			out.push(head);
			out.push("");
			if (b.text) {
				out.push(escapeMd(b.text));
				out.push("");
			}
			for (const a of b.attachments) out.push(`*${escapeMd(a)}*`);
			if (b.attachments.length > 0) out.push("");
			if (b.reactions) {
				out.push(`_Reactions: ${escapeMd(b.reactions)}_`);
				out.push("");
			}
		}
	}
	out.push(
		"_Converted locally by convrtr from a DiscordChatExporter JSON export. Attachment files live on Discord's CDN — links are preserved verbatim._",
	);
	out.push("");
	return out.join("\n");
}

export function convertDiscordToMarkdown(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Reading Discord export...");
	const sections = parseDiscordChat(new Uint8Array(input));
	onProgress?.(0.6, "Formatting messages...");
	const md = renderDiscordMarkdown(sections);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(md).buffer as ArrayBuffer;
}
