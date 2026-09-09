import type { SectionedPageContent } from "./types";

// Each section's `lead`/`cont` headline carries the claim; the paragraph
// beneath it carries the evidence -- the file, engine or guard that makes
// the claim checkable -- rather than repeating the headline back in prose.
// The safety rule is unchanged and is the point: no headline states a fact
// its own section's paragraph does not support.
export const howItWorks: SectionedPageContent = {
	title: "How it works",
	updated: "9 September 2026",
	sections: [
		{
			eyebrow: "STATIC EXPORT",
			lead: "Drop a file, and the browser reads it into memory.",
			cont: "Nothing is sent anywhere, ever.",
			paragraphs: [
				`Not before this step, not during it, not after — this site is a static
				export (next.config.ts: output: "export"), so there is no server for
				an upload to reach even if one were attempted.`,
			],
		},
		{
			eyebrow: "WEB WORKER",
			lead: "A Web Worker loads the WebAssembly build for that format.",
			cont: "So the tab stays responsive.",
			paragraphs: [
				`Dropping a .heic photo, for instance, loads libheif-js's wasm-bundle,
				and the decode and re-encode both happen off the page's main thread,
				however large the file is.`,
			],
		},
		{
			eyebrow: "SCRATCH FILES",
			lead: "Very large files use the file system, not memory alone.",
			cont: "convrtr deletes its own scratch files when done.",
			paragraphs: [
				`The scratch bytes go to the browser's Origin Private File System, and
				are deleted the moment a conversion finishes; any left behind by a
				crashed or force-quit tab are swept the next time the app loads
				(src/components/ServiceWorkerRegistration.tsx).`,
			],
		},
		{
			eyebrow: "DOWNLOAD",
			lead: "The finished file comes back as a download.",
			cont: "Never uploaded, because nothing here can.",
			paragraphs: [
				`The finished file is handed back as a download from the same tab —
				never uploaded, because nothing here is capable of uploading it.`,
			],
		},
		{
			eyebrow: "SERVICE WORKER",
			lead: "A generated service worker precaches the app shell.",
			cont: "Offline is additive, not required.",
			paragraphs: [
				`scripts/generate-sw.mjs generates it, and after a first visit the
				tools keep working with the network switched off. Every conversion
				already works without that, though.`,
			],
		},
		{
			eyebrow: "NETWORK GUARD",
			lead: "None of this is asserted only in prose.",
			cont: "e2e/network-guard.ts checks every request.",
			paragraphs: [
				`It watches while the running page converts a real file, and fails the
				build if a single request carries file bytes off the device.`,
			],
		},
	],
};
