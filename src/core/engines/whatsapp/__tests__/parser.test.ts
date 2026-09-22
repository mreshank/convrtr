import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { whatsappToMarkdownEngine } from "../index";
import { convertWhatsappToMarkdown, parseWhatsapp } from "../parser";

const ANDROID_TXT = `12/05/23, 10:45 - Ana: Hey, are you coming?
12/05/23, 10:46 - Ben: Yes! Leaving now
with snacks
12/05/23, 10:47 - Ana: <Media omitted>
12/05/23, 10:48 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.`;

const IOS_TXT = `[12/05/23, 10:45:12] Ana: Hey, are you coming?
[12/05/23, 10:46:33] Ben joined using this group's invite link
[12/05/23, 10:47:01] Ben: Yes!`;

function bytes(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("WhatsApp export Parser & Engine", () => {
	it("parses Android timestamps, continuations and system lines", () => {
		const chat = parseWhatsapp(bytes(ANDROID_TXT));

		expect(chat.participants).toEqual(["Ana", "Ben"]);
		expect(chat.messageCount).toBe(3);
		expect(chat.messages[1]?.text).toBe("Yes! Leaving now\nwith snacks");
		expect(chat.messages[3]?.system).toBe(true);
		expect(chat.messages[3]?.text).toContain("end-to-end encrypted");
	});

	it("parses iOS bracket timestamps and join notices", () => {
		const chat = parseWhatsapp(bytes(IOS_TXT));
		expect(chat.participants).toEqual(["Ana", "Ben"]);
		expect(chat.messageCount).toBe(2);
		expect(chat.messages[0]?.date).toBe("12/05/23");
		expect(chat.messages[0]?.time).toBe("10:45:12");
		expect(chat.messages[1]?.system).toBe(true);
	});

	it("unpacks a .zip export and manifests media", () => {
		const zipped = fflate.zipSync({
			"WhatsApp Chat with Ana.txt": bytes(ANDROID_TXT),
			"IMG-20231205-WA0001.jpg": new Uint8Array([1, 2, 3]),
		});
		const chat = parseWhatsapp(zipped);
		expect(chat.title).toBe("WhatsApp Chat with Ana");
		expect(chat.mediaFiles).toContain("IMG-20231205-WA0001.jpg");
		expect(chat.messageCount).toBe(3);
	});

	it("renders dated Markdown end-to-end through the engine", async () => {
		expect(await whatsappToMarkdownEngine.probe()).toBe(true);
		const out = await convertWhatsappToMarkdown(
			bytes(ANDROID_TXT).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const md = new TextDecoder().decode(out);
		expect(md).toContain("# ");
		expect(md).toContain("## Participants");
		expect(md).toContain("## 12/05/23");
		expect(md).toContain("**Ana**");
	});

	it("throws on unrecognised input", () => {
		expect(() =>
			parseWhatsapp(bytes("just some random notes\nno timestamps")),
		).toThrow("No chat messages recognised");
	});
});
