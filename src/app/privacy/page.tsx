import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { privacy } from "@/content/pages/privacy";
import { ArticlePage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
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
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Privacy — convrtr",
					description:
						"convrtr transmits no file you convert. What that claim rests on, and the test that checks it.",
					url: `${SITE}/privacy`,
					breadcrumbs: [{ name: "Privacy", url: `${SITE}/privacy` }],
				})}
			/>
			<ArticlePage
				title={privacy.title}
				dateline={`Revised ${privacy.updated}`}
				sections={privacy.sections}
			/>
		</>
	);
}
