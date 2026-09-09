import type { SectionedPageContent } from "./types";

/**
 * Spec §5.4: this page is the *argument*, not the formal document --
 * /legal/privacy-policy is that. Every claim here names the file that
 * makes it true, and none of them may contradict the formal document.
 *
 * Each section's `lead`/`cont` headline is drawn from its own paragraph --
 * the paragraph's opening clause, split in two -- and the full paragraph
 * stays intact, unabridged, right beneath it. No section states a fact its
 * own paragraph does not already state.
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
				`convrtr does not collect, store, or transmit the files you convert.
				Every conversion happens locally, inside your own browser. Nothing you
				drop onto this site is ever uploaded — to us, or to anyone else.`,
			],
		},
		{
			eyebrow: "STATIC EXPORT",
			lead: "Not a promise made only in prose.",
			cont: "There is no server for a conversion to reach.",
			paragraphs: [
				`This is not a promise made in prose. This site is a static export
				(next.config.ts: output: "export"); there is no server for a
				conversion to reach even if something tried to reach one.`,
			],
		},
		{
			eyebrow: "NETWORK GUARD",
			lead: "Checked automatically, every time this project ships.",
			cont: "e2e/network-guard.ts watches every request.",
			paragraphs: [
				`It is checked automatically, every time this project ships.
				e2e/network-guard.ts watches every network request the running page
				makes while it converts a real file, and fails the build if a single
				one is cross-origin, carries a body, or leaves by any method other
				than a plain GET or HEAD. The check proves itself, too: a companion
				test in the same suite deliberately fires a real cross-origin beacon
				request first and asserts the guard actually flags it as suspicious —
				so a silently broken guard would fail loudly, not pass by accident.`,
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
				`No analytics, no telemetry, no cookies. package.json lists every
				dependency this product ships in full; none of them is an analytics
				or tracking library, and no code anywhere in this repository sets a
				cookie.`,
			],
		},
		{
			eyebrow: "ON YOUR DEVICE",
			lead: "A small amount of state stays on your device.",
			cont: "Neither ever leaves the device.",
			paragraphs: [
				`A small amount of state stays on your device and nowhere else: one
				flag in localStorage remembering that you've already seen a one-time
				notice about very large downloads, and scratch copies of the file
				you're actively converting, held in your browser's Origin Private
				File System until the conversion finishes. Neither ever leaves the
				device.`,
			],
		},
		{
			eyebrow: "FORMAL VERSION",
			lead: "The formal version of this page.",
			cont: "See /legal/privacy-policy.",
			paragraphs: [
				`For the formal version of this page — the one written for a
				compliance reviewer rather than a visitor — see
				/legal/privacy-policy. It says the same thing this page does, in the
				more conventional shape that document is expected to take.`,
			],
		},
	],
};
