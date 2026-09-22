import type { Tool } from "../../types";

export const nscriptToTxt: Tool = {
	id: "document/nscript-to-txt",
	slug: "nscript-to-txt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/octet-stream", "text/plain"],
		ext: ["dat", "txt"],
	},
	output: { ext: "txt", mime: "text/plain" },
	engines: ["extract:nscript-to-txt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "text",
		presets: [
			{
				id: "text",
				label: "Clean Script Text (.txt)",
				explanation:
					"De-obfuscates the 0x84 XOR byte stream and extracts clean game scenario text, dialogue lines, and command blocks.",
				params: { markdown: false },
			},
			{
				id: "markdown",
				label: "Markdown (.md)",
				explanation:
					"Formats scenario headers, label markers, and dialogue blocks into structured Markdown chapters.",
				params: { markdown: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "NSCRIPT to TXT — Decrypt NScripter nscript.dat to Text | convrtr",
		h1: "Decrypt NScripter Visual Novel Script Archive",
		intent:
			"Decrypt and extract nscript.dat visual novel script archives from classic NScripter and ONScripter game engines into clean UTF-8 text and Markdown without installing Python scripts or CLI tools.",
		faq: [
			{
				q: "What is an nscript.dat file?",
				a: "The nscript.dat file is the central script archive used by NScripter and ONScripter visual novel engines. It contains game dialogue, branching logic, character definitions, and audio cues.",
			},
			{
				q: "How is nscript.dat obfuscated?",
				a: "NScripter applies a byte-wise XOR mask with the constant key 0x84 across the entire script stream. convrtr decrypts this stream instantly in your browser.",
			},
			{
				q: "Are Shift-JIS encoded Japanese visual novels supported?",
				a: "Yes. Both UTF-8 and legacy Shift-JIS character sets are detected and decoded into readable UTF-8 text.",
			},
			{
				q: "Are my files uploaded to a remote server?",
				a: "No. Decryption and character set decoding execute 100% locally within your browser client.",
			},
		],
		related: [
			"document/rpa-to-zip",
			"document/pck-to-zip",
			"document/wad-to-zip",
		],
	},
};
