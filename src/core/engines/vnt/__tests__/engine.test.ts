import { describe, expect, it } from "vitest";
import { vntToTxtEngine } from "../index";
import { decodeQuotedPrintable, parseVNote, parseVNoteDate } from "../parser";

function buildMockVNote(): string {
	return [
		"BEGIN:VNOTE",
		"VERSION:1.1",
		"BODY;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Meeting with Dr. Smith=0D=0A=",
		"Discussed prescription renewal and laboratory results.=0D=0A=",
		"Follow-up scheduled for next Tuesday.",
		"DCREATED:20130620T101500Z",
		"LAST-MODIFIED:20130620T103000Z",
		"CATEGORIES:Medical",
		"END:VNOTE",
		"BEGIN:VNOTE",
		"VERSION:1.1",
		"SUMMARY:Grocery List",
		"BODY;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:1. Milk=0D=0A2. Eggs=0D=0A3. Sourdough bread",
		"DCREATED:20140110T080000",
		"END:VNOTE",
	].join("\r\n");
}

describe("vntToTxtEngine & VNT Parser", () => {
	it("probes successfully", async () => {
		const supported = await vntToTxtEngine.probe();
		expect(supported).toBe(true);
	});

	it("correctly decodes multi-byte UTF-8 Quoted-Printable strings", () => {
		// "Café" -> C a f =C3=A9
		const raw = "Caf=C3=A9 in Z=C3=BCrich";
		const decoded = decodeQuotedPrintable(raw, "utf-8");
		expect(decoded).toBe("Café in Zürich");
	});

	it("parses vNote timestamps to ISO 8601", () => {
		expect(parseVNoteDate("20130620T101500Z")).toBe("2013-06-20T10:15:00.000Z");
		expect(parseVNoteDate("20140110T080000")).toBe("2014-01-10T08:00:00");
	});

	it("parses multi-note .vnt file and extracts headers and body text", () => {
		const rawVnt = buildMockVNote();
		const bytes = new TextEncoder().encode(rawVnt);
		const result = parseVNote(bytes);

		expect(result.notes).toHaveLength(2);

		// Note 1
		const [n1, n2] = result.notes;
		expect(n1).toBeDefined();
		if (!n1) return;
		expect(n1.categories).toBe("Medical");
		expect(n1.created).toBe("2013-06-20T10:15:00.000Z");
		expect(n1.modified).toBe("2013-06-20T10:30:00.000Z");
		expect(n1.body).toContain("Meeting with Dr. Smith");
		expect(n1.body).toContain("Discussed prescription renewal");
		expect(n1.body).toContain("Follow-up scheduled for next Tuesday.");

		// Note 2
		expect(n2).toBeDefined();
		if (!n2) return;
		expect(n2.title).toBe("Grocery List");
		expect(n2.created).toBe("2014-01-10T08:00:00");
		expect(n2.body).toContain("1. Milk\n2. Eggs\n3. Sourdough bread");

		// Formatted text output
		expect(result.text).toContain("Category: Medical");
		expect(result.text).toContain("Title: Grocery List");
		expect(result.text).toContain("========================================");
	});

	it("parses Base64 encoded vNote memo", () => {
		const base64Body = btoa("Secret password: correct-horse-battery-staple");
		const vnt = [
			"BEGIN:VNOTE",
			"VERSION:1.1",
			`BODY;ENCODING=BASE64;CHARSET=UTF-8:${base64Body}`,
			"SUMMARY:Vault",
			"END:VNOTE",
		].join("\r\n");

		const bytes = new TextEncoder().encode(vnt);
		const result = parseVNote(bytes);

		expect(result.notes).toHaveLength(1);
		const [n] = result.notes;
		expect(n).toBeDefined();
		if (!n) return;
		expect(n.title).toBe("Vault");
		expect(n.body).toBe("Secret password: correct-horse-battery-staple");
	});

	it("runs end-to-end via engine producing valid plain text ArrayBuffer", async () => {
		const rawVnt = buildMockVNote();
		const bytes = new TextEncoder().encode(rawVnt);
		const progress: string[] = [];

		const result = await vntToTxtEngine.run(
			bytes.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const text = new TextDecoder("utf-8").decode(result);
		expect(text).toContain("Meeting with Dr. Smith");
		expect(text).toContain("Grocery List");

		expect(progress).toContain("PARSING_VNOTE");
		expect(progress).toContain("DECODING_TEXT");
		expect(progress).toContain("DONE");
	});

	it("rejects non-vNote files", () => {
		const invalid = new TextEncoder().encode(
			"Random plain text without markers",
		);
		expect(() => parseVNote(invalid)).toThrow(/BEGIN:VNOTE/i);
	});
});
