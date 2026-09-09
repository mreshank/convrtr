import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolTable } from "@/app/tools/ToolTable";
import { toToolRow } from "@/app/tools/toolRow";
import { COLLECTIVES, getCollective } from "@/content/collectives/registry";
import { getTool } from "@/core/registry";
import { HubPage } from "@/design/templates";

const SITE = "https://convrtr.mreshank.com";

// A fully static export: a slug not returned here has no server to render it
// on demand, so it must 404 rather than fall through to a dynamic render
// that can never happen.
export function generateStaticParams() {
	return COLLECTIVES.map((collective) => ({ slug: collective.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const collective = getCollective(slug);
	if (!collective) return {};

	return {
		title: `${collective.title} — convrtr`,
		description: collective.why,
		alternates: { canonical: `${SITE}/collectives/${collective.slug}` },
		openGraph: {
			title: collective.title,
			description: collective.why,
			url: `${SITE}/collectives/${collective.slug}`,
		},
	};
}

export default async function CollectivePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const collective = getCollective(slug);
	if (!collective) notFound();

	// `flatMap` rather than `.map(getTool)` so the result types as `Tool[]`
	// rather than `(Tool | undefined)[]` -- the registry test already
	// guarantees every id here resolves, so nothing is silently dropped.
	const tools = collective.toolIds.flatMap((id) => {
		const tool = getTool(id);
		return tool ? [tool] : [];
	});
	const rows = tools.map(toToolRow);

	return (
		<HubPage
			title={collective.title}
			lede={collective.why}
			count={{
				value: tools.length,
				noun: tools.length === 1 ? "tool" : "tools",
			}}
		>
			<ToolTable rows={rows} caption={`${collective.title} tools`} />
		</HubPage>
	);
}
