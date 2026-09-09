import type { SectionedPageContent } from "./types";

/**
 * Spec §5.4: this page is the *argument*, not the formal document --
 * /legal/privacy-policy is that. Every claim here names the file that
 * makes it true, and none of them may contradict the formal document.
 *
 * Each section's `lead`/`cont` headline carries the claim; the paragraph
 * beneath it carries the evidence -- the file, dependency or guard that
 * makes the claim checkable -- rather than repeating the headline back in
 * prose.
 *
 * The safety rule is unchanged and is the point: every headline claim is
 * backed on this page, by its own paragraph wherever it can be. One cannot
 * be, and it is worth naming rather than leaving for a reader to notice --
 * the opening section's "every conversion happens locally, in your
 * browser". What proves that is the static export and the network guard,
 * which are the two sections directly beneath it. Any future edit that
 * moves or deletes either of those leaves the opening claim standing on
 * nothing.
 */
export const privacy: SectionedPageContent = {
	title: "Privacy",
	updated: "9 September 2026",
	sections: [
		{
			eyebrow: "LOCAL",
			lead: "convrtr does not collect, store, or transmit your files.",
			cont: "Every conversion happens locally, in your browser.",
			paragraphs: [
				`Nothing you drop onto this site is ever uploaded — to us, or to anyone
				else.`,
			],
		},
		{
			eyebrow: "STATIC EXPORT",
			lead: "Not a promise made only in prose.",
			cont: "There is no server for a conversion to reach.",
			paragraphs: [
				`This site is a static export (next.config.ts: output: "export"), so
				nothing is there to reach even if something tried.`,
			],
		},
		{
			eyebrow: "NETWORK GUARD",
			lead: "Checked automatically, every time this project ships.",
			cont: "e2e/network-guard.ts watches every request.",
			paragraphs: [
				`It watches while the running page converts a real file, and fails the
				build if a single request is cross-origin, carries a body, or leaves
				by any method other than a plain GET or HEAD. The check proves itself,
				too: a companion test in the same suite deliberately fires a real
				cross-origin beacon request first and asserts the guard actually flags
				it as suspicious — so a silently broken guard would fail loudly, not
				pass by accident.`,
			],
		},
		{
			eyebrow: "NO ACCOUNTS",
			lead: "No accounts.",
			cont: "Nowhere to sign up, nothing to sign in to.",
			paragraphs: [
				`No accounts. There is nowhere to sign up, and nothing to sign in to.`,
			],
		},
		{
			eyebrow: "NO COOKIES",
			lead: "No analytics, no telemetry, no cookies.",
			cont: "package.json lists every dependency in full.",
			paragraphs: [
				`None of those dependencies is an analytics or tracking library, and no
				code anywhere in this repository sets a cookie.`,
			],
		},
		{
			eyebrow: "ON YOUR DEVICE",
			lead: "A small amount of state stays on your device.",
			cont: "Neither ever leaves the device.",
			paragraphs: [
				`That state is one flag in localStorage remembering that you've already
				seen a one-time notice about very large downloads, plus scratch copies
				of the file you're actively converting, held in your browser's Origin
				Private File System until the conversion finishes — neither leaves the
				device.`,
			],
		},
		{
			eyebrow: "FORMAL VERSION",
			lead: "The formal version of this page.",
			cont: "See /legal/privacy-policy.",
			paragraphs: [
				`It is written for a compliance reviewer rather than a visitor, and
				says the same thing this page does, in the more conventional shape
				that document is expected to take.`,
			],
		},
	],
};
