import type { Metadata } from "next";
import { privacy } from "@/content/pages/privacy";
import { ArticlePage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Privacy — convrtr";
	const description =
		"convrtr transmits no file you convert. What that claim rests on, and the test that checks it.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/privacy` },
		openGraph: { title, description, url: `${SITE}/privacy` },
	};
}

export default function PrivacyPage() {
	return (
		<ArticlePage
			title={privacy.title}
			dateline={`Revised ${privacy.updated}`}
			sections={privacy.sections}
		/>
	);
}
