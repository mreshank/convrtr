import { gzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertZabwToMarkdown, zabwToMarkdownEngine } from "../index";

function createMockZabwXml(): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE abiword PUBLIC "-//ABISOURCE//DTD AWML 1.0//EN" "http://www.abisource.com/awml.dtd">
<abiword xmlns:dc="http://purl.org/dc/elements/1.1/" fileformat="1.0">
<metadata>
<m key="dc.title">Project Specifications</m>
<m key="dc.creator">Ada Lovelace</m>
<m key="dc.subject">Computing Architecture</m>
<m key="abiword.generator">AbiWord 3.0</m>
</metadata>
<section>
<p style="Heading 1"><c props="font-weight:bold">Introduction</c></p>
<p>This is a test paragraph with <c props="font-style:italic">italic text</c> and <c props="font-weight:bold">bold text</c> and <a href="https://example.com">hyperlink</a>.</p>
<p style="Heading 2">Key Points</p>
<p style="List Item">First item in list</p>
<p style="List Item">Second item in list</p>
<p style="Block Text">This is an indented blockquote.</p>
<table>
<cell><p>Header 1</p></cell>
<cell><p>Header 2</p></cell>
<cell><p>Data 1</p></cell>
<cell><p>Data 2</p></cell>
</table>
</section>
</abiword>`;
}

describe("ZABW to Markdown Engine", () => {
	it("rejects non-ZABW buffer", () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => convertZabwToMarkdown(invalid)).toThrow(
			/Buffer too small|Missing '<abiword'/,
		);
	});

	it("parses uncompressed ABW document directly", () => {
		const xml = createMockZabwXml();
		const bytes = new TextEncoder().encode(xml);

		const result = convertZabwToMarkdown(bytes, { includeFrontmatter: true });
		expect(result.metadata.title).toBe("Project Specifications");
		expect(result.metadata.author).toBe("Ada Lovelace");
		expect(result.markdown).toContain("# Introduction");
		expect(result.markdown).toContain("*italic text*");
		expect(result.markdown).toContain("**bold text**");
		expect(result.markdown).toContain("[hyperlink](https://example.com)");
		expect(result.markdown).toContain("## Key Points");
		expect(result.markdown).toContain("- First item in list");
		expect(result.markdown).toContain("> This is an indented blockquote.");
		expect(result.markdown).toContain("| Header 1 | Header 2 |");
	});

	it("decompresses Gzip ZABW container and converts to GFM Markdown", () => {
		const xml = createMockZabwXml();
		const xmlBytes = new TextEncoder().encode(xml);
		const gzipped = gzipSync(xmlBytes);

		const result = convertZabwToMarkdown(gzipped, { includeFrontmatter: true });
		expect(result.metadata.title).toBe("Project Specifications");
		expect(result.metadata.generator).toBe("AbiWord 3.0");
		expect(result.markdown).toContain('title: "Project Specifications"');
		expect(result.markdown).toContain("# Introduction");
		expect(result.markdownBuffer.byteLength).toBeGreaterThan(100);
	});

	it("runs via engine interface with progress tracking", async () => {
		const xml = createMockZabwXml();
		const gzipped = gzipSync(new TextEncoder().encode(xml));
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await zabwToMarkdownEngine.run(
			gzipped.buffer as ArrayBuffer,
			{ includeFrontmatter: true },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const md = new TextDecoder().decode(output);
		expect(md).toContain("# Introduction");
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
