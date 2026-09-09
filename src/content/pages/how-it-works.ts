import type { ParagraphsPageContent } from "./types";

export const howItWorks: ParagraphsPageContent = {
	title: "How it works",
	updated: "9 September 2026",
	paragraphs: [
		`Drop a file, and the browser reads it into memory. Nothing is sent
		anywhere before, during, or after this step — this site is a static
		export (next.config.ts: output: "export"), so there is no server for
		an upload to reach even if one were attempted.`,
		`A Web Worker loads the WebAssembly build for that file's format —
		dropping a .heic photo, for instance, loads libheif-js's wasm-bundle —
		and decodes and re-encodes it off the page's main thread, so the tab
		stays responsive while a large file converts.`,
		`For very large files, scratch bytes are written to the browser's
		Origin Private File System rather than held only in memory. convrtr
		deletes its own scratch files the moment a conversion finishes, and
		sweeps any left behind by a crashed or force-quit tab the next time
		the app loads (src/components/ServiceWorkerRegistration.tsx).`,
		`The finished file is handed back as a download from the same tab —
		never uploaded, because nothing here is capable of uploading it.`,
		`A generated service worker (scripts/generate-sw.mjs) precaches the
		app shell so the tools keep working with the network switched off
		after a first visit; that offline behaviour is additive, not required
		— every conversion already works without it.`,
		`None of the above is asserted only in prose. e2e/network-guard.ts
		watches every request the running page makes while it converts a real
		file, and fails the build if a single one carries file bytes off the
		device.`,
	],
};
