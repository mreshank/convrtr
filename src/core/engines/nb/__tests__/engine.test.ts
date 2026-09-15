import { describe, expect, it } from "vitest";
import { convertNbToMarkdown, nbToMarkdownEngine } from "../index";

const SAMPLE_MATHEMATICA_NOTEBOOK = `(* Content-type: application/vnd.wolfram.mathematica *)
(* CreatedBy='Mathematica 12.1' *)

Notebook[{
Cell[CellGroupData[{
Cell["Quantum Harmonic Oscillator", "Title"],
Cell["An introduction to analytic eigenstates.", "Subtitle"],
Cell["Derivation and Theory", "Section"],
Cell[TextData[{
 "The time-independent Schr\\[ODoubleDot]dinger equation with potential ",
 StyleBox["V(x)", FontWeight->"Bold"],
 " satisfies ",
 StyleBox["H\\[Psi] = E\\[Psi]", "Code"],
 " where the angular frequency is ",
 "\\[Omega]"
}], "Text"],
Cell[BoxData[
 RowBox[{
  RowBox[{"\\[Psi]", "[", "x_", "]"}], ":=", 
  RowBox[{
   FractionBox["1", SqrtBox["2"]], " ",
   SuperscriptBox["E", RowBox[{"-", SuperscriptBox["x", "2"]}]]
  }]
 }]
], "Input"],
Cell[BoxData[
 RowBox[{"Out", "[", "1", "]"}]
], "Output"],
Cell["Key Properties", "Section"],
Cell["Normalized energy eigenvalues", "Item"],
Cell["Orthogonal Hermite polynomial bases", "ItemNumbered"]
}, Open  ]]
}]
`;

describe("Mathematica Notebook Engine", () => {
	it("converts a valid .nb notebook to GitHub Flavored Markdown", () => {
		const result = convertNbToMarkdown(SAMPLE_MATHEMATICA_NOTEBOOK, {
			includeFrontmatter: true,
		});

		expect(result.metadata.title).toBe("Quantum Harmonic Oscillator");
		expect(result.metadata.cellCount).toBe(9);
		expect(result.metadata.inputCount).toBe(1);
		expect(result.metadata.outputCount).toBe(1);
		expect(result.metadata.sections).toContain("Derivation and Theory");
		expect(result.metadata.generator).toBe("Mathematica 12.1");

		expect(result.markdown).toContain("# Quantum Harmonic Oscillator");
		expect(result.markdown).toContain(
			"## An introduction to analytic eigenstates.",
		);
		expect(result.markdown).toContain("## Derivation and Theory");
		expect(result.markdown).toContain("**V(x)**");
		expect(result.markdown).toContain("`Hψ = Eψ`");
		expect(result.markdown).toContain("ω");
		expect(result.markdown).toContain("```mathematica");
		expect(result.markdown).toContain("(1) / (√(2))");
		expect(result.markdown).toContain("* Normalized energy eigenvalues");
		expect(result.markdown).toContain("1. Orthogonal Hermite polynomial bases");
		expect(result.markdown).toContain('format: "mathematica-nb"');
		expect(result.markdownBuffer.byteLength).toBeGreaterThan(0);
	});

	it("renders without frontmatter when requested", () => {
		const result = convertNbToMarkdown(SAMPLE_MATHEMATICA_NOTEBOOK, {
			includeFrontmatter: false,
		});

		expect(result.markdown.startsWith("---")).toBe(false);
		expect(result.markdown).toContain("# Quantum Harmonic Oscillator");
	});

	it("converts tables formatted as GridBox", () => {
		const nbWithTable = `Notebook[{
Cell["Results Table", "Section"],
Cell[BoxData[
 GridBox[{
  {"Parameter", "Value", "Units"},
  {"Mass", "1.67", "kg"},
  {"Charge", "1.60", "C"}
 }]
], "Text"]
}]`;

		const result = convertNbToMarkdown(nbWithTable);
		expect(result.markdown).toContain("| Parameter | Value | Units |");
		expect(result.markdown).toContain("| Mass | 1.67 | kg |");
		expect(result.markdown).toContain("| Charge | 1.60 | C |");
	});

	it("throws on invalid notebook input", () => {
		expect(() => convertNbToMarkdown("Plain text with no cells")).toThrow(
			"Invalid Mathematica Notebook: Missing 'Notebook[' or 'Cell[' expression signature.",
		);
	});

	it("runs through the engine interface", async () => {
		const buffer = new TextEncoder().encode(SAMPLE_MATHEMATICA_NOTEBOOK).buffer;
		const output = await nbToMarkdownEngine.run(
			buffer,
			{ includeFrontmatter: true },
			() => {},
		);
		const decoded = new TextDecoder().decode(output);
		expect(decoded).toContain("# Quantum Harmonic Oscillator");
	});
});
