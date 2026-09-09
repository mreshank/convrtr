import type { Metadata } from "next";
import Link from "next/link";
import { COLLECTIVES } from "@/content/collectives/registry";
import { HubPage } from "@/design/templates";

const SITE = "https://convrtr.mreshank.com";

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
		>
			<ul className="flex flex-col gap-6">
				{collectives.map((collective) => (
					<li key={collective.slug} className="flex flex-col gap-1">
						<Link
							href={`/collectives/${collective.slug}`}
							className="text-[18px] underline"
						>
							{collective.title}
						</Link>
						<p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
							{collective.why}
						</p>
					</li>
				))}
			</ul>
		</HubPage>
	);
}
