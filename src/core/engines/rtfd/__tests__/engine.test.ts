import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertRtfdToMarkdown, rtfdToMarkdownEngine } from "../index";

function createMockRtfText(): string {
	return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\info{\\title Project Blueprint}{\\author Steve Jobs}{\\*\\generator Apple TextEdit}}
\\f0\\fs36 \\b Design Specifications\\b0\\par
This is an Apple RTFD document with \\i rich formatting\\i0 and embedded images.\\par
}`;
}

function createMockRtfdZip(): Uint8Array {
	const rtfContent = new TextEncoder().encode(createMockRtfText());
	const mockImage = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);

	return zipSync({
		"document.rtfd/TXT.rtf": rtfContent,
		"document.rtfd/figure1.png": mockImage,
	});
}

describe("RTFD to Markdown Engine", () => {
	it("rejects non-RTFD buffer", () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => convertRtfdToMarkdown(invalid)).toThrow(
			/Buffer too small|Invalid RTF document/,
		);
	});

	it("converts unzipped raw RTF stream directly", () => {
		const rtfBytes = new TextEncoder().encode(createMockRtfText());
		const result = convertRtfdToMarkdown(rtfBytes, {
			includeFrontmatter: true,
		});

		expect(result.metadata.title).toBe("Project Blueprint");
		expect(result.metadata.author).toBe("Steve Jobs");
		expect(result.markdown).toContain("Design Specifications");
		expect(result.markdown).toContain("*rich formatting*");
	});

	it("unpacks zipped RTFD bundle and links graphic attachments", () => {
		const zipBytes = createMockRtfdZip();
		const result = convertRtfdToMarkdown(zipBytes, {
			includeFrontmatter: true,
		});

		expect(result.metadata.title).toBe("Project Blueprint");
		expect(result.metadata.attachments).toContain("figure1.png");
		expect(result.markdown).toContain("![figure1.png](figure1.png)");
		expect(result.markdownBuffer.byteLength).toBeGreaterThan(100);
	});

	it("runs via engine interface with progress tracking", async () => {
		const zipBytes = createMockRtfdZip();
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await rtfdToMarkdownEngine.run(
			zipBytes.buffer as ArrayBuffer,
			{ includeFrontmatter: true },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const md = new TextDecoder().decode(output);
		expect(md).toContain("Design Specifications");
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
