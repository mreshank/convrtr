import { describe, expect, it } from "vitest";
import { convertLatexToMarkdown, latexToMarkdownEngine } from "../index";

describe("LaTeX to Markdown parser & engine", () => {
	const sampleLatex = `
\\documentclass{article}
\\title{Quantum Field Dynamics}
\\author{Dr. Jane Doe}
\\date{March 2026}

\\begin{document}
\\maketitle

% This is a comment that should be stripped
\\section{Introduction}
Modern physics relies on the equivalence relation:
$E = mc^2$.

\\subsection{Field Equations}
Consider the following action integral:
\\begin{equation}
S = \\int d^4x \\sqrt{-g} \\left( \\frac{R}{16\\pi G} + \\mathcal{L}_m \\right)
\\end{equation}

\\section{Experimental Setup}
Key points to note:
\\begin{itemize}
\\item Superconducting \\textbf{qubits} cooled to 15 mK
\\item Optical \\textit{cavity} with finesse $> 10^5$
\\end{itemize}

\\begin{verbatim}
python -m simulation --steps 1000
\\end{verbatim}

\\section{Conclusion}
Special symbols: 100\\% sure, \\$50 cost, R\\&D department, data\\_set.
Visit \\url{https://arxiv.org} or \\href{https://example.com}{project portal}.
\\end{document}
`;

	it("converts complete LaTeX document with frontmatter and sections", () => {
		const result = convertLatexToMarkdown(sampleLatex, {
			includeFrontmatter: true,
		});

		expect(result.metadata.title).toBe("Quantum Field Dynamics");
		expect(result.metadata.author).toBe("Dr. Jane Doe");
		expect(result.metadata.date).toBe("March 2026");
		expect(result.metadata.sectionCount).toBeGreaterThanOrEqual(3);
		expect(result.metadata.mathBlockCount).toBeGreaterThanOrEqual(2);

		expect(result.markdownText).toContain('title: "Quantum Field Dynamics"');
		expect(result.markdownText).toContain("# Introduction");
		expect(result.markdownText).toContain("## Field Equations");
		expect(result.markdownText).toContain("$E = mc^2$");
		expect(result.markdownText).toContain("$$\nS = \\int d^4x \\sqrt{-g}");
		expect(result.markdownText).toContain(
			"- Superconducting **qubits** cooled to 15 mK",
		);
		expect(result.markdownText).toContain(
			"- Optical *cavity* with finesse $> 10^5$",
		);
		expect(result.markdownText).toContain(
			"```\npython -m simulation --steps 1000\n```",
		);
		expect(result.markdownText).toContain("100% sure");
		expect(result.markdownText).toContain("$50 cost");
		expect(result.markdownText).toContain("R&D department");
		expect(result.markdownText).toContain("data_set");
		expect(result.markdownText).toContain(
			"[https://arxiv.org](https://arxiv.org)",
		);
		expect(result.markdownText).toContain(
			"[project portal](https://example.com)",
		);
		expect(result.markdownText).not.toContain("This is a comment");
	});

	it("converts lists and blockquotes correctly", () => {
		const latex = `
\\begin{document}
\\begin{enumerate}
\\item First step
\\item Second step
\\end{enumerate}

\\begin{quote}
Knowledge is power.
-- Francis Bacon
\\end{quote}
\\end{document}
`;
		const result = convertLatexToMarkdown(latex, { includeFrontmatter: false });
		expect(result.markdownText).toContain("1. First step");
		expect(result.markdownText).toContain("2. Second step");
		expect(result.markdownText).toContain("> Knowledge is power.");
	});

	it("engine probe and run returns ArrayBuffer containing valid markdown bytes", async () => {
		expect(await latexToMarkdownEngine.probe()).toBe(true);

		const inputBytes = new TextEncoder().encode(sampleLatex)
			.buffer as ArrayBuffer;
		const output = await latexToMarkdownEngine.run(
			inputBytes,
			{ includeFrontmatter: true },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(50);
		const decoded = new TextDecoder().decode(new Uint8Array(output));
		expect(decoded).toContain("# Introduction");
		expect(decoded).toContain("$E = mc^2$");
	});
});
