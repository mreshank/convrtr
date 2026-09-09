import type { Metadata } from "next";
import { ArticlePage } from "@/design/templates";
import { SITE } from "@/lib/site";

const DATELINE = "9 September 2026";

// Every sentence here names the file that makes it true, the same
// discipline `src/app/home-content.ts` documents for the home page's own
// copy — and the same reason two of its claims were rewritten after
// shipping false ("never a proprietary format", "No install"). Nothing
// below restates either mistake.
const PARAGRAPHS = [
	`convrtr converts files entirely inside your own browser. There is no
	server in the loop: next.config.ts builds this site with
	output: "export", a fully static export with no endpoint for a file to
	be uploaded to, even by accident.`,
	`Every tool runs a WebAssembly build of a real, named open-source
	engine — MozJPEG, libwebp, libavif, libjxl, libheif, Oxipng, FFmpeg and
	others — the same code a native app would call, running in a Web
	Worker instead of on a server. /legal/licences lists them by name,
	derived from the packages actually installed rather than typed out by
	hand.`,
	`The source is open. This repository is licensed under the GNU Affero
	General Public License v3.0 — see LICENSE in the repository root.`,
	`convrtr is a genuinely installable PWA (src/app/manifest.ts declares
	display: "standalone" with full icon sets), but installing it is
	optional: every conversion already works in the tab you have open,
	whether or not you ever install anything.`,
	`For exactly what does and does not happen to a file you drop onto this
	site, see /privacy and, for the formal version, /legal/privacy-policy.`,
];

export function generateMetadata(): Metadata {
	const title = "About — convrtr";
	const description =
		"What convrtr is, what it runs on your device, and where its source lives.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/about` },
		openGraph: { title, description, url: `${SITE}/about` },
	};
}

// Paragraphs above are wrapped for source readability; this collapses the
// resulting whitespace back to single spaces before it reaches the DOM.
function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

export default function AboutPage() {
	return (
		<ArticlePage title="About" dateline={DATELINE}>
			<div className="flex flex-col gap-4">
				{PARAGRAPHS.map((paragraph, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
					<p key={index}>{clean(paragraph)}</p>
				))}
			</div>
		</ArticlePage>
	);
}
