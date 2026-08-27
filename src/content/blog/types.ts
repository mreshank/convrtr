export interface BlogPostMeta {
	slug: string;
	title: string;
	description: string;
	/** ISO date, e.g. "2026-08-27". */
	publishedAt: string;
	/** Tool ids this post supports, e.g. "video/mlw-to-mp4" — must resolve via core/registry's getTool(). */
	relatedTools: string[];
	tags: string[];
	bodyFormat: "mdx" | "tsx";
}
