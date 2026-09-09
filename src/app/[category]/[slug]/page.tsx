import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RelatedReading } from "@/components/content/RelatedReading";
import { getPostsByTool } from "@/content/blog/registry";
import { getTool, TOOLS } from "@/core/registry";
import { ConverterPage } from "@/design/templates";
import { buildToolJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";
import { ToolClient } from "./ToolClient";

function label(category: string): string {
	return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

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

	const relatedPosts = getPostsByTool(tool.id);
	const fromExt = (tool.accept.ext[0] ?? tool.output.ext).toUpperCase();
	const toExt = tool.output.ext.toUpperCase();

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(buildToolJsonLd(tool, `${SITE}/${tool.id}`)),
				}}
			/>
			{/*
			 * `title` is `tool.seo.h1` — the page's one real headline. ToolClient
			 * used to render this same text in its own <h1>; that line is gone
			 * (see ToolClient.tsx) so the page has exactly one <h1>, which is
			 * what the 42 Playwright specs that resolve it by name expect. The
			 * format pair is folded into the eyebrow instead of competing for
			 * the headline slot: it labels the conversion, it doesn't name the
			 * page.
			 */}
			<ConverterPage
				eyebrow={`${label(tool.category)} · ${fromExt} → ${toExt}`}
				title={tool.seo.h1}
				lede={tool.seo.intent}
				related={<RelatedReading posts={relatedPosts} />}
			>
				<ToolClient toolId={tool.id} />
			</ConverterPage>
		</>
	);
}
