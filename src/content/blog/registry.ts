import type { BlogPostMeta } from "./types";
import { meta as howMlwEncryptionWorks } from "./how-mlw-encryption-works/meta";
import { meta as recoveringCourseVideosAfterAPlatformShutsDown } from "./recovering-course-videos-after-a-platform-shuts-down/meta";

/**
 * Metadata only — every entry here is a plain object imported from a
 * `meta.ts` file. Content bodies (`content.mdx`/`content.tsx`) are never
 * imported here; only `src/app/blog/[slug]/page.tsx` loads one, per slug,
 * via a dynamic import. Importing every post's body into this file would
 * pull all of them into the build graph of any page that lists posts —
 * the same class of bug `core/registry`'s module-boundary test guards
 * against for tools.
 */
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
];

export function getPost(
	slug: string,
	posts: BlogPostMeta[] = BLOG_POSTS,
): BlogPostMeta | undefined {
	return posts.find((post) => post.slug === slug);
}

export function getPostsByTool(
	toolId: string,
	posts: BlogPostMeta[] = BLOG_POSTS,
): BlogPostMeta[] {
	return posts.filter((post) => post.relatedTools.includes(toolId));
}
