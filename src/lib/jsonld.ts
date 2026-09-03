import type { BlogPostMeta } from "@/content/blog/types";
import type { Tool } from "@/core/registry";

export function buildToolJsonLd(tool: Tool, url: string) {
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "SoftwareApplication",
				name: tool.seo.h1,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Any",
				url,
				description: tool.seo.intent,
				offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
			},
			{
				"@type": "HowTo",
				name: tool.seo.h1,
				step: [
					{
						"@type": "HowToStep",
						text: `Drop your .${tool.accept.ext[0]} file onto the page.`,
					},
					{
						"@type": "HowToStep",
						text: "Choose how much quality you want to keep.",
					},
					{
						"@type": "HowToStep",
						text: `Save the .${tool.output.ext} file to your device.`,
					},
				],
			},
			{
				"@type": "FAQPage",
				mainEntity: tool.seo.faq.map((item) => ({
					"@type": "Question",
					name: item.q,
					acceptedAnswer: { "@type": "Answer", text: item.a },
				})),
			},
		],
	};
}

export function buildBlogPostingJsonLd(post: BlogPostMeta, url: string) {
	return {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: post.title,
		description: post.description,
		datePublished: post.publishedAt,
		url,
	};
}
