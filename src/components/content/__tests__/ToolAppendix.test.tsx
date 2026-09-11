import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogPostMeta } from "@/content/blog/types";
import type { ComparisonMeta } from "@/content/compare/types";
import { ToolAppendix } from "../ToolAppendix";

const mockPosts: BlogPostMeta[] = [
	{
		slug: "test-post",
		title: "Testing Guide",
		description: "A description of testing.",
		publishedAt: "2026-02-01",
		relatedTools: ["image/webp-to-png"],
		tags: ["test"],
		bodyFormat: "mdx",
	},
];

const mockComparisons: ComparisonMeta[] = [
	{
		slug: "webp-vs-png",
		title: "WebP vs PNG Comparison",
		description: "Comparing WebP and PNG formats.",
		formatA: "WebP",
		formatB: "PNG",
		category: "image",
		summary: "WebP is lighter than PNG.",
		prosA: ["Smaller size", "Lossless support", "Animation support"],
		prosB: [
			"Universal compatibility",
			"Bit-for-bit standard",
			"Print friendly",
		],
		specs: [
			{ feature: "Codec", formatA: "VP8L", formatB: "Deflate" },
			{ feature: "Alpha", formatA: "Yes", formatB: "Yes" },
			{ feature: "Speed", formatA: "Fast", formatB: "Fast" },
			{ feature: "Support", formatA: "98%", formatB: "100%" },
		],
		verdict: "Use WebP for web.",
		relatedTools: ["image/webp-to-png"],
	},
];

const mockFaq = [
	{
		q: "How does local conversion work?",
		a: "All conversion logic runs directly in your browser using WebAssembly.",
	},
];

describe("ToolAppendix", () => {
	it("renders FAQ, comparisons, and related reading", () => {
		render(
			<ToolAppendix
				faq={mockFaq}
				comparisons={mockComparisons}
				posts={mockPosts}
			/>,
		);

		expect(screen.getByTestId("tool-appendix")).toBeDefined();
		expect(screen.getByText("How does local conversion work?")).toBeDefined();
		expect(
			screen.getByText(
				"All conversion logic runs directly in your browser using WebAssembly.",
			),
		).toBeDefined();
		expect(screen.getByText("WebP vs PNG Comparison")).toBeDefined();
		expect(screen.getByText("Testing Guide")).toBeDefined();
	});

	it("omits sections when data arrays are empty", () => {
		render(<ToolAppendix faq={[]} comparisons={[]} posts={[]} />);

		expect(screen.queryByTestId("tool-faq")).toBeNull();
		expect(screen.queryByTestId("tool-comparisons")).toBeNull();
	});
});
