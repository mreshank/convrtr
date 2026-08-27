import { describe, expect, it } from "vitest";
import { getPost, getPostsByTool } from "../registry";
import type { BlogPostMeta } from "../types";

const fixture: BlogPostMeta[] = [
	{
		slug: "post-a",
		title: "Post A",
		description: "d",
		publishedAt: "2026-01-01",
		relatedTools: ["video/mlw-to-mp4"],
		tags: [],
		bodyFormat: "mdx",
	},
	{
		slug: "post-b",
		title: "Post B",
		description: "d",
		publishedAt: "2026-01-02",
		relatedTools: ["image/png-to-webp"],
		tags: [],
		bodyFormat: "tsx",
	},
];

describe("getPost", () => {
	it("finds a post by slug", () => {
		expect(getPost("post-a", fixture)?.title).toBe("Post A");
	});

	it("returns undefined for an unknown slug", () => {
		expect(getPost("nope", fixture)).toBeUndefined();
	});
});

describe("getPostsByTool", () => {
	it("returns only posts whose relatedTools includes the given tool id", () => {
		expect(getPostsByTool("video/mlw-to-mp4", fixture).map((p) => p.slug)).toEqual([
			"post-a",
		]);
	});

	it("returns an empty array when no post references the tool", () => {
		expect(getPostsByTool("data/csv-to-json", fixture)).toEqual([]);
	});
});
