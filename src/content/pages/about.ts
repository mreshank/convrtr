import type { SectionedPageContent } from "./types";

// Every sentence here names the file that makes it true, the same
// discipline `src/app/home-content.ts` documents for the home page's own
// copy — and the same reason two of its claims were rewritten after
// shipping false ("never a proprietary format", "No install"). Nothing
// below restates either mistake.
//
// Each section's `lead`/`cont` headline is drawn from its own paragraph --
// the paragraph's opening clause, split in two -- and the full paragraph
// stays intact, unabridged, right beneath it. No section states a fact its
// own paragraph does not already state.
export const about: SectionedPageContent = {
	title: "About",
	updated: "9 September 2026",
	sections: [
		{
			eyebrow: "STATIC EXPORT",
			lead: "Converts files entirely inside your own browser.",
			cont: "There is no server in the loop.",
			paragraphs: [
				`convrtr converts files entirely inside your own browser. There is no
				server in the loop: next.config.ts builds this site with
				output: "export", a fully static export with no endpoint for a file to
				be uploaded to, even by accident.`,
			],
		},
		{
			eyebrow: "WEB WORKER",
			lead: "Every tool runs a real, named open-source engine.",
			cont: "The same code a native app would call.",
			paragraphs: [
				`Every tool runs a WebAssembly build of a real, named open-source
				engine — MozJPEG, libwebp, libavif, libjxl, libheif, Oxipng, FFmpeg and
				others — the same code a native app would call, running in a Web
				Worker instead of on a server. /legal/licences lists them by name,
				derived from the packages actually installed rather than typed out by
				hand.`,
			],
		},
		{
			eyebrow: "OPEN SOURCE",
			lead: "The source is open.",
			cont: "See LICENSE in the repository root.",
			paragraphs: [
				`The source is open. This repository is licensed under the GNU Affero
				General Public License v3.0 — see LICENSE in the repository root.`,
			],
		},
		{
			eyebrow: "INSTALLABLE PWA",
			lead: "A genuinely installable PWA.",
			cont: "But installing it is optional.",
			paragraphs: [
				`convrtr is a genuinely installable PWA (src/app/manifest.ts declares
				display: "standalone" with full icon sets), but installing it is
				optional: every conversion already works in the tab you have open,
				whether or not you ever install anything.`,
			],
		},
		{
			eyebrow: "PRIVACY",
			lead: "What happens to a file you drop here.",
			cont: "See /privacy for the exact answer.",
			paragraphs: [
				`For exactly what does and does not happen to a file you drop onto this
				site, see /privacy and, for the formal version, /legal/privacy-policy.`,
			],
		},
	],
};
