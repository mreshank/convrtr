import type { SectionedPageContent } from "./types";

export const feedback: SectionedPageContent = {
	title: "Feedback",
	updated: "17 September 2026",
	sections: [
		{
			eyebrow: "USER FEEDBACK",
			lead: "Help shape the future of local conversion.",
			cont: "Every suggestion informs the engineering roadmap.",
			paragraphs: [
				`convrtr was built to free users from cloud file converters that impose
				paywalls, daily limits, and privacy compromises. Your feedback guides which
				formats, optimizations, and workflows we prioritize next.`,
			],
		},
		{
			eyebrow: "FORMAT & ENGINE PROPOSALS",
			lead: "Missing a critical file format?",
			cont: "Tell us which legacy or modern format you need.",
			paragraphs: [
				`We have expanded convrtr across 50 development waves to 200 dedicated tools
				and 147 local engines. If your workflow requires an exotic raster, 3D asset,
				audio tracker, document format, or vector structure, tell us below or open an
				issue at https://github.com/mreshank/convrtr/issues.`,
			],
		},
		{
			eyebrow: "CHROME EXTENSION REVIEWS",
			lead: "Rate convrtr on the Chrome Web Store.",
			cont: "Support independent open-source developer tooling.",
			paragraphs: [
				`If convrtr saves you time, consider leaving a rating and review on the
				official Chrome Web Store page. Reviews help more designers, developers,
				and archivists discover private, local-first file processing.`,
			],
		},
	],
};
