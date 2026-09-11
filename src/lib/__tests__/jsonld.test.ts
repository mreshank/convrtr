import { describe, expect, it } from "vitest";
import type { BlogPostMeta } from "@/content/blog/types";
import type { CollectiveMeta } from "@/content/collectives/types";
import type { ComparisonMeta } from "@/content/compare/types";
import { pngToWebp } from "@/core/registry/tools/png-to-webp";
import {
	buildBlogIndexJsonLd,
	buildBlogPostingJsonLd,
	buildBreadcrumbJsonLd,
	buildCategoryJsonLd,
	buildCollectiveDetailJsonLd,
	buildCollectivesIndexJsonLd,
	buildCompareIndexJsonLd,
	buildComparisonJsonLd,
	buildConvertStudioJsonLd,
	buildFormatGroupJsonLd,
	buildGroupsIndexJsonLd,
	buildHomeJsonLd,
	buildTaskGroupJsonLd,
	buildToolJsonLd,
	buildToolsIndexJsonLd,
	buildWebPageJsonLd,
} from "../jsonld";

describe("buildBreadcrumbJsonLd", () => {
	it("constructs a valid Schema.org BreadcrumbList with correct positions and items", () => {
		const crumbs = buildBreadcrumbJsonLd([
			{ name: "Home", url: "https://convrtr.mreshank.com" },
			{ name: "Image", url: "https://convrtr.mreshank.com/image" },
			{ name: "PNG to WebP" },
		]);

		expect(crumbs["@type"]).toBe("BreadcrumbList");
		expect(crumbs.itemListElement).toHaveLength(3);
		expect(crumbs.itemListElement[0]).toEqual({
			"@type": "ListItem",
			position: 1,
			name: "Home",
			item: "https://convrtr.mreshank.com",
		});
		expect(crumbs.itemListElement[1]).toEqual({
			"@type": "ListItem",
			position: 2,
			name: "Image",
			item: "https://convrtr.mreshank.com/image",
		});
		expect(crumbs.itemListElement[2]).toEqual({
			"@type": "ListItem",
			position: 3,
			name: "PNG to WebP",
		});
	});
});

describe("buildHomeJsonLd", () => {
	const jsonLd = buildHomeJsonLd();

	it("emits WebSite with Sitelinks SearchAction", () => {
		const site = jsonLd["@graph"].find((n) => n["@type"] === "WebSite") as {
			name: string;
			potentialAction?: {
				"@type": string;
				target?: { urlTemplate: string };
			};
		};
		expect(site).toBeDefined();
		expect(site.name).toBe("convrtr");
		expect(site.potentialAction?.["@type"]).toBe("SearchAction");
		expect(site.potentialAction?.target?.urlTemplate).toContain("/tools?q=");
	});

	it("emits Organization with logo and github link", () => {
		const org = jsonLd["@graph"].find((n) => n["@type"] === "Organization") as {
			name: string;
			logo?: { url: string };
			sameAs?: string[];
		};
		expect(org).toBeDefined();
		expect(org.name).toBe("convrtr");
		expect(org.logo?.url).toContain("/icon.svg");
		expect(org.sameAs).toContain("https://github.com/mreshank/convrtr");
	});

	it("emits WebApplication with zero price and privacy features", () => {
		const app = jsonLd["@graph"].find(
			(n) => n["@type"] === "WebApplication",
		) as {
			offers: { price: string };
			featureList?: string[];
		};
		expect(app).toBeDefined();
		expect(app.offers.price).toBe("0");
		expect(app.featureList?.length).toBeGreaterThan(2);
	});
});

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

	it("emits a BreadcrumbList node with 3 levels", () => {
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as { itemListElement: unknown[] } | undefined;
		expect(crumbs?.itemListElement.length).toBe(3);
	});
});

