import type { SectionedPageContent } from "./types";

export const thankYou: SectionedPageContent = {
	title: "Thank You",
	updated: "17 September 2026",
	sections: [
		{
			eyebrow: "FEEDBACK RECEIVED",
			lead: "Thank you for contributing to convrtr.",
			cont: "Your feedback has been logged.",
			paragraphs: [
				`We appreciate your time and input. Community feedback is how convrtr
				grew from a handful of raster tools into a 200-tool universal converter
				covering audio trackers, vector blueprints, legacy office archives, and
				modern web codecs.`,
			],
		},
		{
			eyebrow: "NEXT STEPS",
			lead: "Continue converting with zero limits.",
			cont: "200 standalone tools running 100% in your browser.",
			paragraphs: [
				`Ready to get back to work? Explore all available converters on the
				tools directory or start a conversion immediately on the home studio.`,
			],
		},
	],
};
