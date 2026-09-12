import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FAMILIES_DIR = join("src", "design", "families");
const EDITORIAL_PAGE = join("src", "design", "templates", "EditorialPage.tsx");

/**
 * `FormatStrip` is the one declared full-bleed exemption: v2's continuous
 * scroll rail, which is supposed to run to the glass on both edges. A gutter
 * around it would leave the marquee stopping short of the viewport edge,
 * reading as paused rather than scrolling, so it cancels the shell's padding
 * with an equal negative margin instead of wearing it. Naming it here means
 * the guard below fails loudly if that negative margin ever spreads to a
 * band that was never meant to have it, rather than a broad pattern quietly
 * admitting whichever file happens to match.
 */
const FULL_BLEED_EXEMPT = new Set(["FormatStrip.tsx"]);

/**
 * Every `style={{ ... }}` object literal in a component's source, as a raw
 * string, extracted by brace-counting rather than a regex -- a nested object
 * or an arithmetic expression inside the braces would close a naive
 * non-greedy match early.
 *
 * Scoped per-object, not per-file, because a single family can carry two
 * unrelated style objects that must be judged separately: `FeatureGrid`'s
 * outer grid declares `maxWidth` and no padding, while its inner `data-cell`
 * declares padding and no `maxWidth` -- that padding is a cell text inset,
 * not a gutter, and a file-wide scan would confuse the two.
 */
function extractStyleObjects(source: string): string[] {
	const objects: string[] = [];
	const marker = "style={{";
	let searchFrom = 0;
	let markerIndex = source.indexOf(marker, searchFrom);
	while (markerIndex !== -1) {
		const start = markerIndex + marker.length - 1; // the first "{"
		let depth = 0;
		let end = -1;
		for (let i = start; i < source.length; i++) {
			if (source[i] === "{") depth++;
			else if (source[i] === "}") {
				depth--;
				if (depth === 0) {
					end = i;
					break;
				}
			}
		}
		if (end === -1) break; // unbalanced -- nothing more to extract safely
		objects.push(source.slice(start, end + 1));
		searchFrom = end + 1;
		markerIndex = source.indexOf(marker, searchFrom);
	}
	return objects;
}

/**
 * Whether one style object declares a nonzero horizontal padding, covering
 * both the longhand properties and every value-count of the `padding`
 * shorthand this codebase actually writes:
 *
 *   1 value  ("var(--gap-md)")            -- applies to all sides
 *   2 values ("var(--gap-lg) var(--gap-md)") -- [vertical, horizontal]
 *   3 values ("a b c")                    -- [top, horizontal, bottom]
 *   4 values ("a b c d")                  -- [top, right, bottom, left]
 *
 * A horizontal component of literal `0` does not count: `HeroBand`'s fixed
 * padding is `"var(--gap-lg) 0"` after this task -- vertical padding it has
 * always had, with the horizontal half now owned by the shell instead.
 */
