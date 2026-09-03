import { describe, expect, it } from "vitest";
import type { BlogPostMeta } from "@/content/blog/types";
import { pngToWebp } from "@/core/registry/tools/png-to-webp";
import { buildBlogPostingJsonLd, buildToolJsonLd } from "../jsonld";

describe("buildToolJsonLd", () => {
	const graph = buildToolJsonLd(
		pngToWebp,
		"https://convrtr.mreshank.com/image/png-to-webp",
	) as {
		"@graph": { "@type": string; [key: string]: unknown }[];
	};

	it("emits a SoftwareApplication node that is free", () => {
		const app = graph["@graph"].find(
			(n) => n["@type"] === "SoftwareApplication",
		) as { offers: { price: string } } | undefined;
		expect(app).toBeDefined();
		expect(app?.offers.price).toBe("0");
	});

	it("emits an FAQPage node with one entry per registry FAQ", () => {
		const faq = graph["@graph"].find((n) => n["@type"] === "FAQPage") as
			| { mainEntity: unknown[] }
			| undefined;
		expect(faq?.mainEntity.length).toBe(pngToWebp.seo.faq.length);
	});

	it("emits a HowTo node naming the tool", () => {
		const howTo = graph["@graph"].find((n) => n["@type"] === "HowTo");
		expect(howTo?.name).toBe(pngToWebp.seo.h1);
	});
});

describe("buildBlogPostingJsonLd", () => {
	const post: BlogPostMeta = {
		slug: "example-post",
		title: "Example post",
		description: "An example description.",
		publishedAt: "2026-08-27",
		relatedTools: ["video/mlw-to-mp4"],
		tags: [],
		bodyFormat: "mdx",
	};

	it("emits a BlogPosting node with the post's headline, description and date", () => {
		const jsonLd = buildBlogPostingJsonLd(
			post,
			"https://convrtr.mreshank.com/blog/example-post",
		) as {
			"@type": string;
			headline: string;
			description: string;
			datePublished: string;
			url: string;
		};
		expect(jsonLd["@type"]).toBe("BlogPosting");
		expect(jsonLd.headline).toBe(post.title);
		expect(jsonLd.description).toBe(post.description);
		expect(jsonLd.datePublished).toBe(post.publishedAt);
		expect(jsonLd.url).toBe("https://convrtr.mreshank.com/blog/example-post");
	});
});
