import type { Metadata } from "next";
import Link from "next/link";
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
		>
			<ul className="flex flex-col gap-6">
				{posts.map((post) => (
					<li key={post.slug} className="flex flex-col gap-1">
						<Link href={`/blog/${post.slug}`} className="text-[18px] underline">
							{post.title}
						</Link>
						<p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
							{post.description}
						</p>
					</li>
				))}
			</ul>
		</HubPage>
	);
}
