import type { Tool } from "../../types";

export const ti8xpToTxt: Tool = {
	id: "document/8xp-to-txt",
	slug: "8xp-to-txt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/octet-stream", "application/x-ticalc"],
		ext: ["8xp", "8xk"],
	},
	output: { ext: "txt", mime: "text/plain" },
	engines: ["extract:8xp-to-txt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "text",
		presets: [
			{
				id: "text",
				label: "TI-BASIC Text (.txt)",
				explanation:
					"De-tokenizes calculator bytecode into formatted TI-BASIC program source with mathematical symbols, indenting, and program header.",
				params: { markdown: false },
			},
			{
				id: "markdown",
				label: "Markdown (.md)",
				explanation:
					"Formats program metadata, comments, and syntax-highlighted code block as a clean Markdown document.",
				params: { markdown: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "8XP to TXT — Convert TI-84 Program to Text | convrtr",
		h1: "Convert TI-84 8XP Program to Readable Text",
		intent:
			"Convert Texas Instruments TI-83 and TI-84 Plus .8xp program files into clean, readable TI-BASIC text and Markdown. Read calculator math code, formulas, and games without TI Connect software.",
		faq: [
			{
				q: "What is an .8xp file?",
				a: "An .8xp file is a tokenized program file for Texas Instruments TI-83 Plus and TI-84 Plus graphing calculators. Commands like Disp, Prompt, If, and mathematical symbols are stored as binary bytecodes.",
			},
			{
				q: "Do I need TI Connect or a calculator cable?",
				a: "No. convrtr parses the **TI83F* container and de-tokenizes the bytecode entirely in your browser without software installation or hardware.",
			},
			{
				q: "Are mathematical symbols preserved?",
				a: "Yes. Tokens for store arrows (→), inequality operators (≤, ≥, ≠), square roots (√), exponents, and Greek letters are translated to clean Unicode characters.",
			},
			{
				q: "Does this tool support protected programs?",
				a: "Yes. Both standard programs (Type 0x05) and protected programs (Type 0x06) are de-tokenized.",
			},
		],
		related: [
			"document/nb-to-markdown",
			"document/latex-to-markdown",
			"document/texinfo-to-markdown",
		],
	},
};
