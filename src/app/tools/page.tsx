import type { Metadata } from "next";
import { ToolSearch } from "@/components/instrument/ToolSearch";
import { JsonLd } from "@/components/seo/JsonLd";
import { TOOLS } from "@/core/registry";
import { HubPage } from "@/design/templates";
import { buildToolsIndexJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";
import { toToolRow } from "./toolRow";

export function generateMetadata(): Metadata {
	const title = "All file conversion tools — convrtr";
	const description =
		"Browse every file conversion tool convrtr supports — images, audio, video, documents and data. Each one runs 100% in your browser; your files are never uploaded.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/tools` },
		openGraph: { title, description, url: `${SITE}/tools` },
	};
}

/**
 * Rows are derived from the live registry, not written by hand — every
 * tool another agent registers shows up here automatically, with no
 * change to this file.
 */
export default function ToolsIndexPage() {
	const rows = TOOLS.map(toToolRow);

	return (
		<>
			<JsonLd schema={buildToolsIndexJsonLd(TOOLS, `${SITE}/tools`)} />
			<HubPage
				breadcrumbs={[{ name: "Home", href: "/" }, { name: "All Tools" }]}
				title="All file conversion tools"
				lede="The full registry, searchable in one list — every tool for images, audio, video, documents and data, each running entirely in your browser."
				count={{
					value: rows.length,
					noun: rows.length === 1 ? "conversion" : "conversions",
				}}
			>
				<ToolSearch rows={rows} />
			</HubPage>
		</>
	);
}
