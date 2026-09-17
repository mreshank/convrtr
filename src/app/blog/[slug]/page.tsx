import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostStatusBanner } from "@/components/content/PostStatusBanner";
import { RelatedReading } from "@/components/content/RelatedReading";
import { JsonLd } from "@/components/seo/JsonLd";
import {
	BLOG_POSTS,
	getPost,
	PUBLISHED_BLOG_POSTS,
} from "@/content/blog/registry";
import type { BlogPostMeta } from "@/content/blog/types";
import { ArticlePage } from "@/design/templates";
import { buildBlogPostingJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
	return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

/** "27 August 2026" — the mono dateline voice, formatted here so `ArticlePage` never needs a locale. */
function formatDateline(iso: string) {
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(iso));
}

/** Other published posts that support the same tool — the same relation the tool page's own related-reading block uses. */
function getRelatedPosts(post: BlogPostMeta) {
	return PUBLISHED_BLOG_POSTS.filter(
		(candidate) =>
			candidate.slug !== post.slug &&
			candidate.relatedTools.some((tool) => post.relatedTools.includes(tool)),
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const post = getPost(slug);
	if (!post) return {};
	const isPublished = (post.status ?? "published") === "published";

	return {
		title: post.title,
		description: post.description,
		alternates: { canonical: `${SITE}/blog/${post.slug}` },
		openGraph: {
			title: post.title,
			description: post.description,
			url: `${SITE}/blog/${post.slug}`,
		},
		robots: isPublished
			? undefined
			: {
					index: false,
					follow: false,
					nocache: true,
					googleBot: {
						index: false,
						follow: false,
					},
				},
	};
}

export default async function BlogPostPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const post = getPost(slug);
	if (!post) notFound();

	// Single-branch import only: a ternary here forces the bundler to build a
	// context glob for each branch, and the unused .tsx glob fails to resolve
	// since no .tsx content files exist, 500ing the route.
	const { default: Content } = await import(
		`@/content/blog/${slug}/content.mdx`
	);

	const isPublished = (post.status ?? "published") === "published";
	const dateline = formatDateline(post.publishedAt);
	const related = getRelatedPosts(post);

	return (
		<>
			{isPublished && (
				<JsonLd
					schema={buildBlogPostingJsonLd(post, `${SITE}/blog/${post.slug}`)}
				/>
			)}
			<ArticlePage
				breadcrumbs={[
					{ name: "Home", href: "/" },
					{ name: "Blog", href: "/blog" },
					{ name: post.title },
				]}
				title={post.title}
				dateline={dateline}
				related={
					related.length > 0 ? <RelatedReading posts={related} /> : undefined
				}
			>
				<PostStatusBanner status={post.status} />
				<Content />
			</ArticlePage>
		</>
	);
}
