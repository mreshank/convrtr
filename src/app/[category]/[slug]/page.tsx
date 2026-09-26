import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolAppendix } from "@/components/content/ToolAppendix";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPostsByTool, PUBLISHED_BLOG_POSTS } from "@/content/blog/registry";
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
	const rawFrom = tool.accept.ext[0] ?? tool.output.ext;
	const rawTo = tool.output.ext;
	const canonicalUrl = `${SITE}/${tool.id}`;

	return {
		title: tool.seo.title,
		description: tool.seo.intent,
		alternates: { canonical: canonicalUrl },
		keywords: [
			`${rawFrom} to ${rawTo}`,
			`convert ${rawFrom} to ${rawTo}`,
			`${rawFrom} to ${rawTo} converter`,
			`${rawFrom.toUpperCase()} to ${rawTo.toUpperCase()}`,
			"private file converter",
			"offline file converter",
			"client side converter",
			"zero upload converter",
		],
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
		openGraph: {
			title: tool.seo.title,
			description: tool.seo.intent,
			url: canonicalUrl,
			type: "website",
			siteName: "convrtr",
			locale: "en_US",
		},
		twitter: {
			card: "summary_large_image",
			title: tool.seo.title,
			description: tool.seo.intent,
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
		toolPosts.length > 0 ? toolPosts : PUBLISHED_BLOG_POSTS.slice(0, 3);
	const rawFrom = tool.accept.ext[0] ?? tool.output.ext;
	const rawTo = tool.output.ext;
	const comparisons = getRelatedComparisons(rawFrom, rawTo).slice(0, 3);

	return (
		<>
			<JsonLd schema={buildToolJsonLd(tool, `${SITE}/${tool.id}`)} />
			<ConverterPage
				breadcrumbs={[
					{ name: "Home", href: "/" },
					{ name: `${label(tool.category)} Tools`, href: `/${tool.category}` },
					{ name: tool.seo.h1 },
				]}
				eyebrow={`${label(tool.category)} · ${rawFrom.toUpperCase()} → ${rawTo.toUpperCase()}`}
				title={tool.seo.h1}
				lede={tool.seo.intent}
				related={
					<ToolAppendix
						faq={tool.seo.faq}
						comparisons={comparisons}
						posts={relatedPosts}
						tool={tool}
					/>
				}
			>
				<ToolClient toolId={tool.id} />
			</ConverterPage>
		</>
	);
}