function hasHorizontalPadding(styleObject: string): boolean {
	const isZero = (value: string | undefined) =>
		value === undefined || value === "0" || value === "0px";

	const longhand =
		/padding(?:Left|Right|Inline|InlineStart|InlineEnd)\s*:\s*["'`]([^"'`]+)["'`]/g;
	for (const match of styleObject.matchAll(longhand)) {
		if (!isZero(match[1]?.trim())) return true;
	}

	const shorthand = /(?<![A-Za-z])padding\s*:\s*["'`]([^"'`]+)["'`]/g;
	for (const match of styleObject.matchAll(shorthand)) {
		const values = (match[1] ?? "").trim().split(/\s+/);
		const horizontals: (string | undefined)[] =
			values.length <= 1
				? [values[0]]
				: values.length === 2
					? [values[1]]
					: values.length === 3
						? [values[1]]
						: [values[1], values[3]];
		if (horizontals.some((value) => !isZero(value))) return true;
	}

	return false;
}

const familyFiles = readdirSync(FAMILIES_DIR).filter((name) =>
	name.endsWith(".tsx"),
);

/**
 * `BarChart`, `FusedHeadline` and `DotMatrix` are never mounted directly by
 * `HomePage`'s own bands array -- they are composed INSIDE another family
 * that already carries the cap, or they are a content-shape-agnostic wrapper
 * with no width opinion of its own:
 *
 *   BarChart      rendered inside HeroBand's own capped section.
 *   FusedHeadline rendered inside both HeroBand and ToolGrid, both capped.
 *   DotMatrix     the grain overlay, nothing else. It wraps HeroBand (already
 *                 capped) and, on the home page, TerminalPanel's own
 *                 cap-carrying wrapper. A cap on DotMatrix itself would
 *                 additionally constrain whichever consumer is capped
 *                 tighter than DotMatrix's own value, silently changing that
 *                 consumer's width instead of just duplicating it -- the
 *                 same reasoning that keeps EditorialPage's shell padding-only.
 *   ProseSection  one section of running prose (`/about`, `/privacy`,
 *                 `/legal/terms`, ...), always mounted inside `ArticlePage`'s
 *                 `[data-prose]` or `LegalPage`'s `[data-legal-prose]`, both of
 *                 which already carry the page's prose measure in
 *                 `templates.css`. A `var(--max-width)` cap here would compete
 *                 with that ambient measure rather than duplicate it -- the
 *                 same trap `TerminalPanel`'s own doc comment records for a
 *                 capped element nested inside a narrower measure elsewhere.
 *
 * None of these renders a full-width page section on its own, so "every
 * band declares its own cap" below does not apply to them -- named here
 * rather than left for a looser check to miss the distinction.
 */
const NOT_BAND_LEVEL = new Set([
	"BarChart.tsx",
	"CollapsibleSection.tsx",
	"FusedHeadline.tsx",
	"DotMatrix.tsx",
	"ProseSection.tsx",
]);

describe("band gutter: one owner, not four patches", () => {
	for (const file of familyFiles) {
		const source = readFileSync(join(FAMILIES_DIR, file), "utf8");
		const cappedObjects = extractStyleObjects(source).filter((object) =>
			object.includes('maxWidth: "var(--max-width)"'),
		);

		if (cappedObjects.length === 0) continue;

		it(`${file}: a var(--max-width) band declares no horizontal padding of its own`, () => {
			// A band that insets itself inside a shell that already insets it is
			// double-gutted. A band that insets itself when the shell does not is
			// the exact inconsistency this task exists to remove -- some bands
			// touching the glass, some not, for no reason a reader could name.
			// Either way, the shell owns the gutter now; the band owns only its
			// cap.
			for (const styleObject of cappedObjects) {
				expect(hasHorizontalPadding(styleObject)).toBe(false);
			}
		});
	}

	it("no family other than the declared exemption cancels the shell's gutter", () => {
		// A negative horizontal margin is the one way a band could opt back out
		// of the shell's padding. `FormatStrip` needs exactly that to stay
		// full-bleed; nothing else should be reaching for the same escape
		// hatch, silently or otherwise.
		const offenders: string[] = [];
		for (const file of familyFiles) {
			if (FULL_BLEED_EXEMPT.has(file)) continue;
			const source = readFileSync(join(FAMILIES_DIR, file), "utf8");
			if (/margin(?:Inline|Left|Right)?\s*:\s*["'`]calc\(.*-1/.test(source)) {
				offenders.push(file);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("still sees the exemption it names -- FormatStrip actually cancels the gutter", () => {
		// Non-vacuity: if the negative margin ever moves off FormatStrip or is
		// deleted, this fails rather than the exemption above quietly covering
		// nothing.
		for (const file of FULL_BLEED_EXEMPT) {
			const source = readFileSync(join(FAMILIES_DIR, file), "utf8");
			expect(source).toMatch(
				/margin(?:Inline|Left|Right)?\s*:\s*["'`]calc\(.*-1/,
			);
		}
	});
});

describe("every band-level family declares its own cap", () => {
	// The mirror image of the gutter check above. A band with no
	// `var(--max-width)` cap runs the shell's full width forever, including
	// past 1600px where every capped sibling stops -- exactly how
	// `TerminalPanel` ended up wider than its neighbours above 1600px: the
	// same inconsistency the gutter fix exists to remove, one width band up,
	// invisible below 1600px because the missing cap never bound there.
	// `FormatStrip` is exempt for the same full-bleed reason it is exempt
	// from the gutter itself -- v2's continuous scroll rail has no cap by
	// design, not by oversight.
	const bandLevelFiles = familyFiles.filter(
		(file) => !NOT_BAND_LEVEL.has(file) && !FULL_BLEED_EXEMPT.has(file),
	);

	for (const file of bandLevelFiles) {
		it(`${file}: declares var(--max-width) somewhere in its own source`, () => {
			const source = readFileSync(join(FAMILIES_DIR, file), "utf8");
			expect(source).toMatch(/maxWidth:\s*"var\(--max-width\)"/);
		});
	}

	it("the exemption lists name real files, and do not swallow every family", () => {
		// Non-vacuity, both directions: a typo'd filename in either exemption
		// set would silently exempt nothing (the `.has()` check above would
		// just never match), and a check that scans zero files proves nothing
		// either way. This pins that every exempted name is a real file in
		// `src/design/families/`, and that at least one real file is actually
		// scanned by the loop above.
		for (const file of [...NOT_BAND_LEVEL, ...FULL_BLEED_EXEMPT]) {
			expect(familyFiles).toContain(file);
		}
		expect(bandLevelFiles.length).toBeGreaterThan(0);
	});
});

describe("the shell owns the gutter", () => {
	// The padding lives inline in EditorialPage.tsx, next to the `gap` this
	// same shell already sets from the scale -- templates.css's own header
	// comment states the rule this follows: "Anything expressible inline
	// belongs inline, next to the template that owns it," reserving that
	// stylesheet for what a style object cannot express, like a media query.
	// A static var() is expressible inline, so that is where this lives too.
	const shell = readFileSync(EDITORIAL_PAGE, "utf8");

	it("[data-editorial] declares a horizontal padding drawn from the scale", () => {
		expect(shell).toMatch(/data-editorial/);
		expect(shell).toMatch(/padding:\s*"0 var\(--gap-md\)"/);
	});

	it("declares no competing max-width alongside that padding", () => {
		// A cap on the shell would eat its own padding before any child's own
		// var(--max-width) got to measure against it -- the exact trap this
		// file's own comment already records for the missing cap, the same
		// mistake on the other property.
		expect(shell).not.toMatch(/maxWidth/);
	});
});
