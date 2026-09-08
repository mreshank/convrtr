import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Design-system guards have to look at every file that could carry a
 * violation, not just the token file — components in this codebase style
 * themselves with inline `style={{ ... }}` in `.tsx`, which is exactly where
 * a stray gradient or an off-system radius gets written and where a
 * token-file-only check would never see it.
 */
function collectSourceFiles(root: string, extensions: string[]): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(root)) {
		const full = join(root, entry);
		if (statSync(full).isDirectory()) {
			out.push(...collectSourceFiles(full, extensions));
			continue;
		}
		if (extensions.some((ext) => entry.endsWith(ext))) out.push(full);
	}
	return out;
}

const sourceFileContents = collectSourceFiles("src", [".tsx", ".css"]).map(
	(path) => ({ path, content: readFileSync(path, "utf8") }),
);

const tokens = readFileSync("src/design/tokens.css", "utf8");

/**
 * v2's radius set, and what each value is permitted for.
 *
 *   0    everything structural — cards, panels, grids, media. v2's
 *        guardrail (DESIGN.v2.md:173) calls 0px structural, its prose
 *        (:122) specifies "sharp, zero-radius utility components", and
 *        five card/button components declare 0px: button-mint-fill,
 *        button-outline-square, card-panel-media-right,
 *        card-media-top-bleed, card-feature-grid (lines 81, 88, 106,
 *        110, 114). Frontmatter's `card: "4px"` (:56-57) loses to prose,
 *        guardrail, and component evidence.
 *   4    nav-utility controls only. Frontmatter's `control: "4px"` (:56-57)
 *        is honoured — DESIGN.v2.md:137 corroborates ("nav-utility buttons
 *        ... 4px radius, 23px tall"). Not panel/feature-grid cards.
 *   40   marquee cards only, from v2's own Special Components.
 *   100  marquee cards only, likewise.
 *   9999 pills and status dots, expressed as --radius-pill or inline as %.
 *
 * The pill (9999px) is expressed as a `%` or as `--radius-pill` and is
 * exempted by the `%` branch below.
 */
const ALLOWED_RADII = new Set([0, 4, 40, 100, 9999]);

