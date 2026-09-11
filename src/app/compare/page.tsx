import type { Metadata } from "next";
import { COMPARISONS } from "@/content/compare/registry";
import { HubPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Format vs Format Technical Comparisons — convrtr";
	const description =
		"Direct architectural comparisons between file formats. Compare compression ratios, bit depths, browser support, and quality metrics.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/compare` },
		openGraph: { title, description, url: `${SITE}/compare` },
	};
}

export default function CompareIndexPage() {
	return (
		<HubPage
			title="Format Comparisons"
			lede="Direct head-to-head technical comparisons between image, audio, and document formats."
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
	);
}
