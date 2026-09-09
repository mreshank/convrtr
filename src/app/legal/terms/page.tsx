import type { Metadata } from "next";
import { terms } from "@/content/pages/terms";
import { LegalPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Terms — convrtr";
	const description = "The terms of service for convrtr.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/legal/terms` },
		openGraph: { title, description, url: `${SITE}/legal/terms` },
	};
}

export default function TermsPage() {
	return (
		<LegalPage
			title={terms.title}
			revised={terms.updated}
			sections={terms.sections}
		/>
	);
}
