import type { Metadata } from "next";
import { ArticlePage } from "@/design/templates";

const SITE = "https://convrtr.mreshank.com";
const DATELINE = "9 September 2026";

const PARAGRAPHS = [
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
];

export function generateMetadata(): Metadata {
	const title = "How it works — convrtr";
	const description =
		"The mechanics behind converting a file in the browser: workers, WebAssembly engines, and a network guard that checks the claim.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/how-it-works` },
		openGraph: { title, description, url: `${SITE}/how-it-works` },
	};
}

function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

export default function HowItWorksPage() {
	return (
		<ArticlePage title="How it works" dateline={DATELINE}>
			<div className="flex flex-col gap-4">
				{PARAGRAPHS.map((paragraph, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
					<p key={index}>{clean(paragraph)}</p>
				))}
			</div>
		</ArticlePage>
	);
}
