import { describe, expect, it } from "vitest";
import { mobiToMarkdownEngine } from "../index";
import { convertMobiToMarkdown } from "../parser";

function buildMobi(
	opts: { encryption?: number; compression?: number; pdbType?: string } = {},
): Uint8Array {
	const enc = new TextEncoder();
	const title = enc.encode("Test Book Title");
	const html = enc.encode("<p>Hello <b>world</b></p>");
	const author = enc.encode("Tester");

	// EXTH with one author record.
	const exthRec = new Uint8Array(8 + author.length);
	new DataView(exthRec.buffer).setUint32(0, 100, false);
	new DataView(exthRec.buffer).setUint32(4, 8 + author.length, false);
	exthRec.set(author, 8);
	const exthLen = 12 + exthRec.length;
	const exth = new Uint8Array(exthLen);
	enc.encodeInto("EXTH", exth.subarray(0));
	new DataView(exth.buffer).setUint32(4, exthLen, false);
	new DataView(exth.buffer).setUint32(8, 1, false);
	exth.set(exthRec, 12);

	// Record 0: PalmDoc(16) + MOBI(232) + EXTH + title.
	const mobiLen = 232;
	const rec0Len = 16 + mobiLen + exthLen + title.length;
	const rec0 = new Uint8Array(rec0Len);
	const rv = new DataView(rec0.buffer);
	rv.setUint16(0, opts.compression ?? 2, false);
	rv.setUint32(4, html.length, false);
	rv.setUint16(8, 1, false);
	rv.setUint16(10, 4096, false);
	rv.setUint16(12, opts.encryption ?? 0, false);
	enc.encodeInto("MOBI", rec0.subarray(16));
	rv.setUint32(20, mobiLen, false);
	rv.setUint32(24, 2, false);
	rv.setUint32(28, 1252, false);
	rv.setUint32(96, 0x40, false); // EXTH flags
	rv.setUint32(100, 16 + mobiLen + exthLen, false); // full name offset (rec0 base)
	rv.setUint32(104, title.length, false);
	rec0.set(exth, 16 + mobiLen);
	rec0.set(title, 16 + mobiLen + exthLen);

	// Record 1: raw-ASCII LZ77 literals (0x09-0x7F pass through).
	const rec1 = html;

	const rec0Off = 78 + 2 * 8;
	const rec1Off = rec0Off + rec0Len;
	const file = new Uint8Array(rec1Off + rec1.length);
	enc.encodeInto("TestBook", file.subarray(0));
	const fv = new DataView(file.buffer);
	enc.encodeInto(opts.pdbType ?? "BOOK", file.subarray(60));
	enc.encodeInto("MOBI", file.subarray(64));
	fv.setUint16(76, 2, false);
	fv.setUint32(78, rec0Off, false);
	fv.setUint32(86, rec1Off, false);
	file.set(rec0, rec0Off);
	file.set(rec1, rec1Off);
	return file;
}

describe("Mobipocket (.mobi) Parser & Engine", () => {
	it("decodes text, title, author and chapters", () => {
		const { markdown, metadata } = convertMobiToMarkdown(buildMobi(), () => {});
		expect(metadata.title).toBe("Test Book Title");
		expect(metadata.author).toBe("Tester");
		expect(metadata.compression).toBe("palmdoc-lz77");
		expect(markdown).toContain("# Test Book Title");
		expect(markdown).toContain('author: "Tester"');
		expect(markdown).toContain("Hello world");
	});

	it("runs through the engine", async () => {
		expect(await mobiToMarkdownEngine.probe()).toBe(true);
		const file = buildMobi();
		const out = await mobiToMarkdownEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		expect(new TextDecoder().decode(out)).toContain("Hello world");
	});

	it("refuses encrypted books, Huffdic and non-MOBI PalmDBs", () => {
		expect(() => convertMobiToMarkdown(buildMobi({ encryption: 2 }))).toThrow(
			"DRM",
		);
		expect(() =>
			convertMobiToMarkdown(buildMobi({ compression: 17480 })),
		).toThrow("Huffdic");
		expect(() => convertMobiToMarkdown(buildMobi({ pdbType: "DATA" }))).toThrow(
			"Not a Mobipocket book",
		);
	});
});
