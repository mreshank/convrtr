import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogPostMeta } from "@/content/blog/types";
import { RelatedReading } from "../RelatedReading";

const posts: BlogPostMeta[] = [
	{
		slug: "example-post",
		title: "Example post",
		description: "d",
		publishedAt: "2026-01-01",
		relatedTools: ["video/mlw-to-mp4"],
		tags: [],
		bodyFormat: "mdx",
	},
];

describe("RelatedReading", () => {
	it("renders a link per post", () => {
		render(<RelatedReading posts={posts} />);
		const link = screen.getByRole("link", { name: "Example post" });
		expect(link.getAttribute("href")).toBe("/blog/example-post");
	});

	it("renders nothing for an empty post list", () => {
		const { container } = render(<RelatedReading posts={[]} />);
		expect(container.firstChild).toBeNull();
	});
});
