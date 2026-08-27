import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPost } from "@/content/blog/registry";
import { buildBlogPostingJsonLd } from "@/lib/jsonld";

const SITE = "https://convrtr.mreshank.com";

export function generateStaticParams() {
	return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const post = getPost(slug);
	if (!post) return {};
	return {
		title: post.title,
		description: post.description,
		alternates: { canonical: `${SITE}/blog/${post.slug}` },
		openGraph: {
			title: post.title,
			description: post.description,
			url: `${SITE}/blog/${post.slug}`,
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
	const { default: Content } = await import(`@/content/blog/${slug}/content.mdx`);

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(
						buildBlogPostingJsonLd(post, `${SITE}/blog/${post.slug}`),
					),
				}}
			/>
			<main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
				<div className="flex flex-col gap-2">
					<h1 className="text-[28px] tracking-[-0.02em]">{post.title}</h1>
					<p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
						{post.publishedAt}
					</p>
				</div>
				<div className="flex flex-col gap-4">
					<Content />
				</div>
			</main>
		</>
	);
}
