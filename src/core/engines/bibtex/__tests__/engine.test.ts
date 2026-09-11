import { describe, expect, it } from "vitest";
import { bibtexToMarkdownEngine } from "../index";
import { decodeLatex, parseBibtex } from "../parser";

const SAMPLE_BIBTEX = `
@comment{Sample Bibliography}

@article{shannon1948mathematical,
  title = {A Mathematical Theory of Communication},
  author = {Shannon, Claude E.},
  journal = {Bell System Technical Journal},
  volume = {27},
  number = {3},
  pages = {379--423},
  year = {1948},
  publisher = {Nokia Bell Labs},
  doi = {10.1002/j.1538-7305.1948.tb01338.x}
}

@inproceedings{vaswani2017attention,
  title = {Attention Is All You Need},
  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N and Kaiser, {\\L}ukasz and Polosukhin, Illia},
  booktitle = {Advances in Neural Information Processing Systems},
  volume = {30},
  year = {2017},
  url = {https://arxiv.org/abs/1706.03762},
  abstract = {The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.}
}

@book{turing1950computing,
  title = {Computing Machinery and Intelligence},
  author = {Turing, Alan M.},
  year = {1950},
  publisher = {Mind}
}
`;

describe("BibTeX Parser & Engine", () => {
	it("decodes LaTeX special accents and punctuation", () => {
		expect(decodeLatex('Schr\\"odinger')).toBe("Schrödinger");
		expect(decodeLatex("Poincar\\'e")).toBe("Poincaré");
		expect(decodeLatex("Fra{\\c{c}}ois")).toBe("Fraçois");
		expect(decodeLatex("pages 1--10")).toBe("pages 1–10");
		expect(decodeLatex("{NASA} mission")).toBe("NASA mission");
	});

	it("parses multiple entries and generates a markdown table", () => {
		const result = parseBibtex(SAMPLE_BIBTEX, { format: "table" });

		expect(result.entryCount).toBe(3);
		expect(result.entries[0]?.key).toBe("shannon1948mathematical");
		expect(result.entries[0]?.title).toBe(
			"A Mathematical Theory of Communication",
		);
		expect(result.entries[0]?.authors).toContain("Claude E. Shannon");
		expect(result.entries[0]?.year).toBe("1948");
		expect(result.entries[0]?.doi).toBe("10.1002/j.1538-7305.1948.tb01338.x");

		// Markdown Table validation
		expect(result.markdown).toContain(
			"| Citation Key | Title | Authors | Year | Venue | DOI / Link |",
		);
		expect(result.markdown).toContain("`shannon1948mathematical`");
		expect(result.markdown).toContain("**Attention Is All You Need**");
	});

	it("supports reading list format with abstracts", () => {
		const result = parseBibtex(SAMPLE_BIBTEX, {
			format: "list",
			includeAbstract: true,
		});

		expect(result.markdown).toContain("# Bibliography");
		expect(result.markdown).toContain(
			"### 2. Attention Is All You Need (2017)",
		);
		expect(result.markdown).toContain(
			"> **Abstract:** The dominant sequence transduction models",
		);
	});

	it("exports JSON citation objects", () => {
		const result = parseBibtex(SAMPLE_BIBTEX, { format: "json" });
		const parsed = JSON.parse(result.markdown);

		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(3);
		expect(parsed[0].key).toBe("shannon1948mathematical");
		expect(parsed[1].type).toBe("inproceedings");
	});

	it("handles empty or comment-only bibtex cleanly", () => {
		const emptyResult = parseBibtex("% just a comment\n@comment{hello}");
		expect(emptyResult.entryCount).toBe(0);
		expect(emptyResult.entries).toHaveLength(0);
	});

	it("executes cleanly through bibtexToMarkdownEngine", async () => {
		const buffer = new TextEncoder().encode(SAMPLE_BIBTEX).buffer;
		const outputBuffer = await bibtexToMarkdownEngine.run(
			buffer,
			{ format: "table" },
			() => {},
		);

		const md = new TextDecoder().decode(outputBuffer);
		expect(md).toContain("| Citation Key |");
		expect(md).toContain("`turing1950computing`");
	});
});
