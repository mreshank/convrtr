import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { support } from "@/content/pages/support";
import { ArticlePage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Support — convrtr";
	const description =
		"Support documentation, browser compatibility guides, offline WebAssembly execution details, and troubleshooting for convrtr.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/support` },
		openGraph: { title, description, url: `${SITE}/support` },
	};
}

import { SupportClient } from "./SupportClient";

export default function SupportPage() {
	return (
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Support — convrtr",
					description:
						"Support documentation, browser compatibility guides, offline WebAssembly execution details, and troubleshooting for convrtr.",
					url: `${SITE}/support`,
					breadcrumbs: [{ name: "Support", url: `${SITE}/support` }],
					type: "ContactPage",
				})}
			/>
			<div className="flex flex-col">
				<ArticlePage
					breadcrumbs={[{ name: "Home", href: "/" }, { name: "Support" }]}
					title={support.title}
					dateline={support.updated}
					sections={support.sections}
				/>
				<div className="px-4 pb-16">
					<SupportClient />
				</div>
			</div>
		</>
	);
}
