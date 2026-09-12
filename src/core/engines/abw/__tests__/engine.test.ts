import { gzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { abwToMarkdownEngine, convertAbwToMarkdown } from "../index";

const SAMPLE_ABW = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE abiword PUBLIC "-//ABISOURCE//DTD AWML 1.0 Strict//EN" "http://www.abisource.com/2001/xhtml/awml">
<abiword xmlns:awml="http://www.abisource.com/2001/xhtml/awml" version="3.0.5">
<metadata>
  <m key="dc.title">AbiWord Architecture Specification</m>
  <m key="dc.creator">Linus Developer</m>
  <m key="dc.date">2026-09-13</m>
  <m key="dc.description">Comprehensive document detailing open-source word processing architecture.</m>
  <m key="abiword.keywords">open-source, document, wordprocessor, cross-platform</m>
</metadata>
<section>
  <p props="heading:1">Document Title Header</p>
  <p props="heading:2">Architecture Overview</p>
  <p>This is a standard paragraph with <c props="font-weight:bold">bold text</c>, <c props="font-style:italic">italic phrasing</c>, <c props="text-decoration:line-through">deprecated text</c>, and <c props="font-family:Courier">monospace code</c>.</p>
  <p style="Quote">"Simplicity is prerequisite for reliability." - Edsger W. Dijkstra</p>
  <p style="Bullet List">First modular component</p>
  <p style="Bullet List">Second modular component</p>
  <p style="Numbered List">Initialize buffer</p>
  <p style="Numbered List">Parse XML document tree</p>
  <table>
    <cell x="0" y="0"><p>Module</p></cell>
    <cell x="1" y="0"><p>Status</p></cell>
    <cell x="0" y="1"><p>Layout Engine</p></cell>
    <cell x="1" y="1"><p>Production</p></cell>
  </table>
  <p><image mime-type="image/png" data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="/></p>
</section>
</abiword>`;

describe("AbiWord (.abw / .zabw) document engine", () => {
	it("rejects input without <abiword> root element", () => {
		const invalid = new TextEncoder().encode(
			"<note><title>Hello</title></note>",
		);
		expect(() => convertAbwToMarkdown(invalid)).toThrow(
			/Missing <abiword> root element/,
		);
	});

	it("converts standard .abw document to GitHub Flavored Markdown with YAML frontmatter", () => {
		const result = convertAbwToMarkdown(SAMPLE_ABW);

		expect(result.metadata.title).toBe("AbiWord Architecture Specification");
		expect(result.metadata.creator).toBe("Linus Developer");
		expect(result.metadata.keywords).toContain("open-source");
		expect(result.imageCount).toBe(1);

		// Verify Markdown content
		expect(result.markdown).toContain(
			'title: "AbiWord Architecture Specification"',
		);
		expect(result.markdown).toContain('author: "Linus Developer"');
		expect(result.markdown).toContain("# Document Title Header");
		expect(result.markdown).toContain("## Architecture Overview");
		expect(result.markdown).toContain("**bold text**");
		expect(result.markdown).toContain("*italic phrasing*");
		expect(result.markdown).toContain("~~deprecated text~~");
		expect(result.markdown).toContain("`monospace code`");
		expect(result.markdown).toContain(
			'> "Simplicity is prerequisite for reliability."',
		);
		expect(result.markdown).toContain("- First modular component");
		expect(result.markdown).toContain("1. Initialize buffer");

		// Verify Table
		expect(result.markdown).toContain("| Module | Status |");
		expect(result.markdown).toContain("| --- | --- |");
		expect(result.markdown).toContain("| Layout Engine | Production |");

		// Verify Embedded image
		expect(result.markdown).toContain(
			"![Embedded Image](data:image/png;base64,iVBORw0K",
		);
	});

	it("decompresses and extracts gzipped .zabw files", () => {
		const rawBytes = new TextEncoder().encode(SAMPLE_ABW);
		const gzipped = gzipSync(rawBytes);

		const result = convertAbwToMarkdown(gzipped);
		expect(result.metadata.title).toBe("AbiWord Architecture Specification");
		expect(result.markdown).toContain("# Document Title Header");
	});

	it("respects includeMetadata and preserveImages options", () => {
		const result = convertAbwToMarkdown(SAMPLE_ABW, {
			includeMetadata: false,
			preserveImages: false,
		});

		expect(result.markdown).not.toMatch(/^---\n/);
		expect(result.markdown).not.toContain(
			'title: "AbiWord Architecture Specification"',
		);
		expect(result.markdown).not.toContain("![Embedded Image]");
		expect(result.markdown).toContain("# Document Title Header");
	});

	it("executes through engine interface", async () => {
		const rawBytes = new TextEncoder().encode(SAMPLE_ABW);
		const output = await abwToMarkdownEngine.run(
			rawBytes.buffer as ArrayBuffer,
			{ includeMetadata: true },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const mdText = new TextDecoder().decode(output);
		expect(mdText).toContain("# Document Title Header");
	});
});
