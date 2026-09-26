import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { COMPARISONS } from "@/content/compare/registry";
import { HubPage } from "@/design/templates";
import { buildCompareIndexJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Format vs Format Technical Comparisons — convrtr";
	const description =
		"Head-to-head technical comparisons of file formats — compression, bit depth, transparency, browser support and quality. Know what changes before you convert.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/compare` },
		openGraph: { title, description, url: `${SITE}/compare` },
	};
}

export default function CompareIndexPage() {
	return (
		<>
			<JsonLd
				schema={buildCompareIndexJsonLd(COMPARISONS, `${SITE}/compare`)}
			/>
			<HubPage
				breadcrumbs={[
					{ name: "Home", href: "/" },
					{ name: "Format Comparisons" },
				]}
				title="Format Comparisons"
				lede="Head-to-head technical comparisons of image, audio, video and document formats — compression, quality and compatibility, so you know what changes before you convert."
				count={{
					value: COMPARISONS.length,
					noun: "comparisons",
				}}
				sections={[
					{
						heading: "HIGH-EFFICIENCY COMPARISONS",
						items: COMPARISONS.map((c) => ({
							href: `/compare/${c.slug}`,
							title: `${c.formatA} vs ${c.formatB}`,
							description: c.summary,
							meta: c.category.toUpperCase(),
						})),
					},
				]}
			/>
		</>
	);
}
