import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolAppendix } from "@/components/content/ToolAppendix";
import { BLOG_POSTS, getPostsByTool } from "@/content/blog/registry";
import { getComparisonsByFormat } from "@/content/compare/registry";
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

function getRelatedComparisons(from: string, to: string) {
	const all = [...getComparisonsByFormat(from), ...getComparisonsByFormat(to)];
	return all.filter(
		(c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i,
	);
}

export default async function ToolPage({
	params,
}: {
	params: Promise<{ category: string; slug: string }>;
}) {
	const { category, slug } = await params;
	const tool = getTool(`${category}/${slug}`);
	if (!tool) notFound();

	const toolPosts = getPostsByTool(tool.id);
	const relatedPosts =
		toolPosts.length > 0 ? toolPosts : BLOG_POSTS.slice(0, 3);
	const rawFrom = tool.accept.ext[0] ?? tool.output.ext;
	const rawTo = tool.output.ext;
	const comparisons = getRelatedComparisons(rawFrom, rawTo).slice(0, 3);

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(buildToolJsonLd(tool, `${SITE}/${tool.id}`)),
				}}
			/>
			<ConverterPage
				eyebrow={`${label(tool.category)} · ${rawFrom.toUpperCase()} → ${rawTo.toUpperCase()}`}
				title={tool.seo.h1}
				lede={tool.seo.intent}
				related={
					<ToolAppendix
						faq={tool.seo.faq}
						comparisons={comparisons}
						posts={relatedPosts}
					/>
				}
			>
				<ToolClient toolId={tool.id} />
			</ConverterPage>
		</>
	);
}
