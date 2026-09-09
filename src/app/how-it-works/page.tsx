import type { Metadata } from "next";
import { howItWorks } from "@/content/pages/how-it-works";
import { ArticlePage } from "@/design/templates";
import { SITE } from "@/lib/site";

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

export default function HowItWorksPage() {
	return (
		<ArticlePage
			title={howItWorks.title}
			dateline={howItWorks.updated}
			sections={howItWorks.sections}
		/>
	);
}
