import type { Metadata } from "next";
import { BLOG_POSTS } from "@/content/blog/registry";
import { HubPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Blog — convrtr";
	const description =
		"Deep dives on the file formats and special converters convrtr supports.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/blog` },
		openGraph: { title, description, url: `${SITE}/blog` },
	};
}

/**
 * "27 August 2026" -- the mono dateline voice, matching the exact format
 * `blog/[slug]/page.tsx`'s own `formatDateline` renders on the post itself,
 * so a reader sees the same date on the index row and the article it opens.
 */
function formatDateline(iso: string): string {
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(iso));
}

export default function BlogIndexPage() {
	const posts = [...BLOG_POSTS].sort((a, b) =>
		b.publishedAt.localeCompare(a.publishedAt),
	);

	return (
		<HubPage
			title="Blog"
			lede="Deep dives on the file formats and special converters convrtr supports."
			count={{
				value: posts.length,
				noun: posts.length === 1 ? "post" : "posts",
			}}
			sections={[
				{
					items: posts.map((post) => ({
						href: `/blog/${post.slug}`,
						title: post.title,
						meta: formatDateline(post.publishedAt),
						description: post.description,
					})),
				},
			]}
		/>
	);
}
