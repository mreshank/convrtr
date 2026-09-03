import Link from "next/link";
import type { BlogPostMeta } from "@/content/blog/types";

export function RelatedReading({ posts }: { posts: BlogPostMeta[] }) {
	if (posts.length === 0) return null;
	return (
		<section className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-8 pb-8">
			<h2 className="text-[18px] tracking-[-0.01em]">Related reading</h2>
			<ul className="flex flex-col gap-2">
				{posts.map((post) => (
					<li key={post.slug}>
						<Link href={`/blog/${post.slug}`} className="underline">
							{post.title}
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
