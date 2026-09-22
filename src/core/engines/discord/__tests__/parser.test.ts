import { describe, expect, it } from "vitest";
import { discordToMarkdownEngine } from "../index";
import { convertDiscordToMarkdown, parseDiscordChat } from "../parser";

const EXPORT = {
	guild: { id: "1", name: "Study Group" },
	channel: { id: "2", name: "general", topic: null },
	dateRange: null,
	messages: [
		{
			id: "100",
			type: "Default",
			timestamp: "2024-06-07T10:00:00.000+00:00",
			timestampEdited: null,
			callEndedTimestamp: null,
			isPinned: false,
			content: "Welcome everyone!",
			author: { id: "u1", name: "Mod", nickname: "Moderator" },
			attachments: [],
			embeds: [],
			stickerItems: [],
			reactions: [{ emoji: { id: null, name: "wave" }, count: 3 }],
			mentions: [],
		},
		{
			id: "101",
			type: "Default",
			timestamp: "2024-06-07T10:05:00.000+00:00",
			timestampEdited: "2024-06-07T10:06:00.000+00:00",
			callEndedTimestamp: null,
			isPinned: false,
			content: "Here are the notes",
			author: { id: "u2", name: "ana" },
			attachments: [
				{
					id: "a1",
					url: "https://cdn.discord/notes.pdf",
					fileName: "notes.pdf",
					fileSizeBytes: 42,
				},
			],
			embeds: [
				{ title: "Link preview", description: "desc", url: "https://x.test" },
			],
			stickerItems: [],
			reactions: [],
			mentions: [],
		},
	],
};

function bytes(v: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(v));
}

describe("Discord export Parser & Engine", () => {
	it("reads server, channel, nicknames, attachments, embeds, reactions", () => {
		const [sec] = parseDiscordChat(bytes(EXPORT));
		expect(sec?.serverName).toBe("Study Group");
		expect(sec?.channelName).toBe("general");
		expect(sec?.participants).toEqual(["Moderator", "ana"]);
		expect(sec?.messageCount).toBe(2);
		expect(sec?.blocks[0]?.reactions).toBe("wave x3");
		expect(sec?.blocks[1]?.edited).toBe(true);
		expect(sec?.blocks[1]?.attachments).toContain("notes.pdf");
		expect(sec?.blocks[1]?.attachments[1]).toContain("Link preview");
	});

	it("tolerates a bare messages array", () => {
		const [sec] = parseDiscordChat(bytes(EXPORT.messages));
		expect(sec?.messageCount).toBe(2);
	});

	it("renders Markdown end-to-end through the engine", async () => {
		expect(await discordToMarkdownEngine.probe()).toBe(true);
		const out = await convertDiscordToMarkdown(
			bytes(EXPORT).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const md = new TextDecoder().decode(out);
		expect(md).toContain("# general");
		expect(md).toContain("## 2024-06-07");
		expect(md).toContain("_(edited)_");
	});

	it("throws on non-JSON and messageless JSON", () => {
		expect(() => parseDiscordChat(new TextEncoder().encode("{bad"))).toThrow(
			"not valid JSON",
		);
		expect(() => parseDiscordChat(bytes({ hello: 1 }))).toThrow(
			"No messages found",
		);
	});
});
