import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { privacyPolicy } from "@/content/pages/privacy-policy";
import { LegalPage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Privacy Policy — convrtr";
	const description = "The formal privacy policy for convrtr.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/legal/privacy-policy` },
		openGraph: { title, description, url: `${SITE}/legal/privacy-policy` },
	};
}

export default function PrivacyPolicyPage() {
	return (
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Privacy Policy — convrtr",
					description: "The formal privacy policy for convrtr.",
					url: `${SITE}/legal/privacy-policy`,
					breadcrumbs: [
						{ name: "Privacy Policy", url: `${SITE}/legal/privacy-policy` },
					],
				})}
			/>
			<LegalPage
				title={privacyPolicy.title}
				revised={privacyPolicy.updated}
				sections={privacyPolicy.sections}
			/>
		</>
	);
}
