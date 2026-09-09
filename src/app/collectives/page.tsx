import type { Metadata } from "next";
import { COLLECTIVES } from "@/content/collectives/registry";
import { HubPage } from "@/design/templates";
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

export default function CollectivesIndexPage() {
	const collectives = COLLECTIVES;

	return (
		<HubPage
			title="Collectives"
			lede="Curated sets of tools built around a reason, not a file type."
			count={{
				value: collectives.length,
				noun: collectives.length === 1 ? "collective" : "collectives",
			}}
			sections={[
				{
					items: collectives.map((collective) => ({
						href: `/collectives/${collective.slug}`,
						title: collective.title,
						meta: `${collective.toolIds.length} ${
							collective.toolIds.length === 1 ? "tool" : "tools"
						}`,
						description: collective.why,
					})),
				},
			]}
		/>
	);
}
