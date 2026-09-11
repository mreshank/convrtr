import { describe, expect, it } from "vitest";
import { convertNfoToHtml, decodeCp437 } from "../parser";

describe("nfo engine", () => {
	it("decodes CP437 box-drawing and block characters into Unicode", () => {
		// 0xDB = '█', 0xB0 = '░', 0xB1 = '▒', 0xB2 = '▓', 0xC4 = '─', 0xDA = '┌', 0xBF = '┐'
		const bytes = new Uint8Array([0xda, 0xc4, 0xc4, 0xbf, 0x0a, 0xdb, 0xb0, 0xb1, 0xb2]);
		const { text, boxCharCount } = decodeCp437(bytes);

		expect(text).toBe("┌──┐\n█░▒▓");
		expect(boxCharCount).toBe(8);
	});

	it("renders HTML output with container and dark theme styles by default", () => {
		const bytes = new Uint8Array([0xda, 0xc4, 0xbf, 0x0a, 0xc0, 0xc4, 0xd9]);
		const result = convertNfoToHtml(bytes);

		expect(result.metadata.hasAnsiArt).toBe(false);
		expect(result.metadata.lineCount).toBe(2);
		expect(result.content).toContain("<!DOCTYPE html>");
		expect(result.content).toContain("<pre>┌─┐\n└─┘</pre>");
		expect(result.content).toContain("--bg: #0d1117");
	});

	it("supports matrix green and amber phosphor themes", () => {
		const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

		const matrixResult = convertNfoToHtml(bytes, { theme: "matrix" });
		expect(matrixResult.content).toContain("--fg: #00ff66");

		const amberResult = convertNfoToHtml(bytes, { theme: "amber" });
		expect(amberResult.content).toContain("--fg: #ffb000");
	});

	it("outputs pure UTF-8 text when format is txt", () => {
		const bytes = new Uint8Array([0xda, 0xc4, 0xbf]);
		const result = convertNfoToHtml(bytes, { format: "txt" });

		expect(result.content).toBe("┌─┐");
		expect(result.content).not.toContain("<!DOCTYPE html>");
	});

	it("escapes HTML entities in text to prevent XSS", () => {
		const text = '<script>alert("nfo")</script> & "test"';
		const bytes = new TextEncoder().encode(text);
		const result = convertNfoToHtml(bytes, { format: "html" });

		expect(result.content).toContain("&lt;script&gt;");
		expect(result.content).not.toContain("<script>");
	});
});
