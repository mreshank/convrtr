import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { contact } from "@/content/pages/contact";
import { ArticlePage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Contact — convrtr";
	const description =
		"Get in touch with the convrtr project maintainer, report bugs, suggest file formats, or submit security inquiries.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/contact` },
		openGraph: { title, description, url: `${SITE}/contact` },
	};
}

export default function ContactPage() {
	return (
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Contact — convrtr",
					description:
						"Get in touch with the convrtr project maintainer, report bugs, suggest file formats, or submit security inquiries.",
					url: `${SITE}/contact`,
					breadcrumbs: [{ name: "Contact", url: `${SITE}/contact` }],
					type: "ContactPage",
				})}
			/>
			<ArticlePage
				title={contact.title}
				dateline={contact.updated}
				sections={contact.sections}
			/>
		</>
	);
}
