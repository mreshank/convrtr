import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards a bug that shipped silently and would have been invisible in
 * production until users stopped receiving updates.
 *
 * `readBuildId` used to scan `out/_next/static` for "the directory that isn't
 * chunks or media". When the build began emitting a `css/` directory, `css`
 * sorted first and every cache was named `convrtr-shell-css` — constant across
 * every deploy. The service worker's activate handler only deletes caches
 * outside the current set, so constant names mean stale caches are never
 * purged: ship a fix, and users keep running the old app indefinitely.
 *
 * These run against a real build output when one is present, and skip
 * otherwise so the unit suite stays runnable without a build.
 */
const SW = "out/sw.js";
const BUILD_ID_FILE = ".next/BUILD_ID";
const built = existsSync(SW) && existsSync(BUILD_ID_FILE);

describe.skipIf(!built)("generated service worker", () => {
	const sw = built ? readFileSync(SW, "utf8") : "";
	const buildId = built ? readFileSync(BUILD_ID_FILE, "utf8").trim() : "";

	/**
	 * Guards the second bug of exactly the same shape: something cached under a
	 * key nothing ever asks for, invisible because the failure looks like
	 * success.
	 *
	 * App Router chunks live in directories named for their dynamic segments
	 * (`app/[category]/[slug]/`), and Next requests them with those segments
	 * percent-encoded. Cache Storage matches by URL string, so precaching the
	 * literal-bracket path meant every tool page loaded its HTML offline and
	 * then failed to fetch its own JavaScript — the shell rendered, React never
	 * hydrated, and nothing on the page worked. "Offline support" appeared to
	 * function precisely because the visible part did.
	 */
	it("precaches dynamic-route chunks under the URL the browser requests", () => {
		const urls: string[] = JSON.parse(
			sw.slice(sw.indexOf("const PRECACHE_URLS = ") + 22, sw.indexOf("];") + 1),
		);

		const literal = urls.filter(
			(url) => url.includes("[") || url.includes("]"),
		);
		expect(
			literal,
			"a precache key with literal brackets is never matched by Next's percent-encoded request",
		).toEqual([]);

		// And the encoded form is actually present — otherwise this passes
		// trivially on a build that emitted no dynamic routes at all.
		expect(
			urls.some((url) => url.includes("%5B") && url.endsWith(".js")),
			"expected at least one percent-encoded dynamic-route chunk",
		).toBe(true);
	});

	it("names every cache after the real build id", () => {
		const names = [...sw.matchAll(/"(convrtr-[a-z-]+-([A-Za-z0-9_-]+))"/g)].map(
			(m) => ({ full: m[1], suffix: m[2] }),
		);
		expect(names.length).toBeGreaterThan(0);
		for (const name of names) {
			expect(
				name.suffix,
				`${name.full} must be suffixed with the build id`,
			).toBe(buildId);
		}
	});

	it("never suffixes a cache with a static asset directory name", () => {
		// The exact failure mode: `css`, `chunks` and `media` are sibling
		// directories of the build-id directory, not versions.
		for (const decoy of ["css", "chunks", "media"]) {
			expect(sw).not.toContain(`convrtr-shell-${decoy}"`);
			expect(sw).not.toContain(`convrtr-runtime-${decoy}"`);
		}
	});

	it("purges caches outside the current set on activate", () => {
		expect(sw).toMatch(/caches\.delete/);
	});
});
