import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTool, TOOLS } from "@/core/registry";
import { buildToolJsonLd } from "@/lib/jsonld";
import { ToolClient } from "./ToolClient";

const SITE = "https://convrtr.mreshank.com";

export function generateStaticParams() {
	return TOOLS.map((tool) => ({ category: tool.category, slug: tool.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
	const { category, slug } = await params;
	const tool = getTool(`${category}/${slug}`);
	if (!tool) return {};
	return {
		title: tool.seo.title,
		description: tool.seo.intent,
		alternates: { canonical: `${SITE}/${tool.id}` },
		openGraph: {
			title: tool.seo.title,
			description: tool.seo.intent,
			url: `${SITE}/${tool.id}`,
		},
	};
}

export default async function ToolPage({
	params,
}: {
	params: Promise<{ category: string; slug: string }>;
}) {
	const { category, slug } = await params;
	const tool = getTool(`${category}/${slug}`);
	if (!tool) notFound();

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(buildToolJsonLd(tool, `${SITE}/${tool.id}`)),
				}}
			/>
			<ToolClient toolId={tool.id} />
		</>
	);
}
