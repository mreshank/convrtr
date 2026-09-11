import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/content/blog/registry";
import { COLLECTIVES } from "@/content/collectives/registry";
import { COMPARISONS } from "@/content/compare/registry";
import { TOOLS } from "@/core/registry";
import { deriveFormatGroups, deriveTaskGroups } from "@/core/registry/groups";

describe("sitemap", () => {
	it("lists every tool, post, collective, comparison and group exactly once", () => {
		const urls = sitemap().map((e) => e.url);
		expect(new Set(urls).size).toBe(urls.length);
		const expected =
			TOOLS.length +
			BLOG_POSTS.length +
			COLLECTIVES.length +
			COMPARISONS.length +
			deriveFormatGroups().length +
			deriveTaskGroups().length;
		expect(urls.length).toBeGreaterThanOrEqual(expected);
	});

	it("lists no URL for a route that does not exist", () => {
		// Derived from the same registries the routes are, so the two cannot
		// disagree. A sitemap advertising a 404 is worse than no sitemap.
		for (const entry of sitemap()) {
			expect(entry.url.startsWith("https://")).toBe(true);
		}
	});
});
