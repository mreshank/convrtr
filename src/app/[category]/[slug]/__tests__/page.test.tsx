import { describe, expect, it } from "vitest";
import ToolPage, { generateMetadata, generateStaticParams } from "../page";

describe("ToolPage", () => {
	it("generates static params for all registered tools", () => {
		const params = generateStaticParams();
		expect(params.length).toBeGreaterThan(50);
		expect(params).toContainEqual({
			category: "image",
			slug: "png-to-webp",
		});
	});

	it("generates comprehensive SEO metadata for Google ranking", async () => {
		const meta = await generateMetadata({
			params: Promise.resolve({ category: "image", slug: "png-to-webp" }),
		});

		expect(meta.title).toBeDefined();
		expect(meta.description).toBeDefined();
		expect(meta.alternates?.canonical).toBe(
			"https://convrtr.mreshank.com/image/png-to-webp",
		);
		expect(meta.keywords).toBeDefined();
		expect(meta.robots).toBeDefined();
		expect(meta.openGraph).toBeDefined();
		expect(meta.twitter).toBeDefined();
	});

	it("renders tool page with json-ld and technical appendix", async () => {
		const element = await ToolPage({
			params: Promise.resolve({ category: "image", slug: "png-to-webp" }),
		});

		expect(element).toBeDefined();
	});
});
