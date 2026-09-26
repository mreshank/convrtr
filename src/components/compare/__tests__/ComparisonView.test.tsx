import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonView } from "@/components/compare/ComparisonView";
import type { ComparisonMeta } from "@/content/compare/types";
import { CHROME_EXTENSION_URL } from "@/lib/site";

const mockComparison: ComparisonMeta = {
	slug: "webp-vs-png",
	title: "WebP vs PNG",
	description: "Direct comparison between WebP and PNG raster formats.",
	formatA: "webp",
	formatB: "png",
	category: "image",
	summary: "WebP produces substantially smaller files with alpha transparency.",
	specs: [
		{
			feature: "Compression",
			formatA: "Lossy & Lossless",
			formatB: "Lossless",
		},
	],
	prosA: ["Superior compression efficiency", "Supports animation and alpha"],
	prosB: ["Universal legacy support", "Pixel-perfect lossless editing"],
	verdict: "Use WebP for web delivery; use PNG for master source assets.",
	relatedTools: ["webp-to-png", "png-to-webp"],
};

describe("ComparisonView", () => {
	it("renders specs, verdict, related tools, and Chrome Extension callout", () => {
		render(<ComparisonView comparison={mockComparison} />);

		// Specs & verdict
		expect(
			screen.getByText("TECHNICAL SPECIFICATIONS COMPARISON"),
		).toBeDefined();
		expect(screen.getByText("ARCHITECTURAL VERDICT")).toBeDefined();
		expect(
			screen.getByText(
				"Use WebP for web delivery; use PNG for master source assets.",
			),
		).toBeDefined();

		// Related direct converters
		expect(screen.getByText("Convert with webp-to-png")).toBeDefined();
		expect(screen.getByText("Convert with png-to-webp")).toBeDefined();

		// Browser workflow / extension backlink
		expect(
			screen.getByText("[ BROWSER WORKFLOW // RIGHT-CLICK CONVERSION ]"),
		).toBeDefined();
		const installLink = screen
			.getByText("INSTALL CHROME EXTENSION")
			.closest("a");
		expect(installLink).toBeDefined();
		expect(installLink?.getAttribute("href")).toBe(CHROME_EXTENSION_URL);
		expect(installLink?.getAttribute("target")).toBe("_blank");

		// Extension specs internal link
		const specsLink = screen.getByText("EXTENSION SPECS").closest("a");
		expect(specsLink).toBeDefined();
		expect(specsLink?.getAttribute("href")).toBe("/extension");
	});
});
