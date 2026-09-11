import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/content/blog/registry";
import { COLLECTIVES } from "@/content/collectives/registry";
import { COMPARISONS } from "@/content/compare/registry";
import { TOOLS } from "@/core/registry";
import { deriveFormatGroups, deriveTaskGroups } from "@/core/registry/groups";
import { SITE } from "@/lib/site";

// Static export note: same reason `manifest.ts` states one -- this compiles
// to a Route Handler with no request-time input, and `output: "export"`
// refuses to export one unless it is explicitly marked static.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
	const now = new Date();
	const categories = [...new Set(TOOLS.map((tool) => tool.category))];

	const entries: MetadataRoute.Sitemap = [
		// Primary entry points
		{
			url: `${SITE}/`,
			lastModified: now,
			changeFrequency: "daily",
			priority: 1.0,
		},
		{
			url: `${SITE}/convert`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.95,
		},
		{
			url: `${SITE}/tools`,
			lastModified: now,
			changeFrequency: "daily",
			priority: 0.85,
		},
		{
			url: `${SITE}/groups`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${SITE}/collectives`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${SITE}/compare`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${SITE}/blog`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${SITE}/about`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${SITE}/how-it-works`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${SITE}/privacy`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${SITE}/auth`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.4,
		},
		{
			url: `${SITE}/history`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.4,
		},
		{
			url: `${SITE}/legal/terms`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE}/legal/privacy-policy`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${SITE}/legal/licences`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.3,
		},

		// Category hubs
		...categories.map((category) => ({
			url: `${SITE}/${category}`,
			lastModified: now,
			changeFrequency: "weekly" as const,
			priority: 0.85,
		})),

		// Tool pages
		...TOOLS.map((tool) => ({
			url: `${SITE}/${tool.id}`,
			lastModified: now,
			changeFrequency: "weekly" as const,
			priority: 0.9,
		})),

		// Blog posts
		...BLOG_POSTS.map((post) => ({
			url: `${SITE}/blog/${post.slug}`,
			lastModified: new Date(post.publishedAt),
			changeFrequency: "monthly" as const,
			priority: 0.7,
		})),

		// Collectives
		...COLLECTIVES.map((collective) => ({
			url: `${SITE}/collectives/${collective.slug}`,
			lastModified: now,
			changeFrequency: "weekly" as const,
			priority: 0.8,
		})),

		// Comparisons
		...COMPARISONS.map((comparison) => ({
			url: `${SITE}/compare/${comparison.slug}`,
			lastModified: now,
			changeFrequency: "monthly" as const,
			priority: 0.8,
		})),

		// Groups: Format & Task
		...deriveFormatGroups().map((group) => ({
			url: `${SITE}/groups/format/${group.format}`,
			lastModified: now,
			changeFrequency: "weekly" as const,
			priority: 0.75,
		})),
		...deriveTaskGroups().map((group) => ({
			url: `${SITE}/groups/task/${group.kind}`,
			lastModified: now,
			changeFrequency: "weekly" as const,
			priority: 0.75,
		})),
	];

	return entries;
}