describe("buildCategoryJsonLd", () => {
	const graph = buildCategoryJsonLd(
		"image",
		[pngToWebp],
		"https://convrtr.mreshank.com/image",
	);

	it("emits a CollectionPage with ItemList and BreadcrumbList", () => {
		const collection = graph["@graph"].find(
			(n) => n["@type"] === "CollectionPage",
		) as { mainEntity: { itemListElement: unknown[] } };
		expect(collection).toBeDefined();
		expect(collection.mainEntity.itemListElement).toHaveLength(1);

		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as { itemListElement: { name: string }[] };
		expect(crumbs).toBeDefined();
		expect(crumbs.itemListElement).toHaveLength(2);
		expect(crumbs.itemListElement[1]?.name).toBe("Image Tools");
	});
});

describe("buildToolsIndexJsonLd", () => {
	const graph = buildToolsIndexJsonLd(
		[pngToWebp],
		"https://convrtr.mreshank.com/tools",
	);

	it("emits CollectionPage with ItemList and BreadcrumbList", () => {
		const collection = graph["@graph"].find(
			(n) => n["@type"] === "CollectionPage",
		);
		expect(collection).toBeDefined();
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: unknown[];
		};
		expect(crumbs.itemListElement).toHaveLength(2);
	});
});

describe("buildConvertStudioJsonLd", () => {
	const graph = buildConvertStudioJsonLd(
		"https://convrtr.mreshank.com/convert",
	);

	it("emits WebApplication and BreadcrumbList", () => {
		const app = graph["@graph"].find((n) => n["@type"] === "WebApplication");
		expect(app).toBeDefined();
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: unknown[];
		};
		expect(crumbs.itemListElement).toHaveLength(2);
	});
});

describe("buildGroupsIndexJsonLd", () => {
	const graph = buildGroupsIndexJsonLd("https://convrtr.mreshank.com/groups");

	it("emits CollectionPage and BreadcrumbList", () => {
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: unknown[];
		};
		expect(crumbs.itemListElement).toHaveLength(2);
	});
});

describe("buildFormatGroupJsonLd & buildTaskGroupJsonLd", () => {
	it("emits 3-level breadcrumbs for format groups", () => {
		const graph = buildFormatGroupJsonLd(
			"png",
			[pngToWebp],
			"https://convrtr.mreshank.com/groups/format/png",
		);
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: { name: string }[];
		};
		expect(crumbs.itemListElement).toHaveLength(3);
		expect(crumbs.itemListElement[1]?.name).toBe("Groups");
		expect(crumbs.itemListElement[2]?.name).toBe("PNG Tools");
	});

	it("emits 3-level breadcrumbs for task groups", () => {
		const graph = buildTaskGroupJsonLd(
			"convert",
			[pngToWebp],
			"https://convrtr.mreshank.com/groups/task/convert",
		);
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: { name: string }[];
		};
		expect(crumbs.itemListElement).toHaveLength(3);
		expect(crumbs.itemListElement[1]?.name).toBe("Groups");
		expect(crumbs.itemListElement[2]?.name).toBe("Convert Tools");
	});
});

describe("buildCollectivesIndexJsonLd & buildCollectiveDetailJsonLd", () => {
	const sampleCollective: CollectiveMeta = {
		slug: "podcast-kit",
		title: "Podcast Kit",
		why: "Audio tools for podcast workflows",
		toolIds: ["audio/normalise-wav"],
	};

	it("emits collectives index structured data", () => {
		const graph = buildCollectivesIndexJsonLd(
			[sampleCollective],
			"https://convrtr.mreshank.com/collectives",
		);
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: unknown[];
		};
		expect(crumbs.itemListElement).toHaveLength(2);
	});

	it("emits collective detail 3-level breadcrumb", () => {
		const graph = buildCollectiveDetailJsonLd(
			sampleCollective,
			[],
			"https://convrtr.mreshank.com/collectives/podcast-kit",
		);
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: { name: string }[];
		};
		expect(crumbs.itemListElement).toHaveLength(3);
		expect(crumbs.itemListElement[2]?.name).toBe("Podcast Kit");
	});
});

