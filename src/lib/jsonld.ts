import type { BlogPostMeta } from "@/content/blog/types";
import type { CollectiveMeta } from "@/content/collectives/types";
import type { ComparisonMeta } from "@/content/compare/types";
import type { Tool } from "@/core/registry";
import { SITE } from "@/lib/site";

function getOrigin(url: string): string {
	if (!url?.startsWith("http")) return SITE;
	const parts = url.split("/");
	return `${parts[0]}//${parts[2]}`;
}

export function buildBreadcrumbJsonLd(items: { name: string; url?: string }[]) {
	return {
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			...(item.url ? { item: item.url } : {}),
		})),
	};
}

export function buildHomeJsonLd() {
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": `${SITE}/#website`,
				name: "convrtr",
				url: SITE,
				description: "Convert anything in your browser. Nothing is uploaded.",
				potentialAction: {
					"@type": "SearchAction",
					target: {
						"@type": "EntryPoint",
						urlTemplate: `${SITE}/tools?q={search_term_string}`,
					},
					"query-input": "required name=search_term_string",
				},
			},
			{
				"@type": "Organization",
				"@id": `${SITE}/#organization`,
				name: "convrtr",
				url: SITE,
				logo: {
					"@type": "ImageObject",
					url: `${SITE}/icon.svg`,
					width: "512",
					height: "512",
				},
				sameAs: ["https://github.com/mreshank/convrtr"],
			},
			{
				"@type": "WebApplication",
				"@id": `${SITE}/#webapp`,
				name: "convrtr",
				url: SITE,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Any",
				browserRequirements: "Requires WebAssembly and HTML5",
				isAccessibleForFree: true,
				offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
				featureList: [
					"Client-side processing with WebAssembly",
					"Zero server uploads - 100% private",
					"Offline capable with Service Workers",
					"Multi-file batch conversion and ZIP export",
				],
			},
		],
	};
}

export function buildToolJsonLd(tool: Tool, url: string) {
	const origin = getOrigin(url);
	const categoryLabel =
		tool.category.charAt(0).toUpperCase() + tool.category.slice(1);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "SoftwareApplication",
				name: tool.seo.h1,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Any",
				browserRequirements: "Requires WebAssembly and HTML5",
				url,
				description: tool.seo.intent,
				isAccessibleForFree: true,
				offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
				featureList: [
					`Converts .${tool.accept.ext.join(", .")} to .${tool.output.ext}`,
					"100% private client-side processing",
					"Zero server upload",
				],
			},
			{
				"@type": "HowTo",
				name: tool.seo.h1,
				description: tool.seo.intent,
				totalTime: "PT10S",
				step: [
					{
						"@type": "HowToStep",
						position: 1,
						name: `Select .${tool.accept.ext[0]} file`,
						text: `Drop your .${tool.accept.ext[0]} file onto the page or choose it from your device.`,
						url: `${url}#step-1`,
					},
					{
						"@type": "HowToStep",
						position: 2,
						name: "Choose quality preset",
						text: "Choose how much quality you want to keep.",
						url: `${url}#step-2`,
					},
					{
						"@type": "HowToStep",
						position: 3,
						name: `Download .${tool.output.ext} file`,
						text: `Save the .${tool.output.ext} file to your device.`,
						url: `${url}#step-3`,
					},
				],
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: `${categoryLabel} Tools`,
						item: `${origin}/${tool.category}`,
					},
					{
						"@type": "ListItem",
						position: 3,
						name: tool.seo.h1,
						item: url,
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

export function buildCategoryJsonLd(
	category: string,
	tools: Tool[],
	url: string,
) {
	const origin = getOrigin(url);
	const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: `${categoryLabel} tools — convrtr`,
				description: `${tools.length} ${
					tools.length === 1 ? "tool" : "tools"
				} for converting ${category} files, running entirely in your browser.`,
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: tools.length,
					itemListElement: tools.map((t, idx) => ({
						"@type": "ListItem",
						position: idx + 1,
						name: t.seo.h1,
						url: `${origin}/${t.id}`,
					})),
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: `${categoryLabel} Tools`,
						item: url,
					},
				],
			},
		],
	};
}

