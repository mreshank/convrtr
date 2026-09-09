import type { SectionedPageContent } from "./types";

// Each section's `lead`/`cont` headline is drawn from its own paragraph --
// the paragraph's opening clause, split in two, or a short claim the
// paragraph already makes -- and the full paragraph stays intact,
// unabridged, right beneath it. No section states a fact its own paragraph
// does not already state.
export const howItWorks: SectionedPageContent = {
	title: "How it works",
	updated: "9 September 2026",
	sections: [
		{
			eyebrow: "STATIC EXPORT",
			lead: "Drop a file, and the browser reads it into memory.",
			cont: "Nothing is sent anywhere, ever.",
			paragraphs: [
				`Drop a file, and the browser reads it into memory. Nothing is sent
				anywhere before, during, or after this step — this site is a static
				export (next.config.ts: output: "export"), so there is no server for
				an upload to reach even if one were attempted.`,
			],
		},
		{
			eyebrow: "WEB WORKER",
			lead: "A Web Worker loads the WebAssembly build for that format.",
			cont: "So the tab stays responsive.",
			paragraphs: [
				`A Web Worker loads the WebAssembly build for that file's format —
				dropping a .heic photo, for instance, loads libheif-js's wasm-bundle —
				and decodes and re-encodes it off the page's main thread, so the tab
				stays responsive while a large file converts.`,
			],
		},
		{
			eyebrow: "SCRATCH FILES",
			lead: "Very large files use the file system, not memory alone.",
			cont: "convrtr deletes its own scratch files when done.",
			paragraphs: [
				`For very large files, scratch bytes are written to the browser's
				Origin Private File System rather than held only in memory. convrtr
				deletes its own scratch files the moment a conversion finishes, and
				sweeps any left behind by a crashed or force-quit tab the next time
				the app loads (src/components/ServiceWorkerRegistration.tsx).`,
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
				`A generated service worker (scripts/generate-sw.mjs) precaches the
				app shell so the tools keep working with the network switched off
				after a first visit; that offline behaviour is additive, not required
				— every conversion already works without it.`,
			],
		},
		{
			eyebrow: "NETWORK GUARD",
			lead: "None of this is asserted only in prose.",
			cont: "e2e/network-guard.ts checks every request.",
			paragraphs: [
				`None of the above is asserted only in prose. e2e/network-guard.ts
				watches every request the running page makes while it converts a real
				file, and fails the build if a single one carries file bytes off the
				device.`,
			],
		},
	],
};
