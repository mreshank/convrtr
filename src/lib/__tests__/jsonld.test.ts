import { describe, expect, it } from "vitest";
import { pngToWebp } from "@/core/registry/tools/png-to-webp";
import { buildToolJsonLd } from "../jsonld";

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
