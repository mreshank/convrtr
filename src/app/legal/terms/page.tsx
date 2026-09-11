import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { terms } from "@/content/pages/terms";
import { LegalPage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
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
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Terms — convrtr",
					description: "The terms of service for convrtr.",
					url: `${SITE}/legal/terms`,
					breadcrumbs: [{ name: "Terms of Service", url: `${SITE}/legal/terms` }],
				})}
			/>
			<LegalPage
				title={terms.title}
				revised={terms.updated}
				sections={terms.sections}
			/>
		</>
	);
}
