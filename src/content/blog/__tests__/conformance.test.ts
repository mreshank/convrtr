import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTool } from "@/core/registry";
import { BLOG_POSTS } from "../registry";

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
			const path = `src/content/blog/${post.slug}/content.${post.bodyFormat}`;
			expect(existsSync(path), path).toBe(true);
		}
	});
});
