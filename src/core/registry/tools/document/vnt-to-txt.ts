import type { Tool } from "../../types";

export const vntToTxt: Tool = {
	id: "document/vnt-to-txt",
	slug: "vnt-to-txt",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"text/x-vnote",
			"text/vnote",
			"application/vnt",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["vnt"],
	},
	output: { ext: "txt", mime: "text/plain" },
	engines: ["extract:vnt-to-txt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Clean Universal Plain Text",
				explanation:
					"Decodes Quoted-Printable (multi-byte UTF-8, ISO-8859-1, EUC-KR) and Base64 encoded mobile memo files from Samsung S-Memo, Sony Ericsson, and Nokia phones. Unfolds folded lines and restores timestamps, note categories, and original line breaks into clean, human-readable text.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"VNT to TXT — Convert Samsung S-Memo (.vnt) to Plain Text Online | convrtr",
		h1: "Convert VNT Memo to Plain Text",
		intent:
			"Convert old Samsung S-Memo, Sony Ericsson, and Nokia .vnt memo files into readable plain text directly in your browser. Decodes quoted-printable gibberish and recovers old notes with zero server uploads.",
		faq: [
			{
				q: "Why do .vnt files look like gibberish in Notepad or Word?",
				a: "Older mobile phones encoded notes using the vNote 1.1 standard with Quoted-Printable transfer encoding (e.g., =E4=BD=A0=E5=A5=BD). When opened in standard text editors, these escape codes appear as raw hexadecimal symbols instead of actual letters and words.",
			},
			{
				q: "Which phone brands and apps create .vnt files?",
				a: "The .vnt (vNote) format was standard on Samsung Galaxy phones (S2, S3, S4, Note, Note II using Samsung Memo or S-Memo), Sony Ericsson Walkman/Cyber-shot phones, and Nokia Symbian/Series 40 devices.",
			},
			{
				q: "Does this support multi-note .vnt files and international characters?",
				a: "Yes! convrtr reconstructs multi-byte UTF-8 character sequences, accurately rendering accents, Cyrillic, Chinese, Japanese, Korean, Arabic, and emojis. If a backup contains multiple notes in one file, each note is cleanly separated.",
			},
			{
				q: "Are my personal notes and diary entries uploaded to any server?",
				a: "Never. Personal notes often contain private memories, phone numbers, or passwords. All parsing and decoding occurs entirely inside your web browser client. Not a single character is ever sent to the cloud.",
			},
		],
		related: ["document/vcf-to-csv", "document/mhtml-to-html"],
	},
};
