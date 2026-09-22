import { describe, expect, it } from "vitest";
import { telegramToMarkdownEngine } from "../index";
import { convertTelegramToMarkdown, parseTelegramChat } from "../parser";

const SINGLE_CHAT = {
	name: "Family",
	type: "private_group",
	id: 123,
	messages: [
		{
			id: 1,
			type: "message",
			date: "2024-06-07T10:00:00",
			date_unixtime: "1717754400",
			from: "Ana",
			from_id: "user1",
			text: "Dinner at 7?",
		},
		{
			id: 2,
			type: "message",
			date: "2024-06-07T10:01:00",
			date_unixtime: "1717754460",
			from: "Ben",
			from_id: "user2",
			text: [
				"See ",
				{
					type: "text_link",
					text: "the menu",
					href: "https://example.com/menu",
				},
				" first",
			],
		},
		{
			id: 3,
			type: "message",
			date: "2024-06-07T10:02:00",
			date_unixtime: "1717754520",
			from: "Ana",
			from_id: "user1",
			photo: "photos/photo_1.jpg",
			width: 1920,
			height: 1080,
			text: "",
		},
		{
			id: 4,
			type: "service",
			date: "2024-06-07T10:03:00",
			date_unixtime: "1717754580",
			actor: "Ben",
			action: "pin_message",
			text: "",
		},
	],
};

const FULL_EXPORT = {
	chats: {
		list: [
			{ ...SINGLE_CHAT },
			{
				name: "Work",
				type: "personal_chat",
				id: 456,
				messages: [
					{
						id: 9,
						type: "message",
						date: "2024-06-08T09:00:00",
						from: "Cara",
						text: "Standup moved",
						media_type: "voice_message",
						duration_seconds: 12,
					},
				],
			},
		],
	},
};

function bytes(v: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(v));
}

describe("Telegram export Parser & Engine", () => {
	it("parses a single chat: links, photos, service events", () => {
		const [sec] = parseTelegramChat(bytes(SINGLE_CHAT));
		expect(sec?.chatName).toBe("Family");
		expect(sec?.participants).toEqual(["Ana", "Ben"]);
		expect(sec?.messageCount).toBe(3);
		expect(sec?.blocks[1]?.text).toBe(
			"See [the menu](https://example.com/menu) first",
		);
		expect(sec?.blocks[2]?.media).toBe("[Photo 1920x1080]");
		expect(sec?.blocks[3]?.system).toBe(true);
		expect(sec?.blocks[3]?.text).toContain("pinned a message");
	});

	it("splits a full export into per-chat sections", () => {
		const sections = parseTelegramChat(bytes(FULL_EXPORT));
		expect(sections).toHaveLength(2);
		expect(sections[1]?.chatName).toBe("Work");
		expect(sections[1]?.blocks[0]?.media).toBe("[Voice message 12s]");
	});

	it("renders Markdown end-to-end through the engine", async () => {
		expect(await telegramToMarkdownEngine.probe()).toBe(true);
		const out = await convertTelegramToMarkdown(
			bytes(SINGLE_CHAT).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const md = new TextDecoder().decode(out);
		expect(md).toContain("# Family");
		expect(md).toContain("## 2024-06-07");
		expect(md).toContain("[the menu](https://example.com/menu)");
	});

	it("throws on non-JSON and chatless JSON", () => {
		expect(() => parseTelegramChat(new TextEncoder().encode("nope"))).toThrow(
			"not valid JSON",
		);
		expect(() => parseTelegramChat(bytes({ about: "nothing" }))).toThrow(
			"No chats found",
		);
	});
});
