import type { Metadata } from "next";
import { BLOG_POSTS } from "@/content/blog/registry";
import { type BlogGridItem, HubPage } from "@/design/templates";
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
 * `blog/[slug]/page.tsx`'s own `formatDateline` renders on the post itself.
 */
function formatDateline(iso: string): string {
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(iso));
}

const READING_TIMES: Record<string, string> = {
	"how-mlw-encryption-works": "6 min read",
	"recovering-course-videos-after-a-platform-shuts-down": "7 min read",
	"is-extracting-mlw-video-legal": "5 min read",
	"mlw-vs-other-course-platform-video-wrappers": "8 min read",
	"troubleshooting-a-failed-mlw-extraction": "6 min read",
};

const BLOG_GRID_ITEMS: BlogGridItem[] = BLOG_POSTS.map((post) => ({
	slug: post.slug,
	title: post.title,
	description: post.description,
	publishedAt: post.publishedAt,
	dateline: formatDateline(post.publishedAt),
	readingTime: READING_TIMES[post.slug] ?? "5 min read",
	tags: post.tags,
	relatedTools: post.relatedTools.map((id) => ({
		id,
		name: id.split("/")[1]?.replace(/-/g, " ") ?? id,
		href: `/${id}`,
	})),
}));

export default function BlogIndexPage() {
	return (
		<HubPage
			title="Blog"
			lede="Deep dives on the file formats and special converters convrtr supports."
			count={{
				value: BLOG_GRID_ITEMS.length,
				noun: BLOG_GRID_ITEMS.length === 1 ? "post" : "posts",
			}}
			blogPosts={BLOG_GRID_ITEMS}
		/>
	);
}
