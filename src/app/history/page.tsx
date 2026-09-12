import type { Metadata } from "next";
import { HistoryClient } from "@/components/history/HistoryClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { ConverterPage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Conversion History & Audit Log — convrtr";
	const description =
		"Private in-browser conversion audit log. View past conversions, processing times, byte savings, and export CSV reports.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/history` },
		openGraph: {
			title,
			description,
			url: `${SITE}/history`,
		},
		robots: {
			index: false,
			follow: false,
		},
	};
}

export default function HistoryPage() {
	return (
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Conversion History & Audit Log — convrtr",
					description:
						"Private in-browser conversion audit log. View past conversions, processing times, byte savings, and export CSV reports.",
					url: `${SITE}/history`,
					breadcrumbs: [{ name: "History", url: `${SITE}/history` }],
				})}
			/>
			<ConverterPage
				eyebrow="AUDIT TRAIL // 30-DAY WORKSPACE METRICS"
				title="Conversion History"
				lede="Review past local conversions, compression savings, and duration metrics. Converted files are processed 100% inside your browser and never stored on any server."
			>
				<HistoryClient />
			</ConverterPage>
		</>
	);
}