describe("radius system", () => {
	it("declares no custom radius property outside the system", () => {
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (!path.endsWith(".css")) continue;
			for (const match of content.matchAll(
				/--radius[\w-]*\s*:\s*([\d.]+)px/g,
			)) {
				const value = Number(match[1]);
				if (!ALLOWED_RADII.has(value)) {
					offenders.push(`${path}: ${match[0].trim()}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("hardcodes no inline border-radius outside the system", () => {
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (!path.endsWith(".tsx")) continue;
			for (const match of content.matchAll(
				/border(?:Top|Bottom)?(?:Left|Right)?Radius:\s*["'](\d+(?:\.\d+)?)(px|%)["']/g,
			)) {
				const value = Number(match[1]);
				const unit = match[2];
				if (unit === "%") continue; // pills are fully rounded by design
				if (!ALLOWED_RADII.has(value)) {
					offenders.push(`${path}: ${match[0].trim()}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("makes structural radius zero, not four", () => {
		// v2's frontmatter `card: "4px"` and its prose disagree; the spec
		// ruled for the prose, the guardrail, and five card/button components.
		// See the comment above ALLOWED_RADII for the evidence.
		expect(tokens).toMatch(/--radius:\s*0\s*;/);
		expect(tokens).toMatch(/--radius-control:\s*4px/);
		expect(tokens).toMatch(/--radius-pill:\s*9999px/);
	});
});

/**
 * Applies the CSS-property border-width sweep to one file's contents.
 * Extracted so the regexes' behaviour can be pinned directly against a table
 * of fixtures (see "CSS border-weight regex" below), rather than only being
 * observed indirectly through whatever `src` happens to contain today — a
 * corpus that can look clean while the regex underneath it is wrong.
 */
function findOversizedCssBorders(content: string): string[] {
	const offenders: string[] = [];
	// Kebab-case CSS: `border: 1px`, `border-left: 2px`, `border-top-width: 3px`.
	// The side word is a closed set (top/right/bottom/left/block/inline, with
	// an optional logical start/end suffix) so `radius`, `color`, `style` and
	// `spacing` can never be mistaken for a width.
	for (const match of content.matchAll(
		/border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-width)?\s*:\s*["']?(\d+(?:\.\d+)?)px/g,
	)) {
		if (Number(match[1]) > 1) offenders.push(match[0].trim());
	}
	// camelCase JSX style props: `borderWidth: "1px"`, `borderLeftWidth: "2px"`.
	// No `i` flag on either pattern is deliberate: case is what separates this
	// syntax from the kebab-case one above, so mixing them back together would
	// reopen the same hole — a bare `border` fragment could match whichever
	// pattern's optional groups happened to collapse to nothing.
	for (const match of content.matchAll(
		/border(?:Top|Right|Bottom|Left|Block|Inline)?(?:Start|End)?(?:Width)?\s*:\s*["']?(\d+(?:\.\d+)?)px/g,
	)) {
		if (Number(match[1]) > 1) offenders.push(match[0].trim());
	}
	return offenders;
}

describe("border weight", () => {
	// DESIGN.md: "DO NOT: Use borders heavier than 1px." Elevation is a
	// hairline, never a shadow — so the hairline itself has to stay a
	// hairline.
	//
	// Two syntaxes, because this codebase writes borders both ways and a
	// sweep that understands only one exempts the other silently. The
	// CSS-property form catches `border-left: 2px` in a style block or
	// style object; the utility form catches Tailwind's `border-2`,
	// `border-l-2` and their arbitrary-value variants in a className. A
	// bare `border` or `border-l` utility is already 1px and legal, so only
	// the numbered forms are examined.
	it("declares no CSS border wider than 1px", () => {
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			for (const hit of findOversizedCssBorders(content)) {
				offenders.push(`${path}: ${hit}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("uses no Tailwind border utility wider than 1px", () => {
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			// `border-2`, `border-l-2`, `border-x-4`
			for (const match of content.matchAll(/\bborder(?:-[trblxy])?-(\d+)\b/g)) {
				if (Number(match[1]) > 1) offenders.push(`${path}: ${match[0]}`);
			}
			// `border-[3px]`, `border-l-[2px]`
			for (const match of content.matchAll(
				/\bborder(?:-[trblxy])?-\[(\d+(?:\.\d+)?)px\]/g,
			)) {
				if (Number(match[1]) > 1) offenders.push(`${path}: ${match[0]}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});

describe("CSS border-weight regex", () => {
	// Pins findOversizedCssBorders's behaviour against fixture strings
	// directly, rather than relying on whatever `src` happens to contain
	// today. A sweep whose corpus doesn't currently exercise a given shape
	// can look correct while the regex underneath it is wrong — which is
	// exactly how a single loose pattern shipped that flagged
	// `border-radius: 40px` as an over-weight border, defeating the point of
	// admitting DESIGN.md's own card radii.
	const mustFlag = [
		"border: 2px",
		"border-left: 2px",
		"border-top-width: 3px",
		'borderWidth: "2px"',
		'borderLeftWidth: "2px"',
	];

	const mustNotFlag = [
		"border-radius: 40px",
		"border-radius: 100px",
		"border-top-left-radius: 100px",
		'borderRadius: "40px"',
		'borderTopLeftRadius: "100px"',
		"border-color: var(--hairline)",
		"border-spacing: 2px",
		"border: 1px",
		'borderWidth: "1px"',
	];

	it.each(mustFlag)("flags %j as an over-weight border", (input) => {
		expect(findOversizedCssBorders(input).length).toBeGreaterThan(0);
	});

	it.each(mustNotFlag)("does not flag %j", (input) => {
		expect(findOversizedCssBorders(input)).toEqual([]);
	});
});

/**
 * v2's spacing scale, and the per-component literals it does not cover.
 *
 * Colour, radius, easing and duration are closed sets with sweeps behind
 * them. Spacing was not, and two chrome components had already produced
 * three ad-hoc scales — 14px was a token and a literal in the same file.
 * v2 supplies the scale, so it gets a guard.
 *
 *   0   no space at all, and the `0` of a shorthand pair.
 *   1   hairlines, which are a border weight rather than a gap.
 *   14  v2's nav-utility horizontal padding (`DESIGN.v2.md:137`:
 *       "transparent-fill, white text, 4px radius, 23px tall, 0px/14px
 *       padding"), a per-component value exactly like the heights below.
 *   23  nav-utility control height, same line of v2.
 *   36  navbar-cta height.
 *   44  the minimum touch target.
 *
 * Everything else is a gap, a pad or a measure, and belongs to --gap-sm,
 * --gap-md, --gap-lg, --section-pad, --max-width or a multiple of
 * --space-base.
 */
const ALLOWED_LITERAL_PX = new Set([0, 1, 14, 23, 36, 44]);

/**
 * Every spacing property whose quoted value carries a px length the scale
 * does not admit.
 *
 * Two deliberate details, both of which a narrower pattern got wrong:
 *
 * The alternation names `maxWidth`/`minWidth`/`maxHeight`/`minHeight`
 * explicitly rather than relying on the `[A-Za-z]*` suffix, which only
 * reaches *trailing* words (`marginTop`) and lets a hard-coded
 * `maxWidth: "1600px"` past entirely — and `--max-width` is a token this
 * system supplies, so that literal is precisely what this sweep is for.
 * Explicit alternatives rather than an `i` flag: `/i` would also match
 * `strokeWidth`, which FidelityScore sets on the ring and which is a line
 * weight, not spacing.
 *
 * The leading `\b` closes the substring hole the flag would otherwise
 * leave open from the other end. Without it `stopColor: "12px"` matches on
 * the `top` inside `stop`, and `copyright: "20px"` on the `right` inside
 * `copyright` — verified, both flagged. See the fixture table below.
 *
 * The whole quoted value is captured and then scanned for px lengths,
 * rather than the value being required to *be* a single length. A
 * shorthand is the obvious way to write an ad-hoc spacing pair, so
 * `padding: "13px 27px"` has to be legible to the sweep; matching only a
 * lone length would wave it straight through.
 */
const SPACING_PROPERTY =
	/\b(?:padding|margin|gap|width|height|top|left|right|bottom|maxWidth|minWidth|maxHeight|minHeight)[A-Za-z]*:\s*["']([^"']*)["']/g;

function findAdHocSpacing(content: string): string[] {
	const offenders: string[] = [];
	for (const match of content.matchAll(SPACING_PROPERTY)) {
		for (const length of (match[1] ?? "").matchAll(/(\d+(?:\.\d+)?)px/g)) {
			if (!ALLOWED_LITERAL_PX.has(Number(length[1]))) {
				offenders.push(match[0].trim());
			}
		}
	}
	return offenders;
}

describe("spacing scale", () => {
	it("writes no ad-hoc spacing literal", () => {
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (!path.endsWith(".tsx")) continue;
			for (const hit of findAdHocSpacing(content)) {
				offenders.push(`${path}: ${hit}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});

describe("spacing sweep regex", () => {
	// Pinned against fixtures directly, like the border-weight and
	// cursor-none guards above, and for the same reason: a corpus that is
	// clean today says nothing about whether the regex under it would catch
	// tomorrow's violation. This project has already shipped a guard whose
	// optional group swallowed part of a neighbouring property name, and a
	// sweep that over-matches gets deleted by the next person who trips on
	// it.
	const mustFlag = [
		'padding: "13px"',
		'gap: "18px"',
		'marginTop: "40px"',
		// The widened alternation. `--max-width` exists; this literal is the
		// case the lowercase-only pattern let through.
		'maxWidth: "1600px"',
		'minHeight: "50px"',
		// Shorthand, both halves ad-hoc.
		'padding: "13px 27px"',
		// Shorthand, one half ad-hoc: still a violation.
		'margin: "0 13px"',
		'padding: "0 14px 13px"',
		// A length buried in a calc() is still a length.
		'height: "calc(100% - 24px)"',
	];

	const mustNotFlag = [
		'padding: "var(--gap-md)"',
		'gap: "var(--gap-sm)"',
		'padding: "0 var(--gap-md)"',
		// v2's own per-component values.
		'padding: "0 14px"',
		'height: "23px"',
		'height: "36px"',
		'minHeight: "44px"',
		'width: "1px"',
		'padding: "0"',
		'padding: "0px"',
		// Not a length at all.
		'maxWidth: "32ch"',
		// A stroke is a line weight, not spacing — the reason there is no
		// `i` flag.
		'strokeWidth: "3.6px"',
		// The two substring traps the leading \b closes: `top` inside
		// `stop`, `right` inside `copyright`.
		'stopColor: "12px"',
		'copyright: "20px"',
		// Type, not space.
		'fontSize: "14px"',
		'lineHeight: "20px"',
		// A track template is neither a gap nor a pad, and no token in the
		// scale describes one.
		'gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))"',
	];

	it.each(mustFlag)("flags %j as an ad-hoc spacing literal", (input) => {
		expect(findAdHocSpacing(input).length).toBeGreaterThan(0);
	});

	it.each(mustNotFlag)("does not flag %j", (input) => {
		expect(findAdHocSpacing(input)).toEqual([]);
	});
});

/**
 * `linear-gradient` in these two files is not a decorative fill — it is the
 * alpha channel of MediaFrame's `mask-image` (task 9's fade-to-canvas
 * mechanism) and the test that asserts on that same string literal. A mask's
 * gradient controls opacity, not paint, so it carries none of the visual
 * weight `box-shadow` or `backdrop-filter` would — the same distinction
 * `LITERAL_HEX_ALLOWED` already draws for this file's `#000`. Scoped to the
 * "gradient" keyword only: a `box-shadow` or `backdrop-filter` written into
 * either file would still fail this guard.
 */
const GRADIENT_ALLOWED = new Set([
	join("src", "design", "primitives", "MediaFrame.tsx"),
	join("src", "design", "__tests__", "MediaFrame.test.tsx"),
]);

describe("forbidden visual devices", () => {
	it("uses none anywhere in src", () => {
		// Carried over unchanged from the v1 design system. DESIGN.md does not
		// contradict any of these, so §14 of the spec keeps them in force.
		const shadowOrBlur = /box-shadow|boxShadow|backdrop-filter|backdropFilter/i;
		const gradient = /gradient/i;
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (shadowOrBlur.test(content)) {
				offenders.push(path);
				continue;
			}
			if (gradient.test(content) && !GRADIENT_ALLOWED.has(path)) {
				offenders.push(path);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("actively scans src/design", () => {
		// This sweep now covers all of `src`, including `src/design` — the
		// directory the old sweep in src/styles/__tests__/tokens.test.ts had
		// to special-case around while `src/design` held radii the old 4px
		// ceiling could not admit. That exclusion sat at the collection level
		// and silently disabled every sweep for the whole directory, not just
		// the radius checks it was meant to loosen. A guard whose coverage can
		// be silently removed by an unrelated edit is not a guard, so this
		// asserts the file list this sweep actually walks still contains a
		// path under src/design/ — proof the coverage stayed live.
		const designFiles = sourceFileContents
			.filter(({ path }) => path.startsWith("src/design/"))
			.map(({ path }) => path);
		expect(designFiles.length).toBeGreaterThan(0);
	});
});

describe("motion and focus base rules", () => {
	const globals = readFileSync("src/app/globals.css", "utf8");

	it("honours prefers-reduced-motion", () => {
		expect(globals).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
	});

	it("collapses animation and transition duration under reduced motion", () => {
		const block = globals.match(
			/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/,
		)?.[1];
		expect(block).toBeDefined();
		expect(block).toMatch(/animation-duration:\s*0\.01ms/);
		expect(block).toMatch(/transition-duration:\s*0\.01ms/);
	});

	it("collapses animation delay under reduced motion too", () => {
		// A collapsed duration alone does not stop a staggered animation: the
		// delay still runs in full, and `animation-fill-mode: both` holds each
		// fragment at its BACKWARDS fill — translateY(100%), clipped away by
		// the parent's overflow — for the whole of it. Reproduced in Chromium
		// with reducedMotion "reduce": without the delay collapse, the last
		// fragment of a 31-character char-split headline was still fully
		// displaced at t=550ms and at t=950ms, resolving only past t=1.2s. So
		// a DisplayHeadline assembled itself character by character for well
		// over a second for someone who asked for less movement. Spec §4.6:
		// "reveals resolve instantly to their final state."
		//
		// The rule is universal rather than scoped to [data-reveal-part]
		// because the stagger idiom is not specific to the reveal — the next
		// primitive that delays an animation would reintroduce the same bug
		// silently — and because collapsing the timing of every animation is
		// already this block's job. Zeroing a delay only ever changes when an
		// animation starts, never how it ends.
		const block = globals.match(
			/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/,
		)?.[1];
		expect(block).toBeDefined();
		expect(block).toMatch(/animation-delay:\s*0s\s*!important/);
	});

	it("gives keyboard focus a visible outline", () => {
		// The difference cursor is mouse-only, so without this a keyboard user
		// has no indication of what is focused at all.
		expect(globals).toMatch(/:focus-visible/);
		expect(globals).toMatch(/outline:\s*1px solid var\(--ink\)/);
	});
});

/**
 * Returns the enclosing selector of every `cursor: none` declaration in a
 * stylesheet, normalised to one line.
 *
 * Comments are stripped first: `cursor: none` written in prose is not a
 * declaration, and the braces around a comment are not its rule. Stripping
 * also stops the backwards scan for the selector from landing inside one.
 *
 * The scan walks back from the declaration to the nearest `{` — its own
 * rule's — and then to whatever ended the statement or block before it, so
 * a rule nested in an `@media` yields the inner selector list and not the
 * media prelude.
 */
function findCursorNoneRules(content: string): string[] {
	const rules: string[] = [];
	const css = content.replace(/\/\*[\s\S]*?\*\//g, "");
	for (const match of css.matchAll(/cursor:\s*none/g)) {
		const before = css.slice(0, match.index);
		const open = before.lastIndexOf("{");
		if (open === -1) {
			rules.push("<no enclosing rule>");
			continue;
		}
		const start = Math.max(
			before.lastIndexOf("{", open - 1),
			before.lastIndexOf("}", open),
			before.lastIndexOf(";", open),
		);
		rules.push(
			before
				.slice(start + 1, open)
				.replace(/\s+/g, " ")
				.trim(),
		);
	}
	return rules;
}

/**
 * A `cursor: none` rule is safe only if EVERY selector in its list is
 * scoped to the class DifferenceCursor adds to <body> on mount. Each
 * comma-separated part is checked separately, because
 * `body.has-custom-cursor, body *` would otherwise pass on the strength of
 * its first half while its second half hid the pointer unconditionally.
 *
 * A `:has(a, b)` selector would be split at the comma inside the
 * parentheses and flagged. That is a false positive, and the safe
 * direction: it fails loudly and forces whoever writes it to look.
 */
function findUnguardedCursorNone(content: string): string[] {
	return findCursorNoneRules(content).filter((selector) =>
		selector.split(",").some((part) => !part.includes("has-custom-cursor")),
	);
}

describe("hiding the system cursor", () => {
	// The failure mode here is the worst in the design system: a visitor
	// whose JavaScript failed, was blocked, or has not hydrated yet is left
	// with no pointer at all and no way to get one back. `cursor: none` is
	// therefore legal ONLY under the class DifferenceCursor adds to <body>
	// itself, which cannot be set unless a replacement circle is genuinely
	// on screen.
	//
	// This used to be asserted as `expect(globals).not.toMatch(/cursor:
	// none/)` — against globals.css alone, while the rule lived in
	// primitives.css. It passed while proving nothing: a bare
	// `body { cursor: none }` added to primitives.css shipped green. So the
	// sweep now covers every stylesheet under src and checks the selector
	// each occurrence is scoped to, rather than checking one file for the
	// absence of a string.
	const stylesheets = sourceFileContents.filter(({ path }) =>
		path.endsWith(".css"),
	);

	it("scopes every cursor: none in src to the custom-cursor class", () => {
		const offenders: string[] = [];
		for (const { path, content } of stylesheets) {
			for (const selector of findUnguardedCursorNone(content)) {
				offenders.push(`${path}: ${selector}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("still sees the rule it exists to police", () => {
		// Non-vacuity, concretely: the sweep must be finding the real
		// declaration in the real stylesheet. Without this the suite would
		// go quiet again the moment the rule moved to a file the corpus
		// missed — which is exactly how the previous version of this guard
		// stopped working.
		const found = stylesheets.flatMap(({ path, content }) =>
			findCursorNoneRules(content).map((selector) => ({ path, selector })),
		);
		expect(found.length).toBeGreaterThan(0);
		expect(found.map(({ path }) => path)).toContain(
			join("src", "design", "primitives", "primitives.css"),
		);
	});
});

describe("cursor: none guard regex", () => {
	// Pins the helper against fixtures directly, the same way the
	// border-weight sweep is pinned. A corpus that happens to be clean today
	// cannot tell you whether the regex underneath it would catch tomorrow's
	// violation — and this particular guard has already been wrong once.
	const mustFlag = [
		"body { cursor: none; }",
		"* { cursor: none }",
		"@media (pointer: fine) {\n\tbody {\n\t\tcursor: none;\n\t}\n}",
		// Half-guarded is not guarded: the second selector still hides the
		// pointer for everyone.
		"body.has-custom-cursor, body * { cursor: none; }",
		// A declaration that follows another in the same rule.
		"body { color: red; cursor: none; }",
	];

	const mustNotFlag = [
		"body.has-custom-cursor { cursor: none; }",
		"@media (pointer: fine) {\n\tbody.has-custom-cursor,\n\tbody.has-custom-cursor * {\n\t\tcursor: none;\n\t}\n}",
		"body { cursor: pointer; }",
		"body { cursor: default; }",
		// Prose about the rule is not the rule.
		"/* never write cursor: none here */\nbody { cursor: pointer; }",
	];

	it.each(mustFlag)("flags %j as an unguarded cursor: none", (input) => {
		expect(findUnguardedCursorNone(input).length).toBeGreaterThan(0);
	});

	it.each(mustNotFlag)("does not flag %j", (input) => {
		expect(findUnguardedCursorNone(input)).toEqual([]);
	});
});

describe("typeface", () => {
	const layout = readFileSync("src/app/layout.tsx", "utf8");

	it("uses Inter for the sans face", () => {
		// DESIGN.md's Style paragraph names Inter directly. IBM Plex Sans was
		// the Instrument-era choice it replaces.
		expect(layout).toMatch(
			/import \{[^}]*\bInter\b[^}]*\} from "next\/font\/google"/,
		);
		expect(layout).not.toMatch(/IBM_Plex_Sans/);
	});

	it("keeps a self-hosted mono with tabular figures", () => {
		// The converter counts bytes and seconds upward live; a proportional
		// fallback makes the digits jitter while it runs.
		expect(layout).toMatch(/Geist_Mono/);
		expect(layout).toMatch(/variable: "--font-mono"/);
	});

	it("uses Geist Mono for the mono face", () => {
		// v2 names GeistMono as the system's accent face — the one that
		// signals "developer tool" in code panels, terminal timestamps and
		// shell-command CTAs.
		expect(layout).toMatch(/Geist_Mono/);
		expect(layout).not.toMatch(/IBM_Plex_Mono/);
	});

	it("self-hosts rather than linking a font CDN", () => {
		// A runtime request to fonts.googleapis.com would put a third-party
		// call on every page of a product whose whole claim is that nothing
		// leaves the device.
		expect(layout).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
	});
});
