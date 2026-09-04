import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/content/blog/registry";

const SITE = "https://convrtr.mreshank.com";

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
		<main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-[28px] tracking-[-0.02em]">Blog</h1>
				<p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
					Deep dives on the file formats and special converters convrtr
					supports.
				</p>
			</div>
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
		</main>
	);
}
