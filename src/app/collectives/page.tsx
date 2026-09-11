import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { COLLECTIVES } from "@/content/collectives/registry";
import { getTool } from "@/core/registry";
import { type CollectiveGridItem, HubPage } from "@/design/templates";
import { buildCollectivesIndexJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Collectives — convrtr";
	const description =
		"Curated sets of tools built around a reason, not a file type -- everything for one job.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/collectives` },
		openGraph: { title, description, url: `${SITE}/collectives` },
	};
}

const COLLECTIVE_GRID_ITEMS: CollectiveGridItem[] = COLLECTIVES.map(
	(collective) => ({
		slug: collective.slug,
		title: collective.title,
		why: collective.why,
		hasDemo:
			collective.slug === "podcast-kit" || collective.slug === "strip-metadata",
		tools: collective.toolIds.flatMap((id) => {
			const tool = getTool(id);
			return tool
				? [
						{
							id: tool.id,
							name: tool.seo.h1,
							fromExt: tool.accept.ext[0] ?? tool.output.ext,
							toExt: tool.output.ext,
							href: `/${tool.id}`,
						},
					]
				: [];
		}),
	}),
);

export default function CollectivesIndexPage() {
	return (
		<>
			<JsonLd
				schema={buildCollectivesIndexJsonLd(
					COLLECTIVES,
					`${SITE}/collectives`,
				)}
			/>
			<HubPage
				title="Collectives"
				lede="Curated sets of tools built around a reason, not a file type."
				count={{
					value: COLLECTIVE_GRID_ITEMS.length,
					noun: COLLECTIVE_GRID_ITEMS.length === 1 ? "collective" : "collectives",
				}}
				collectives={COLLECTIVE_GRID_ITEMS}
			/>
		</>
	);
}
