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

export default function AboutPage() {
	return (
		<ArticlePage
			title={about.title}
			dateline={about.updated}
			sections={about.sections}
		/>
	);
}
