import type { Metadata } from "next";
import { about } from "@/content/pages/about";
import { ArticlePage } from "@/design/templates";
import { SITE } from "@/lib/site";

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

// Paragraphs in @/content/pages/about are wrapped for source readability;
// this collapses the resulting whitespace back to single spaces before it
// reaches the DOM.
function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

export default function AboutPage() {
	return (
		<ArticlePage title={about.title} dateline={about.updated}>
			<div className="flex flex-col gap-4">
				{about.paragraphs.map((paragraph, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
					<p key={index}>{clean(paragraph)}</p>
				))}
			</div>
		</ArticlePage>
	);
}
