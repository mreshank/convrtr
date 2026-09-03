import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTool } from "@/core/registry";
import { BLOG_POSTS } from "../registry";

/**
 * The five known post slugs, hardcoded rather than derived from readdirSync,
 * to match this repo's existing mime-parity.test.ts style of naming exact
 * file paths rather than globbing the filesystem at test time.
 */
const POST_SLUGS = [
	"how-mlw-encryption-works",
	"recovering-course-videos-after-a-platform-shuts-down",
	"is-extracting-mlw-video-legal",
	"mlw-vs-other-course-platform-video-wrappers",
	"troubleshooting-a-failed-mlw-extraction",
];

describe("blog registry conformance", () => {
	it("contains at least one post", () => {
		expect(BLOG_POSTS.length).toBeGreaterThan(0);
	});

	it("has no duplicate slugs", () => {
		const slugs = BLOG_POSTS.map((post) => post.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("resolves every related tool id via core/registry", () => {
		for (const post of BLOG_POSTS) {
			for (const toolId of post.relatedTools) {
				expect(getTool(toolId), `${post.slug} -> ${toolId}`).toBeDefined();
			}
		}
	});

	it("points every post at a content file that actually exists", () => {
		for (const post of BLOG_POSTS) {
			// The route (src/app/blog/[slug]/page.tsx) always imports content.mdx —
			// it does not branch on bodyFormat. A post declaring "tsx" here would
			// pass a naive existsSync(`content.${bodyFormat}`) check and then break
			// next build, since the route wouldn't import its actual file. Assert
			// the constraint explicitly so a future bodyFormat: "tsx" post fails
			// here first, not in a build.
			expect(post.bodyFormat, post.slug).toBe("mdx");
			const path = `src/content/blog/${post.slug}/content.mdx`;
			expect(existsSync(path), path).toBe(true);
		}
	});
});

describe("module boundary", () => {
	it("keeps blog metadata free of content-body imports", () => {
		// Mirrors core/registry's mime-parity.test.ts "module boundary" test:
		// metadata files must never value-import a content body, or listing
		// pages would drag every post's MDX (and any future .tsx bodies) into
		// their build graph. Enforced here as a test rather than only the prose
		// comment in registry.ts, so a future violation fails loudly.
		const paths = [
			"src/content/blog/registry.ts",
			...POST_SLUGS.map((slug) => `src/content/blog/${slug}/meta.ts`),
		];

		const contentImports = paths.flatMap((path) => {
			const source = readFileSync(path, "utf8");
			return [...source.matchAll(/^import\s+(.*?)from\s+["'](.*?)["']/gm)]
				.filter(([, , specifier]) =>
					/content(\.mdx|\.tsx)?$/.test(specifier ?? ""),
				)
				.map(([line]) => `${path}: ${line}`);
		});

		expect(
			contentImports,
			"blog metadata must not import content bodies at runtime",
		).toEqual([]);
	});
});