export function buildToolsIndexJsonLd(tools: Tool[], url: string) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: "All tools — convrtr",
				description:
					"Every file conversion convrtr supports, searchable in one list. Every conversion runs in your browser — nothing is uploaded.",
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: tools.length,
					itemListElement: tools.map((t, idx) => ({
						"@type": "ListItem",
						position: idx + 1,
						name: t.seo.h1,
						url: `${origin}/${t.id}`,
					})),
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "All Tools",
						item: url,
					},
				],
			},
		],
	};
}

export function buildConvertStudioJsonLd(url: string) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebApplication",
				"@id": `${url}/#webapp`,
				name: "Master File Converter — convrtr",
				url,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Any",
				browserRequirements: "Requires WebAssembly and HTML5",
				isAccessibleForFree: true,
				offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
				description:
					"Universal in-browser file converter. Convert images, audio, video, and documents with selective batch customization. Nothing is uploaded.",
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Master File Converter",
						item: url,
					},
				],
			},
		],
	};
}

export function buildGroupsIndexJsonLd(url: string) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: "Browse by type, format, or task — convrtr",
				description:
					"Every conversion convrtr supports, grouped by file type, by format, and by what it does to a file.",
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Groups",
						item: url,
					},
				],
			},
		],
	};
}

export function buildFormatGroupJsonLd(
	format: string,
	tools: Tool[],
	url: string,
) {
	const origin = getOrigin(url);
	const name = `${format.toUpperCase()} Tools`;

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: `${format.toUpperCase()} tools — convrtr`,
				description: `${tools.length} ${
					tools.length === 1 ? "tool" : "tools"
				} that accept or produce ${format.toUpperCase()}, all running in your browser.`,
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: tools.length,
					itemListElement: tools.map((t, idx) => ({
						"@type": "ListItem",
						position: idx + 1,
						name: t.seo.h1,
						url: `${origin}/${t.id}`,
					})),
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Groups",
						item: `${origin}/groups`,
					},
					{
						"@type": "ListItem",
						position: 3,
						name,
						item: url,
					},
				],
			},
		],
	};
}

export function buildTaskGroupJsonLd(kind: string, tools: Tool[], url: string) {
	const origin = getOrigin(url);
	const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);
	const name = `${kindLabel} Tools`;

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: `${kindLabel} tools — convrtr`,
				description: `${tools.length} ${
					tools.length === 1 ? "tool" : "tools"
				} that ${kind} a file, all running in your browser.`,
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: tools.length,
					itemListElement: tools.map((t, idx) => ({
						"@type": "ListItem",
						position: idx + 1,
						name: t.seo.h1,
						url: `${origin}/${t.id}`,
					})),
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Groups",
						item: `${origin}/groups`,
					},
					{
						"@type": "ListItem",
						position: 3,
						name,
						item: url,
					},
				],
			},
		],
	};
}

export function buildCollectivesIndexJsonLd(
	collectives: CollectiveMeta[],
	url: string,
) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: "Collectives — convrtr",
				description:
					"Curated sets of tools built around a reason, not a file type -- everything for one job.",
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: collectives.length,
					itemListElement: collectives.map((c, idx) => ({
						"@type": "ListItem",
						position: idx + 1,
						name: c.title,
						url: `${origin}/collectives/${c.slug}`,
					})),
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Collectives",
						item: url,
					},
				],
			},
		],
	};
}

export function buildCollectiveDetailJsonLd(
	collective: CollectiveMeta,
	tools: Tool[],
	url: string,
) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: `${collective.title} — convrtr`,
				description: collective.why,
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: tools.length,
					itemListElement: tools.map((t, idx) => ({
						"@type": "ListItem",
						position: idx + 1,
						name: t.seo.h1,
						url: `${origin}/${t.id}`,
					})),
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Collectives",
						item: `${origin}/collectives`,
					},
					{
						"@type": "ListItem",
						position: 3,
						name: collective.title,
						item: url,
					},
				],
			},
		],
	};
}

