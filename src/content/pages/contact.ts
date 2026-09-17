import type { SectionedPageContent } from "./types";

export const contact: SectionedPageContent = {
	title: "Contact",
	updated: "17 September 2026",
	sections: [
		{
			eyebrow: "DIRECT INQUIRIES",
			lead: "Reach the maintainer directly.",
			cont: "Open channels for project questions and discussions.",
			paragraphs: [
				`For general questions, collaborations, or private security notices,
				contact the project maintainer directly at contact@mreshank.com or
				connect via GitHub at github.com/mreshank.`,
			],
		},
		{
			eyebrow: "ISSUE TRACKER",
			lead: "Public bug reports and technical issues.",
			cont: "Tracked transparently on GitHub.",
			paragraphs: [
				`All bug reports, conversion errors, and feature proposals are
				tracked transparently in the public repository issue tracker at
				https://github.com/mreshank/convrtr/issues. Please include the input
				format, browser version, and error details when opening an issue.`,
			],
		},
		{
			eyebrow: "FORMAT PROPOSALS",
			lead: "Suggest new formats and codecs.",
			cont: "Expanding client-side offline coverage.",
			paragraphs: [
				`convrtr supports 200 dedicated tools across 147 local engines. If you
				have a legacy file format, retro gaming asset, proprietary document,
				or modern codec that should run client-side without cloud dependencies,
				open a format request on GitHub or use our feedback portal.`,
			],
		},
		{
			eyebrow: "SECURITY DISCLOSURES",
			lead: "Vulnerability reporting and security audits.",
			cont: "100% on-device architecture.",
			paragraphs: [
				`Because convrtr executes 100% locally via WebAssembly, WebCodecs, and
				Web Workers with output: "export", files are never uploaded to any
				remote server. If you discover an issue in our isolated execution
				sandbox, please submit a responsible disclosure report via email.`,
			],
		},
	],
};
