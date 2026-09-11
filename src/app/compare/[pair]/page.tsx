import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonView } from "@/components/compare/ComparisonView";
import { COMPARISONS, getComparison } from "@/content/compare/registry";
import { ConverterPage } from "@/design/templates";
import { buildComparisonJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
	return COMPARISONS.map((c) => ({ pair: c.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ pair: string }>;
}): Promise<Metadata> {
	const { pair } = await params;
	const comparison = getComparison(pair);
	if (!comparison) return {};

	return {
		title: `${comparison.title} — convrtr`,
		description: comparison.description,
		alternates: { canonical: `${SITE}/compare/${comparison.slug}` },
		openGraph: {
			title: comparison.title,
			description: comparison.description,
			url: `${SITE}/compare/${comparison.slug}`,
		},
	};
}

export default async function ComparisonDetailPage({
	params,
}: {
	params: Promise<{ pair: string }>;
}) {
	const { pair } = await params;
	const comparison = getComparison(pair);
	if (!comparison) notFound();

	const jsonLd = buildComparisonJsonLd(
		comparison.title,
		comparison.description,
		`${SITE}/compare/${comparison.slug}`,
	);

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<ConverterPage
				eyebrow={`FORMAT ANALYSIS // ${comparison.category.toUpperCase()}`}
				title={comparison.title}
				lede={comparison.description}
			>
				<ComparisonView comparison={comparison} />
			</ConverterPage>
		</>
	);
}