export function buildCompareIndexJsonLd(
	comparisons: ComparisonMeta[],
	url: string,
) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${url}/#webpage`,
				url,
				name: "Format vs Format Technical Comparisons — convrtr",
				description:
					"Direct architectural comparisons between file formats. Compare compression ratios, bit depths, browser support, and quality metrics.",
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: comparisons.length,
					itemListElement: comparisons.map((c, idx) => ({
						"@type": "ListItem",
						position: idx + 1,
						name: c.title,
						url: `${origin}/compare/${c.slug}`,
					})),
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Format Comparisons",
						item: url,
					},
				],
			},
		],
	};
}

export function buildComparisonJsonLd(
	comparisonOrTitle: ComparisonMeta | string,
	descriptionOrUrl: string,
	maybeUrl?: string,
) {
	const isMeta = typeof comparisonOrTitle !== "string";
	const title = isMeta ? comparisonOrTitle.title : comparisonOrTitle;
	const description = isMeta ? comparisonOrTitle.description : descriptionOrUrl;
	const url = isMeta ? descriptionOrUrl : (maybeUrl ?? "");
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "TechArticle",
				"@id": `${url}/#article`,
				headline: title,
				description,
				url,
				author: {
					"@type": "Organization",
					name: "convrtr",
					url: origin,
				},
				publisher: {
					"@type": "Organization",
					name: "convrtr",
					url: origin,
					logo: {
						"@type": "ImageObject",
						url: `${origin}/icon.svg`,
					},
				},
				mainEntityOfPage: {
					"@type": "WebPage",
					"@id": url,
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Format Comparisons",
						item: `${origin}/compare`,
					},
					{
						"@type": "ListItem",
						position: 3,
						name: title,
						item: url,
					},
				],
			},
		],
	};
}

export function buildBlogIndexJsonLd(posts: BlogPostMeta[], url: string) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Blog",
				"@id": `${url}/#blog`,
				url,
				name: "Blog — convrtr",
				description:
					"Deep dives on the file formats and special converters convrtr supports.",
				blogPost: posts.map((p) => ({
					"@type": "BlogPosting",
					headline: p.title,
					description: p.description,
					datePublished: p.publishedAt,
					url: `${origin}/blog/${p.slug}`,
				})),
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Blog",
						item: url,
					},
				],
			},
		],
	};
}

export function buildBlogPostingJsonLd(post: BlogPostMeta, url: string) {
	const origin = getOrigin(url);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "BlogPosting",
				"@id": `${url}/#article`,
				headline: post.title,
				description: post.description,
				datePublished: post.publishedAt,
				dateModified: post.publishedAt,
				url,
				author: {
					"@type": "Organization",
					name: "convrtr",
					url: origin,
				},
				publisher: {
					"@type": "Organization",
					name: "convrtr",
					url: origin,
					logo: {
						"@type": "ImageObject",
						url: `${origin}/icon.svg`,
					},
				},
				mainEntityOfPage: {
					"@type": "WebPage",
					"@id": url,
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: origin,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Blog",
						item: `${origin}/blog`,
					},
					{
						"@type": "ListItem",
						position: 3,
						name: post.title,
						item: url,
					},
				],
			},
		],
	};
}

export function buildWebPageJsonLd({
	title,
	description,
	url,
	breadcrumbs = [],
	type = "WebPage",
}: {
	title: string;
	description: string;
	url: string;
	breadcrumbs?: { name: string; url?: string }[];
	type?: string;
}) {
	const origin = getOrigin(url);
	const graph: Record<string, unknown>[] = [
		{
			"@type": type,
			"@id": `${url}/#webpage`,
			url,
			name: title,
			description,
		},
	];

	if (breadcrumbs.length > 0) {
		graph.push({
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Home",
					item: origin,
				},
				...breadcrumbs.map((crumb, idx) => ({
					"@type": "ListItem",
					position: idx + 2,
					name: crumb.name,
					...(crumb.url ? { item: crumb.url } : {}),
				})),
			],
		});
	}

	return {
		"@context": "https://schema.org",
		"@graph": graph,
	};
}
