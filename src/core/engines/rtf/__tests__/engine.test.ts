import { describe, expect, it } from "vitest";
import { convertRtfToMarkdown, rtfToMarkdownEngine } from "../index";

function buildMockRtf(): string {
	return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil Arial;}}
{\\info{\\title Project Foundations}{\\author Ada Lovelace}}
{\\*\\generator Convrtr RTF 1.0}
\\viewkind4\\uc1 
\\b\\fs32 Architecture Overview\\b0\\par
This document details the \\b core\\b0  principles with \\i italic\\i0  text and \\strike obsolete\\strike0  notes.\\par
\\bullet  First item in list\\par
\\bullet  Second item in list\\par
Here is an em-dash: \\emdash  and \\u8220?smart quotes\\u8221?.\\par
}`;
}

describe("RTF to Markdown Conversion Engine", () => {
	it("parses styled text, headings, and lists into Markdown", () => {
		const rtf = buildMockRtf();
		const result = convertRtfToMarkdown(rtf);

		expect(result.markdownText).toContain("## Architecture Overview");
		expect(result.markdownText).toContain("**core**");
		expect(result.markdownText).toContain("*italic*");
		expect(result.markdownText).toContain("~~obsolete~~");
		expect(result.markdownText).toContain("- First item in list");
		expect(result.markdownText).toContain("- Second item in list");
		expect(result.markdownText).toContain("—");
		expect(result.markdownText).toContain("“smart quotes”");
	});

	it("extracts document metadata into YAML frontmatter", () => {
		const rtf = buildMockRtf();
		const result = convertRtfToMarkdown(rtf, { includeFrontmatter: true });

		expect(result.metadata.title).toBe("Project Foundations");
		expect(result.metadata.author).toBe("Ada Lovelace");
		expect(result.markdownText).toContain('title: "Project Foundations"');
		expect(result.markdownText).toContain('author: "Ada Lovelace"');
	});

	it("runs end-to-end via rtfToMarkdownEngine interface", async () => {
		const rtf = buildMockRtf();
		const bytes = new TextEncoder().encode(rtf);
		const output = await rtfToMarkdownEngine.run(
			bytes.buffer as ArrayBuffer,
			{ includeFrontmatter: false },
			() => {},
		);
		const md = new TextDecoder().decode(output);

		expect(md).toContain("Architecture Overview");
		expect(md).toContain("**core**");
		expect(md).not.toContain("---");
	});

	it("throws on non-RTF content", () => {
		const invalid = "This is a plain text file without RTF headers.";
		expect(() => convertRtfToMarkdown(invalid)).toThrow(/Invalid RTF document/);
	});
});
