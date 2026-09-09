import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COLLECTIVES, getCollective } from "@/content/collectives/registry";
import { getTool } from "@/core/registry";
import { ShowcasePage, type ShowcaseTool } from "@/design/templates";

const SITE = "https://convrtr.mreshank.com";

/**
 * Which member tool carries each collective's one live demo, and which
 * generated sample feeds it. Chosen, not derived: `scripts/generate-samples.mjs`
 * can only honestly produce a WAV and a PNG (spec §8's central constraint), so
 * the demo tool has to be one that accepts that format as input -- podcast-kit's
 * own WAV normaliser, and strip-metadata's PNG stripper. A collective with no
 * generatable-input member simply gets no entry here, and `ShowcasePage`
 * renders its showcase band with no demo slot at all.
 */
const DEMOS: Record<string, { toolId: string; sampleId: string }> = {
	"podcast-kit": {
		toolId: "audio/normalise-wav",
		sampleId: "podcast-clip-wav",
	},
	"strip-metadata": {
		toolId: "image/remove-metadata-png",
		sampleId: "tagged-photo-png",
	},
};

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
	const showcase: ShowcaseTool[] = tools.map((tool) => ({
		id: tool.id,
		href: `/${tool.id}`,
		name: tool.seo.h1,
		fromExt: tool.accept.ext[0] ?? tool.output.ext,
		toExt: tool.output.ext,
	}));

	return (
		<ShowcasePage
			title={collective.title}
			lede={collective.why}
			count={{
				value: tools.length,
				noun: tools.length === 1 ? "tool" : "tools",
			}}
			showcase={showcase}
			demo={DEMOS[collective.slug]}
		/>
	);
}
