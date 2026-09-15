import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertSxwToMarkdown, sxwToMarkdownEngine } from "../index";

function createMockSxwArchive(
	options: {
		title?: string;
		creator?: string;
		includeContentXml?: boolean;
	} = {},
): Uint8Array {
	const encoder = new TextEncoder();
	const files: Record<string, Uint8Array> = {
		mimetype: encoder.encode("application/vnd.sun.xml.writer"),
	};

	if (options.includeContentXml !== false) {
		const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="http://openoffice.org/2000/office" xmlns:text="http://openoffice.org/2000/text" xmlns:table="http://openoffice.org/2000/table">
  <office:body>
    <text:h text:level="1">OpenOffice Architecture</text:h>
    <text:p>This document tests OpenOffice.org 1.x conversion to Markdown.</text:p>
    <text:unordered-list>
      <text:list-item><text:p>Native XML storage</text:p></text:list-item>
      <text:list-item><text:p>Client-side parsing</text:p></text:list-item>
    </text:unordered-list>
    <table:table>
      <table:table-row>
        <table:table-cell><text:p>Component</text:p></table:table-cell>
        <table:table-cell><text:p>Engine</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell><text:p>Writer</text:p></table:table-cell>
        <table:table-cell><text:p>sxwToMarkdown</text:p></table:table-cell>
      </table:table-row>
    </table:table>
  </office:body>
</office:document-content>`;
		files["content.xml"] = encoder.encode(contentXml);
	}

	if (options.title || options.creator) {
		const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="http://openoffice.org/2000/office" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <office:meta>
    ${options.title ? `<dc:title>${options.title}</dc:title>` : ""}
    ${options.creator ? `<dc:creator>${options.creator}</dc:creator>` : ""}
    <dc:date>2002-05-01</dc:date>
  </office:meta>
</office:document-meta>`;
		files["meta.xml"] = encoder.encode(metaXml);
	}

	return zipSync(files);
}

describe("sxwToMarkdownEngine", () => {
	it("probes successfully", async () => {
		expect(await sxwToMarkdownEngine.probe()).toBe(true);
	});

	it("throws on invalid non-ZIP buffer", () => {
		const badBuffer = new Uint8Array([1, 2, 3, 4, 5]);
		expect(() => convertSxwToMarkdown(badBuffer)).toThrow(
			/Not a valid ZIP archive/,
		);
	});

	it("throws when content.xml is missing", () => {
		const missingContent = createMockSxwArchive({ includeContentXml: false });
		expect(() => convertSxwToMarkdown(missingContent)).toThrow(
			/Missing 'content.xml'/,
		);
	});

	it("converts SXW package into Markdown with tables and lists", () => {
		const sxw = createMockSxwArchive({
			title: "SXW Whitepaper",
			creator: "StarDivision Team",
		});

		const result = convertSxwToMarkdown(sxw, { includeFrontmatter: true });

		expect(result.metadata.title).toBe("SXW Whitepaper");
		expect(result.metadata.creator).toBe("StarDivision Team");
		expect(result.metadata.paragraphCount).toBeGreaterThan(3);
		expect(result.markdown).toContain('title: "SXW Whitepaper"');
		expect(result.markdown).toContain("# OpenOffice Architecture");
		expect(result.markdown).toContain("- Native XML storage");
		expect(result.markdown).toContain("| Component | Engine |");
		expect(result.markdown).toContain("| Writer | sxwToMarkdown |");
	});

	it("runs via engine interface and emits UTF-8 Markdown buffer", async () => {
		const sxw = createMockSxwArchive({ title: "Release Notes" });
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await sxwToMarkdownEngine.run(
			sxw.buffer as ArrayBuffer,
			{ includeFrontmatter: false },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const text = new TextDecoder().decode(output);
		expect(text).not.toContain('title: "Release Notes"');
		expect(text).toContain("# OpenOffice Architecture");
		expect(progress.length).toBeGreaterThanOrEqual(3);
		expect(progress[progress.length - 1]?.phase).toBe("COMPLETE");
	});
});
