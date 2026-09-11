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

/**
 * Routes with no registry behind them: one `page.tsx` each, so there is
 * nothing to derive and no risk of drifting from what actually built.
 */
const STATIC_PATHS = [
	"/",
	"/convert",
	"/tools",
	"/blog",
	"/groups",
	"/collectives",
	"/about",
	"/how-it-works",
	"/privacy",
	"/auth",
	"/history",
	"/compare",
	"/legal/terms",
	"/legal/privacy-policy",
	"/legal/licences",
];

/**
 * Spec §7.5: derived from the same registries the routes themselves are
 * generated from, so a route that exists is listed here and a route that
 * doesn't cannot be -- the two are read from one source, not kept in sync
 * by hand. `TOOLS`, `BLOG_POSTS`, `COLLECTIVES` and the two `derive*Groups`
 * functions are exactly what `generateStaticParams` in each dynamic route
 * calls; a tool, post, collective or group registered anywhere else in this
 * plan appears here automatically, with no edit to this file.
 *
 * `/[category]`'s own path set is the one exception with no registry
 * function to call directly -- it's every category at least one tool
 * declares, the same set `getToolsByCategory(category).length > 0` filters
 * `generateStaticParams` down to there. A `Set` over `TOOLS` reproduces
 * that filter exactly: a category with zero tools can never appear in it.
 */
function toolPaths(): string[] {
	const categories = new Set(TOOLS.map((tool) => tool.category));
	return [
		...[...categories].map((category) => `/${category}`),
		...TOOLS.map((tool) => `/${tool.id}`),
	];
}

export default function sitemap(): MetadataRoute.Sitemap {
	const paths = [
		...STATIC_PATHS,
		...toolPaths(),
		...BLOG_POSTS.map((post) => `/blog/${post.slug}`),
		...COLLECTIVES.map((collective) => `/collectives/${collective.slug}`),
		...COMPARISONS.map((comparison) => `/compare/${comparison.slug}`),
		...deriveFormatGroups().map((group) => `/groups/format/${group.format}`),
		...deriveTaskGroups().map((group) => `/groups/task/${group.kind}`),
	];

	return paths.map((path) => ({ url: `${SITE}${path}` }));
}
