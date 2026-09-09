"use client";

import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/core/registry/types";
import { SiteFooter, type SiteFooterProps } from "./SiteFooter";

/**
 * A converter route is exactly `/[category]/[slug]` -- two path segments,
 * the first a registered category (`image`, `video`, `audio`, `document`,
 * `data`). Every other route in the app is either one segment
 * (`/tools`, `/about`, `/image`) or a different two-segment shape whose
 * first segment is not a category (`/legal/terms`, `/groups/format`) --
 * checking against the same closed `CATEGORIES` list `/[category]/page.tsx`
 * itself filters against means this can never drift out of step with what
 * actually gets a converter page.
 *
 * Exported for `RouteAwareFooter.test.ts` to pin against fixture paths --
 * the same "a corpus that is clean today proves nothing about whether the
 * pattern itself is right" reasoning `texture-placement.test.ts` and
 * `tokens.test.ts` give for their own pinned tables.
 *
 * Takes `string | null` rather than trusting `usePathname()`'s declared
 * `string` return: outside a real app-router tree -- `layout.test.tsx`
 * renders `RootLayout` directly with no router context -- it reads its
 * backing React context with no provider and returns `null` at runtime,
 * the declared type notwithstanding. `null` (or, defensively, `undefined`)
 * answers "not a converter route": the textured footer is the default
 * everywhere, and only a positively-matched converter path turns it off.
 */
export function isConverterRoute(pathname: string | null | undefined): boolean {
	if (!pathname) return false;
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length !== 2) return false;
	// `noUncheckedIndexedAccess` types a plain array's index access as
	// `string | undefined` even right after the length check above --
	// the `?? ""` below is dead code, never a real category match, not a
	// loosening of the check itself.
	return (CATEGORIES as readonly string[]).includes(segments[0] ?? "");
}

/**
 * `SiteFooter` lives in the root layout, so it renders on every route --
 * including the converter's, the one page the plan requires to render no
 * canvas at all so a decorative shader never competes with the WASM codec
 * running there for GPU and main-thread time.
 * `src/design/__tests__/texture-placement.test.ts` proves no converter
 * *route file* imports `@/design/texture`, but a source-level import sweep
 * cannot see through a shared layout's own composition -- it stayed green
 * while the built `/image/heic-to-jpg` output rendered
 * `footer-branch-network` anyway.
 *
 * This is the layout's actual mount point instead: a client component
 * (required for `usePathname`, which a `layout.tsx` exporting `metadata`
 * cannot become itself) that reads the current path and asks `SiteFooter`
 * to skip its shader on exactly the routes that must never draw one --
 * everywhere else, `plain` is false and the footer is unchanged.
 */
export function RouteAwareFooter(props: SiteFooterProps) {
	const pathname = usePathname();
	return <SiteFooter {...props} plain={isConverterRoute(pathname)} />;
}
