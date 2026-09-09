import type { SectionedPageContent } from "./types";

/**
 * Spec §5.4: the formal counterpart to /privacy's plain-language argument.
 * Same facts, conventional shape. Where a real policy needs a jurisdiction,
 * an entity or an address, this says so plainly rather than inventing one —
 * see the final section.
 *
 * `lead` is each section's pre-existing heading, unchanged. `cont` is a
 * short clause already present, verbatim or near-verbatim, in that same
 * section's own `paragraphs` below it — never a new claim. No `eyebrow`:
 * the heading already names the topic, and a mono label above it would
 * relabel the same word twice.
 */
export const privacyPolicy: SectionedPageContent = {
	title: "Privacy Policy",
	updated: "9 September 2026",
	sections: [
		{
			lead: "Overview",
			cont: "It doesn't, because it can't.",
			paragraphs: [
				`This Privacy Policy describes how convrtr ("the Service")
				handles information. The short answer: it doesn't, because it
				can't — no part of the Service transmits, stores, or has access to
				the files you process with it.`,
			],
		},
		{
			lead: "Information We Collect",
			cont: "None.",
			paragraphs: [
				`None. convrtr does not operate a server that stores, logs, or
				otherwise processes the content of any file you convert. The
				Service is distributed as a static site (next.config.ts:
				output: "export"); there is no request path by which a converted
				file, or information about it, could reach us.`,
			],
		},
		{
			lead: "Local Device Storage",
			cont: "Never on ours.",
			paragraphs: [
				`convrtr stores a small amount of state on your own device,
				never on ours: a single flag in localStorage marking that you have
				acknowledged a notice about large downloads, and temporary scratch
				data in your browser's Origin Private File System while a
				conversion is in progress. Both are ordinary browser storage and
				are never transmitted.`,
			],
		},
		{
			lead: "Cookies and Tracking",
			cont: "None of any kind.",
			paragraphs: [
				`The Service does not set cookies and does not use analytics,
				advertising, or tracking technology of any kind.`,
			],
		},
		{
			lead: "Third Parties",
			cont: "None receive your files.",
			paragraphs: [
				`None receive your files or any data about them. Every
				conversion is performed by open-source software running inside
				your own browser; see /legal/licences for the exact engines and
				the licence each one carries.`,
			],
		},
		{
			lead: "Children's Privacy",
			cont: "None collected from anyone.",
			paragraphs: [
				`Because the Service collects no personal information from
				anyone, it collects none from children either.`,
			],
		},
		{
			lead: "Changes to This Policy",
			cont: "The revision date reflects the last change.",
			paragraphs: [
				`The revision date above reflects the last change. Any future
				change that would make this document less true of the code would
				require the code to become less private first, not the reverse.`,
			],
		},
		{
			lead: "Governing Law and Contact",
			cont: "PLACEHOLDER.",
			paragraphs: [
				`PLACEHOLDER — pending the project owner's input. A privacy
				policy conventionally names a controlling jurisdiction and a legal
				entity or address a visitor can contact with a request. Neither is
				filled in here: inventing one would misstate who is legally
				responsible for this Service. Until this section is completed, use
				the GitHub issue tracker linked in this site's footer to reach the
				maintainer.`,
			],
		},
	],
};
