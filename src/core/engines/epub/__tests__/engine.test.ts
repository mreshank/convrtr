import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
	convertEpubToMarkdown,
	epubToMarkdownEngine,
	htmlToMarkdown,
} from "../index";

function buildMockEpub(): Uint8Array {
	const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

	const packageOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Principles of Quantum Computing</dc:title>
    <dc:creator>Dr. Ada Lovelace</dc:creator>
    <dc:language>en</dc:language>
    <dc:publisher>Convrtr Academic Press</dc:publisher>
    <dc:date>2026-01-15</dc:date>
  </metadata>
  <manifest>
    <item id="ch1" href="chapters/intro.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapters/algorithms.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

	const ch1Xhtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Introduction</title></head>
<body>
  <h1>Chapter 1: Foundations</h1>
  <p>Welcome to the <strong>quantum era</strong>! This paradigm introduces <em>superposition</em> and entanglement.</p>
  <blockquote>Information is physical. — Rolf Landauer</blockquote>
</body>
</html>`;

	const ch2Xhtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Algorithms</title></head>
<body>
  <h2>Chapter 2: Algorithms</h2>
  <p>Key algorithms include:</p>
  <ul>
    <li>Shor&#39;s Factoring Algorithm</li>
    <li>Grover&#39;s Search Algorithm &amp; Amplitude Amplification</li>
  </ul>
  <pre><code>def quantum_teleportation():\n    pass</code></pre>
</body>
</html>`;

	const archive: Record<string, Uint8Array> = {
		mimetype: new TextEncoder().encode("application/epub+zip"),
		"META-INF/container.xml": new TextEncoder().encode(containerXml),
		"OEBPS/package.opf": new TextEncoder().encode(packageOpf),
		"OEBPS/chapters/intro.xhtml": new TextEncoder().encode(ch1Xhtml),
		"OEBPS/chapters/algorithms.xhtml": new TextEncoder().encode(ch2Xhtml),
	};

	return zipSync(archive);
}

describe("EPUB to Markdown Engine", () => {
	it("probes successfully", async () => {
		expect(await epubToMarkdownEngine.probe()).toBe(true);
	});

	it("converts HTML markup to clean Markdown", () => {
		const html =
			"<h1>Title</h1><p>Test &amp; <b>bold</b> with <i>italics</i>.</p>";
		const md = htmlToMarkdown(html);
		expect(md).toContain("# Title");
		expect(md).toContain("Test & **bold** with *italics*.");
	});

	it("parses and extracts structured Markdown from an EPUB archive", () => {
		const epubBytes = buildMockEpub();
		const result = convertEpubToMarkdown(epubBytes);

		expect(result.metadata.title).toBe("Principles of Quantum Computing");
		expect(result.metadata.creator).toBe("Dr. Ada Lovelace");
		expect(result.metadata.language).toBe("en");
		expect(result.chapters.length).toBe(2);

		// Check chapter 1 content
		expect(result.markdownText).toContain("# Chapter 1: Foundations");
		expect(result.markdownText).toContain("**quantum era**");
		expect(result.markdownText).toContain("*superposition*");
		expect(result.markdownText).toContain("> Information is physical.");

		// Check chapter 2 content
		expect(result.markdownText).toContain("## Chapter 2: Algorithms");
		expect(result.markdownText).toContain("- Shor's Factoring Algorithm");
		expect(result.markdownText).toContain(
			"- Grover's Search Algorithm & Amplitude Amplification",
		);
		expect(result.markdownText).toContain("```\ndef quantum_teleportation():");

		// Check frontmatter
		expect(result.markdownText).toContain(
			'title: "Principles of Quantum Computing"',
		);
		expect(result.markdownText).toContain('author: "Dr. Ada Lovelace"');
	});

	it("runs end-to-end via epubToMarkdownEngine interface", async () => {
		const epubBytes = buildMockEpub();
		const output = await epubToMarkdownEngine.run(
			epubBytes.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const md = new TextDecoder().decode(output);

		expect(md).toContain("# Chapter 1: Foundations");
		expect(md).toContain("Dr. Ada Lovelace");
	});

	it("throws on missing container.xml", () => {
		const corrupted = zipSync({
			"readme.txt": new TextEncoder().encode("Not an EPUB"),
		});
		expect(() => convertEpubToMarkdown(corrupted)).toThrow(
			/Missing 'META-INF\/container\.xml'/,
		);
	});
});
