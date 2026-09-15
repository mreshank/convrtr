import { describe, expect, it } from "vitest";
import { convertLyxToMarkdown, lyxToMarkdownEngine } from "../index";

const SAMPLE_LYX_DOCUMENT = `#LyX 2.3 created this file. For more info see http://www.lyx.org/
\\lyxformat 544
\\begin_document
\\header
\\textclass article
\\use_default_options true
\\end_header

\\begin_body

\\begin_layout Title
Quantum Electrodynamics and Gauge Theory
\\end_layout

\\begin_layout Author
Richard Feynman
\\end_layout

\\begin_layout Section
Introduction
\\end_layout

\\begin_layout Standard
In quantum field theory, the Lagrangian density governs particle dynamics:
\\end_layout

\\begin_layout Standard
\\begin_inset Formula $\\mathcal{L} = \\bar{\\psi}(i\\gamma^\\mu D_\\mu - m)\\psi - \\frac{1}{4}F_{\\mu\\nu}F^{\\mu\\nu}$
\\end_inset
\\end_layout

\\begin_layout Section
Experimental Parameters
\\end_layout

\\begin_layout Standard
\\begin_inset Tabular
<lyxtabular version="3" rows="3" columns="2">
<features rotate="0" tabularvalignment="middle">
<column alignment="center" valignment="top">
<column alignment="center" valignment="top">
<row>
<cell alignment="center" valignment="top" usebox="none">
Constant
</cell>
<cell alignment="center" valignment="top" usebox="none">
Value
</cell>
</row>
<row>
<cell alignment="center" valignment="top" usebox="none">
Speed of Light
</cell>
<cell alignment="center" valignment="top" usebox="none">
299792458
</cell>
</row>
</lyxtabular>
\\end_inset
\\end_layout

\\begin_layout Itemize
Gauge invariance holds globally and locally.
\\end_layout

\\begin_layout Enumerate
Renormalization preserves perturbation unitarity.
\\end_layout

\\end_body
\\end_document
`;

describe("LyX Document Engine", () => {
	it("converts a valid LyX document to GitHub Flavored Markdown", () => {
		const result = convertLyxToMarkdown(SAMPLE_LYX_DOCUMENT, {
			includeFrontmatter: true,
		});

		expect(result.metadata.title).toBe(
			"Quantum Electrodynamics and Gauge Theory",
		);
		expect(result.metadata.author).toBe("Richard Feynman");
		expect(result.metadata.textClass).toBe("article");
		expect(result.metadata.sectionCount).toBe(2);
		expect(result.metadata.formulaCount).toBe(1);
		expect(result.metadata.tableCount).toBe(1);

		expect(result.markdown).toContain(
			"# Quantum Electrodynamics and Gauge Theory",
		);
		expect(result.markdown).toContain("*By Richard Feynman*");
		expect(result.markdown).toContain("## Introduction");
		expect(result.markdown).toContain("## Experimental Parameters");
		expect(result.markdown).toContain(
			"$\\mathcal{L} = \\bar{\\psi}(i\\gamma^\\mu D_\\mu - m)\\psi - \\frac{1}{4}F_{\\mu\\nu}F^{\\mu\\nu}$",
		);
		expect(result.markdown).toContain("| Constant | Value |");
		expect(result.markdown).toContain("| Speed of Light | 299792458 |");
		expect(result.markdown).toContain(
			"* Gauge invariance holds globally and locally.",
		);
		expect(result.markdown).toContain(
			"1. Renormalization preserves perturbation unitarity.",
		);
		expect(result.markdown).toContain('format: "lyx"');
		expect(result.markdownBuffer.byteLength).toBeGreaterThan(0);
	});

	it("renders without frontmatter when requested", () => {
		const result = convertLyxToMarkdown(SAMPLE_LYX_DOCUMENT, {
			includeFrontmatter: false,
		});

		expect(result.markdown.startsWith("---")).toBe(false);
		expect(result.markdown).toContain(
			"# Quantum Electrodynamics and Gauge Theory",
		);
	});

	it("throws on invalid LyX input", () => {
		expect(() => convertLyxToMarkdown("Plain text with no LyX tags")).toThrow(
			"Invalid LyX file: Missing '#LyX' header or '\\begin_body' declaration.",
		);
	});

	it("runs through the engine interface", async () => {
		const buffer = new TextEncoder().encode(SAMPLE_LYX_DOCUMENT).buffer;
		const output = await lyxToMarkdownEngine.run(
			buffer,
			{ includeFrontmatter: true },
			() => {},
		);
		const decoded = new TextDecoder().decode(output);
		expect(decoded).toContain("# Quantum Electrodynamics and Gauge Theory");
	});
});
