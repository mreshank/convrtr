import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { extensionContent } from "@/content/pages/extension";
import { ArticlePage } from "@/design/templates";
import { buildExtensionJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Chrome Extension — convrtr";
	const description =
		"Convert web media, documents, and local files directly in Chrome Side Panel using client-side WebAssembly with zero server uploads.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/extension` },
		openGraph: { title, description, url: `${SITE}/extension` },
	};
}

export default function ExtensionPage() {
	return (
		<>
			<JsonLd schema={buildExtensionJsonLd(`${SITE}/extension`)} />
			<ArticlePage
				breadcrumbs={[{ name: "Home", href: "/" }, { name: "Extension" }]}
				title={extensionContent.title}
				dateline={extensionContent.updated}
				sections={extensionContent.sections}
			/>
		</>
	);
}