describe("buildCompareIndexJsonLd & buildComparisonJsonLd", () => {
	const sampleComparison: ComparisonMeta = {
		slug: "webp-vs-avif",
		title: "WebP vs AVIF",
		description: "Detailed comparison",
		formatA: "WebP",
		formatB: "AVIF",
		category: "image",
		summary: "Summary text",
		prosA: [],
		prosB: [],
		specs: [],
		verdict: "Verdict text",
		relatedTools: [],
	};

	it("emits compare index structured data", () => {
		const graph = buildCompareIndexJsonLd(
			[sampleComparison],
			"https://convrtr.mreshank.com/compare",
		);
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: unknown[];
		};
		expect(crumbs.itemListElement).toHaveLength(2);
	});

	it("emits TechArticle and 3-level breadcrumbs for comparison detail", () => {
		const graph = buildComparisonJsonLd(
			sampleComparison,
			"https://convrtr.mreshank.com/compare/webp-vs-avif",
		);
		const article = graph["@graph"].find(
			(n) => n["@type"] === "TechArticle",
		) as {
			headline: string;
		};
		expect(article).toBeDefined();
		expect(article.headline).toBe("WebP vs AVIF");

		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: { name: string }[];
		};
		expect(crumbs.itemListElement).toHaveLength(3);
		expect(crumbs.itemListElement[1]?.name).toBe("Format Comparisons");
		expect(crumbs.itemListElement[2]?.name).toBe("WebP vs AVIF");
	});
});

describe("buildBlogIndexJsonLd & buildBlogPostingJsonLd", () => {
	const post: BlogPostMeta = {
		slug: "example-post",
		title: "Example post",
		description: "An example description.",
		publishedAt: "2026-08-27",
		relatedTools: ["video/mlw-to-mp4"],
		tags: [],
		bodyFormat: "mdx",
	};

	it("emits Blog with posts and breadcrumbs for blog index", () => {
		const graph = buildBlogIndexJsonLd(
			[post],
			"https://convrtr.mreshank.com/blog",
		);
		const blog = graph["@graph"].find((n) => n["@type"] === "Blog");
		expect(blog).toBeDefined();
		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: unknown[];
		};
		expect(crumbs.itemListElement).toHaveLength(2);
	});

	it("emits a BlogPosting node with headline, description, author, publisher and 3-level breadcrumbs", () => {
		const graph = buildBlogPostingJsonLd(
			post,
			"https://convrtr.mreshank.com/blog/example-post",
		);
		const jsonLd = graph["@graph"].find(
			(n) => n["@type"] === "BlogPosting",
		) as {
			headline: string;
			description: string;
			datePublished: string;
			url: string;
			author: { name: string };
			publisher: { name: string };
		};
		expect(jsonLd).toBeDefined();
		expect(jsonLd.headline).toBe(post.title);
		expect(jsonLd.description).toBe(post.description);
		expect(jsonLd.datePublished).toBe(post.publishedAt);
		expect(jsonLd.url).toBe("https://convrtr.mreshank.com/blog/example-post");
		expect(jsonLd.author.name).toBe("convrtr");
		expect(jsonLd.publisher.name).toBe("convrtr");

		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: { name: string }[];
		};
		expect(crumbs.itemListElement).toHaveLength(3);
		expect(crumbs.itemListElement[1]?.name).toBe("Blog");
		expect(crumbs.itemListElement[2]?.name).toBe(post.title);
	});
});

describe("buildWebPageJsonLd", () => {
	it("emits WebPage with custom breadcrumbs", () => {
		const graph = buildWebPageJsonLd({
			title: "About — convrtr",
			description: "About page description",
			url: "https://convrtr.mreshank.com/about",
			breadcrumbs: [
				{ name: "About", url: "https://convrtr.mreshank.com/about" },
			],
			type: "AboutPage",
		});

		const page = graph["@graph"].find((n) => n["@type"] === "AboutPage");
		expect(page).toBeDefined();

		const crumbs = graph["@graph"].find(
			(n) => n["@type"] === "BreadcrumbList",
		) as {
			itemListElement: { name: string }[];
		};
		expect(crumbs.itemListElement).toHaveLength(2);
		expect(crumbs.itemListElement[0]?.name).toBe("Home");
		expect(crumbs.itemListElement[1]?.name).toBe("About");
	});
});
