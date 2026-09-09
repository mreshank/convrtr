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
 *
 * A third delimiter, and the same argument one step further: the value may be
 * a template literal as well as a quoted string. `` height: `${HEIGHT}px` ``
 * is the natural way to write a dimension a component also needs as a number,
 * and while the pattern accepted only `"` and `'` a template literal was
 * invisible to it — not exempted, simply unseen, which is worse because
 * nothing recorded the gap. Found in `BranchDiagram.tsx:87`, where the value
 * happened to be on the scale. The three delimiters are written as an
 * alternation rather than a character class so an opening `"` cannot be
 * closed by a backtick.
 */
const SPACING_PROPERTY =
	/\b(?:padding|margin|gap|width|height|top|left|right|bottom|maxWidth|minWidth|maxHeight|minHeight)[A-Za-z]*:\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

/**
 * The unit the scale is built on, read from the token rather than typed here
 * so the two cannot drift.
 */
const SPACE_BASE = Number(
	tokens.match(/--space-base:\s*(\d+(?:\.\d+)?)px/)?.[1],
);

/**
 * Module-local numeric constants, so a template literal that interpolates one
 * is legible to the sweep instead of opaque to it.
 *
 * `const HEIGHT = 120` then `` height: `${HEIGHT}px` `` is the natural way to
 * write a dimension a component also needs as a number, and until this the
 * sweep read the value as the literal text `${HEIGHT}px` — no digits before
 * the `px`, so no length, so no check. The hole was found in
 * `BranchDiagram.tsx`, whose value happened to be fine.
 */
function numericConstants(content: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const match of content.matchAll(
		/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*number\s*)?=\s*(-?\d+(?:\.\d+)?)\s*(?=[;,\n)])/g,
	)) {
		if (match[1] && match[2]) out.set(match[1], match[2]);
	}
	return out;
}

/**
 * Evaluates an arithmetic expression built ONLY from number literals, the
 * four basic operators and parentheses -- e.g. `8 + 9` or `(240 - 96) / 2`.
 *
 * This exists to close one specific hole: `` padding: `${8 + 9}px` `` is a
 * *compile-time* constant, written as arithmetic instead of folded to `17`
 * by hand, and the sweep should see straight through it exactly as if it had
 * been written `padding: "17px"`. It is deliberately NOT a general
 * expression evaluator -- the character-class guard below rejects anything
 * containing a letter, so a variable reference (`ratio * 100`) is refused
 * before a single character of it is parsed and falls through to
 * `resolveTemplate`'s existing space-collapse untouched, which is what keeps
 * that function's runtime-value exemption intact. A hand-rolled
 * recursive-descent parser is used rather than `Function`/`eval` so
 * evaluation can never run anything but the four operators implemented here.
 */
function evaluateArithmetic(expr: string): number | null {
	if (!/^[\d\s+\-*/.()]+$/.test(expr)) return null;
	let i = 0;
	// `.charAt` rather than index access: it returns `""` past the end of the
	// string instead of `undefined`, so every comparison below stays a plain
	// string comparison with no extra null-checking noise.
	const peek = () => expr.charAt(i);
	const skipSpace = () => {
		while (peek() === " ") i++;
	};
	const parseNumber = (): number | null => {
		skipSpace();
		const start = i;
		while (i < expr.length && /[\d.]/.test(peek())) i++;
		if (i === start) return null;
		return Number(expr.slice(start, i));
	};
	const parseFactor = (): number | null => {
		skipSpace();
		if (peek() === "(") {
			i++;
			const value = parseExpr();
			skipSpace();
			if (peek() !== ")" || value === null) return null;
			i++;
			return value;
		}
		if (peek() === "-") {
			i++;
			const value = parseFactor();
			return value === null ? null : -value;
		}
		return parseNumber();
	};
	const parseTerm = (): number | null => {
		let value = parseFactor();
		if (value === null) return null;
		skipSpace();
		while (peek() === "*" || peek() === "/") {
			const op = peek();
			i++;
			const rhs = parseFactor();
			if (rhs === null) return null;
			value = op === "*" ? value * rhs : value / rhs;
			skipSpace();
		}
		return value;
	};
	const parseExpr = (): number | null => {
		let value = parseTerm();
		if (value === null) return null;
		skipSpace();
		while (peek() === "+" || peek() === "-") {
			const op = peek();
			i++;
			const rhs = parseTerm();
			if (rhs === null) return null;
			value = op === "+" ? value + rhs : value - rhs;
			skipSpace();
		}
		return value;
	};
	const result = parseExpr();
	skipSpace();
	if (result === null || i !== expr.length || !Number.isFinite(result)) {
		return null;
	}
	return result;
}

/**
 * A resolved template-literal value, plus the names it resolved through.
 *
 * The names matter to the caller: a length that arrived via a named module
 * constant is judged by a different rule than one written out on the spot
 * (see `isAdmissibleGeometryConstant`).
 *
 * An interpolation this sweep cannot evaluate -- `${ratio * 100}`,
 * `${leftPercent}` -- collapses to a space, which can never form part of a px
 * length, so it is skipped rather than guessed at. That is a deliberate false negative:
 * a runtime-computed dimension is not a hard-coded one, and flagging every
 * `width: ${pct}%` would get this sweep deleted by the next person who trips
 * on it.
 *
 * That reasoning protects an expression containing an identifier --
 * `ratio`, `leftPercent` -- because those can only be resolved at runtime.
 * It never protected `${8 + 9}`: every operand there is already a literal
 * sitting in the source, so the whole expression is exactly as static as
 * `${17}` and deserves the same verdict. `evaluateArithmetic` folds that
 * case first; only an expression containing something genuinely
 * unresolvable (a name, a call, a ternary) still falls through to the
 * space-collapse below.
 */
function resolveTemplate(
	value: string,
	constants: Map<string, string>,
): { resolved: string; viaConstant: boolean } {
	let viaConstant = false;
	const resolved = value.replace(/\$\{([^}]*)\}/g, (_, expr: string) => {
		const trimmed = expr.trim();
		if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return trimmed;
		const known = constants.get(trimmed);
		if (known !== undefined) {
			viaConstant = true;
			return known;
		}
		const arithmetic = evaluateArithmetic(trimmed);
		if (arithmetic !== null) return String(arithmetic);
		return " ";
	});
	return { resolved, viaConstant };
}

/**
 * Whether a length that reached the sweep through a named module constant is
 * on the scale after all.
 *
 * `BranchDiagram`'s `HEIGHT` is the case this exists for, and it is the one
 * shape a token genuinely cannot express. The same number is the `<svg>`
 * `height` attribute, the `viewBox` height, an operand of `branchPath`'s
 * arithmetic, AND the label column's CSS height — the labels line up with the
 * branch endpoints only while the last of those equals the first. So it has
 * to be a JavaScript number, which rules out `calc(15 * var(--space-base))`:
 * a CSS expression cannot be fed to `branchPath`, and writing the value twice
 * (once as a token expression, once as a number) is the drift this whole
 * sweep exists to prevent.
 *
 * The rule is therefore not "constants are exempt" — that would be a loophole
 * wide enough to hide any literal in — but "a named geometry constant that is
 * an exact multiple of the scale's own unit is on the scale". `HEIGHT` is 120,
 * which is 15 × `--space-base`; `WIDTH` is 240, which is `--section-pad`'s
 * value exactly. A `const BOX = 17` interpolated the same way still fails,
 * because 17 is not on the scale by any reading.
 *
 * A length written out at the call site — `` height: `${17}px` `` — gets none
 * of this. It is judged as a literal, exactly like `height: "17px"`, because
 * that is what it is.
 */
function isAdmissibleGeometryConstant(value: number): boolean {
	return value > 0 && Number.isFinite(SPACE_BASE) && value % SPACE_BASE === 0;
}

function findAdHocSpacing(content: string): string[] {
	const offenders: string[] = [];
	const constants = numericConstants(content);
	for (const match of content.matchAll(SPACING_PROPERTY)) {
		const template = match[3];
		const raw = match[1] ?? match[2] ?? template ?? "";
		const { resolved, viaConstant } =
			template === undefined
				? { resolved: raw, viaConstant: false }
				: resolveTemplate(raw, constants);
		for (const length of resolved.matchAll(/(\d+(?:\.\d+)?)px/g)) {
			const value = Number(length[1]);
			if (ALLOWED_LITERAL_PX.has(value)) continue;
			if (viaConstant && isAdmissibleGeometryConstant(value)) continue;
			offenders.push(match[0].trim());
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
		// Template literals. A length written out at the call site is a
		// literal whichever delimiter carries it.
		//
		// biome-ignore-start lint/suspicious/noTemplateCurlyInString: the
		// `${...}` in the fixtures below is the SUBJECT of the fixture -- the
		// literal source text a component would contain -- not an
		// interpolation this file means to perform. The rule is right about
		// every other case, which is why it is suppressed by range here
		// rather than switched off in biome.json.
		"height: `${17}px`",
		"padding: `${13}px ${27}px`",
		// A named constant does not launder an off-scale value: 17 is not a
		// multiple of --space-base by any reading.
		"const BOX = 17;\nheight: `${BOX}px`",
		// F2: arithmetic on literals is a compile-time constant, not a
		// runtime value, and folds to 17 -- off-scale exactly like
		// `${17}px` above. Confirmed by mutation: writing `FeatureGrid.tsx`'s
		// `padding: "var(--gap-md)"` as `` padding: `${8 + 9}px` `` used to
		// leave this suite green.
		"padding: `${8 + 9}px`",
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
		// A template literal carrying a token is a token.
		"height: `var(--gap-md)`",
		// A runtime-computed dimension is not a hard-coded one. These are
		// TimeRange's and ProgressBar's, and they are percentages besides.
		"width: `${ratio * 100}%`",
		"left: `${leftPercent}%`",
		// BranchDiagram's geometry constant: 120 is 15 x --space-base, and
		// the same number is the SVG's own height, so it cannot be a token
		// expression. See isAdmissibleGeometryConstant.
		"const HEIGHT = 120;\nheight: `${HEIGHT}px`",
		// F2: arithmetic that folds to an admitted literal (14, v2's
		// nav-utility padding) is exactly as legitimate as writing that
		// literal directly.
		"padding: `${7 + 7}px`",
		// biome-ignore-end lint/suspicious/noTemplateCurlyInString: end of
		// the fixture range opened in mustFlag above.
	];

	it.each(mustFlag)("flags %j as an ad-hoc spacing literal", (input) => {
		expect(findAdHocSpacing(input).length).toBeGreaterThan(0);
	});

	it.each(mustNotFlag)("does not flag %j", (input) => {
		expect(findAdHocSpacing(input)).toEqual([]);
	});
});

/**
 * F3: everything `findAdHocSpacing` above is structurally blind to.
 *
 * `SPACING_PROPERTY` anchors on JS object property names (`padding:`,
 * `gap:`, ...); a Tailwind arbitrary-value utility written into a
 * `className` string -- `p-[17px]`, `gap-[13px]`, `mt-[7px]` -- has no such
 * property name anywhere for it to match, and is invisible to it.
 * Confirmed by mutation: adding `className="meta p-[17px]"` to
 * `FormatStrip.tsx`'s span passed both the spacing sweep and `biome check`.
 *
 * This sweep covers the natural ad-hoc-spacing idiom in a Tailwind
 * codebase: the `p`/`m` families with their directional suffixes
 * (`pt`, `px`, `mb`, ...), `gap`/`gap-x`/`gap-y`, `space-x`/`space-y`,
 * and `w`/`h`/`top`/`left`/`right`/`bottom`, each followed by a bracketed
 * value. It is intentionally narrower than "anything in a bracket that
 * contains the digits and letters p-x": only a bracket whose ENTIRE
 * content is a bare `<number>px` is judged as a literal, checked against
 * the very same `ALLOWED_LITERAL_PX` scale the JS-object sweep uses, so
 * the two can never drift into two different allowlists for one system. A
 * bracket carrying a token reference (`p-[var(--gap-md)]`) is exactly as
 * legitimate as `padding: "var(--gap-md)"` and passes for the same
 * reason. A bracket carrying anything else -- `calc(100%-2px)`, a
 * percentage, a `ch` unit -- is a different kind of value than a hard-coded
 * spacing literal and is left alone rather than guessed at, the same
 * deliberate-false-negative call `resolveTemplate` makes for a runtime
 * `${...}` above.
 */
const CLASS_NAME_VALUE =
	/\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;

const TAILWIND_SPACING_UTILITY =
	/\b-?(?:[pm][trblxy]?|gap(?:-[xy])?|space-[xy]|w|h|top|left|right|bottom)-\[([^\]]+)\]/g;

function findAdHocTailwindSpacing(content: string): string[] {
	const offenders: string[] = [];
	for (const classMatch of content.matchAll(CLASS_NAME_VALUE)) {
		const classes = classMatch[1] ?? classMatch[2] ?? classMatch[3] ?? "";
		for (const utilityMatch of classes.matchAll(TAILWIND_SPACING_UTILITY)) {
			const captured = utilityMatch[1];
			if (captured === undefined) continue;
			const value = captured.trim();
			if (/^var\(/.test(value)) continue; // a token reference, not a literal
			const px = /^(\d+(?:\.\d+)?)px$/.exec(value);
			if (!px) continue; // not a bare px length -- calc()/%/ch, out of scope
			if (ALLOWED_LITERAL_PX.has(Number(px[1]))) continue;
			offenders.push(utilityMatch[0]);
		}
	}
	return offenders;
}

describe("Tailwind arbitrary spacing", () => {
	it("writes no ad-hoc arbitrary-value spacing utility", () => {
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (!path.endsWith(".tsx")) continue;
			for (const hit of findAdHocTailwindSpacing(content)) {
				offenders.push(`${path}: ${hit}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});

describe("Tailwind arbitrary spacing regex", () => {
	// Pinned against fixtures directly, for the same reason every other
	// sweep in this file is: a corpus that is clean today says nothing
	// about whether the regex underneath it would catch tomorrow's
	// violation.
	const mustFlag = [
		'className="meta p-[17px]"',
		'className="gap-[13px] flex"',
		'className="mt-[7px]"',
		'className="flex gap-x-[9px] gap-y-[9px]"',
		'className="space-x-[5px]"',
		'className="-top-[7px]"',
	];

	const mustNotFlag = [
		// An allowlisted literal -- 14px is v2's own nav-utility value.
		'className="p-[14px]"',
		// A token reference is as legitimate in a class as in a style object.
		'className="p-[var(--gap-md)]"',
		'className="gap-[var(--gap-sm)]"',
		// Not spacing at all -- a font-size utility, not in the family list.
		'className="text-[13px]"',
		// `w` IS in the family list, but a calc() expression is not a bare
		// px literal -- the same distinction `resolveTemplate` draws for a
		// runtime `${...}px`.
		'className="w-[calc(100%-2px)]"',
		// A percentage is not a length this scale describes.
		'className="w-[50%]"',
		// No arbitrary value at all -- an ordinary Tailwind spacing scale
		// utility, which this sweep does not police (a different, and
		// separately maintained, scale).
		'className="p-8 gap-4"',
	];

	it.each(mustFlag)(
		"flags %j as an ad-hoc Tailwind spacing literal",
		(input) => {
			expect(findAdHocTailwindSpacing(input).length).toBeGreaterThan(0);
		},
	);

	it.each(mustNotFlag)("does not flag %j", (input) => {
		expect(findAdHocTailwindSpacing(input)).toEqual([]);
	});
});

/**
 * Block comments removed before the gradient scan.
 *
 * Precedent and reason are both `findCursorNoneRules`'s, further down this
 * file: `cursor: none` written in prose is not a declaration, and neither is
 * the word `gradient`. That distinction matters more here than anywhere else
 * in the suite, because this design system's comments quote v2's guardrails
 * verbatim — "forbids a full-frame saturated gradient behind the hero" — so
 * prose is where the word appears most often. A raw-text scan cannot tell a
 * mention from a use, and it did not: `BarChart.tsx` contains no gradient at
 * all and was exempted anyway, purely so a comment could quote the brief.
 *
 * Only block comments are stripped, exactly as the cursor guard strips them.
 * `//` is not a comment in CSS and is a substring of every URL, so cutting to
 * end-of-line on it risks deleting a real declaration that follows one on the
 * same line — a false negative, which is the dangerous direction for a guard.
 * A `//` comment that spells out a literal `linear-gradient(` therefore still
 * flags: that fails loudly, and loudly is safe.
 */
function stripBlockComments(content: string): string {
	return content.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Every way this codebase could actually paint a gradient.
 *
 * A gradient has to be written as a *value* to have any effect, and there are
 * only two shapes for one here: a CSS gradient function, or one of Tailwind's
 * gradient utilities (v3's `bg-gradient-to-r`, v4's `bg-linear-to-r`,
 * `bg-radial`, `bg-conic`), which paint one with no function call in the
 * source at all — the case a function-only pattern would wave straight
 * through in a project that styles with Tailwind classes as well as inline
 * objects.
 *
 * Matching the value rather than a property name is deliberate, and is why
 * this is not the `background`/`backgroundImage`/`maskImage` alternation it
 * looks like it should be: `MediaFrame` assigns its mask to a `const` and
 * applies it through a variable, so a property-anchored pattern would miss
 * it — and would miss `const g = "linear-gradient(...)"` followed by
 * `style={{ background: g }}` too, which is the evasion rather than the edge
 * case. A `*-gradient(` token is a CSS value function; it cannot appear in
 * prose by accident the way the bare word can.
 */
const GRADIENT_VALUE =
	/(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|\bbg-(?:gradient|linear|radial|conic)\b/gi;

function findGradientValues(content: string): string[] {
	return [...stripBlockComments(content).matchAll(GRADIENT_VALUE)].map(
		(match) => match[0].replace(/\s+/g, "").toLowerCase(),
	);
}

/**
 * The gradients this system genuinely paints — per file, exactly.
 *
 * Not a file-scoped waiver, which is the whole point of the rewrite. Each
 * entry lists the exact gradient values that file is permitted to contain and
 * the check below requires an exact match, so a decorative
 * `linear-gradient` added to `MediaFrame.tsx` fails even though
 * `MediaFrame.tsx` appears here. The previous version was a `Set` of paths: it
 * waived the check for the whole file, it had absorbed five entries across
 * three plans, and one of those entries covered a file with no gradient in it.
 * An allowlist that grows on false positives is an allowlist on its way to
 * becoming the norm.
 *
 * `MediaFrame`'s `linear-gradient` is the alpha channel of a `mask-image`
 * (task 9's fade-to-canvas): a mask's gradient controls opacity, not paint,
 * so it carries none of the visual weight `box-shadow` or `backdrop-filter`
 * would — the same distinction `LITERAL_HEX_ALLOWED` draws for that file's
 * `#000`.
 *
 * `DotMatrix`'s `radial-gradient` is the dot-matrix lattice (task 3). Not an
 * image asset and not a decorative wash: it is the exact, zero-request way to
 * express a repeating dot lattice, and its colour comes from `--rule-subtle`
 * (fix round 1: `--rule` measured 4.39:1 against `--ink-muted` text painted
 * underneath it, under the 4.5:1 AA floor), so it is as accountable as every
 * other colour in the system.
 *
 * Three entries left when comments stopped counting. `BarChart.tsx` never had
 * a gradient. `MediaFrame.test.tsx` and `DotMatrix.test.tsx` assert on the
 * bare strings `"linear-gradient"` and `"radial-gradient"` with no function
 * call after them, so they no longer match this pattern at all — verified by
 * removing them and running, not by reading.
 *
 * `SiteHeader`'s two `linear-gradient`s are the polish pass's scroll-edge
 * signal for the nav row's `overflow-x: auto` (spec item 2): a same-toned
 * `--ground` gradient with `background-attachment: local` sits on top of a
 * `--ink-muted` one with the default `scroll` attachment, so the tint only
 * shows through once real content scrolls out of view. Like the mask above,
 * this pair controls visibility of a cut edge, not a decorative wash — and
 * unlike a `box-shadow` (banned outright, below) it costs nothing extra to
 * paint and needs no JS to know when to appear.
 */
const GRADIENT_ALLOWED = new Map<string, string[]>([
	[join("src", "design", "primitives", "MediaFrame.tsx"), ["linear-gradient("]],
	[join("src", "design", "families", "DotMatrix.tsx"), ["radial-gradient("]],
	[
		join("src", "design", "chrome", "SiteHeader.tsx"),
		["linear-gradient(", "linear-gradient("],
	],
]);

describe("forbidden visual devices", () => {
	it("uses none anywhere in src", () => {
		// Carried over unchanged from the v1 design system. DESIGN.md does not
		// contradict any of these, so §14 of the spec keeps them in force.
		//
		// `shadowOrBlur` still reads raw content, comments included. That is
		// not an oversight: nothing in this codebase quotes those two
		// properties in prose, and a comment that names one is worth a look
		// anyway.
		const shadowOrBlur = /box-shadow|boxShadow|backdrop-filter|backdropFilter/i;
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (shadowOrBlur.test(content)) {
				offenders.push(path);
				continue;
			}
			const gradients = findGradientValues(content);
			if (gradients.length === 0) continue;
			const allowed = GRADIENT_ALLOWED.get(path);
			if (!allowed || gradients.join("|") !== allowed.join("|")) {
				offenders.push(`${path}: ${gradients.join(", ")}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("still sees the gradients it exempts", () => {
		// Non-vacuity, the same way "still sees the rule it exists to police"
		// works for the cursor guard. If the mask or the lattice moves to
		// another file, or is deleted, this fails rather than the exemption
		// quietly covering nothing — which is how an allowlist entry outlives
		// its reason.
		for (const [path, expected] of GRADIENT_ALLOWED) {
			const entry = sourceFileContents.find((file) => file.path === path);
			expect(entry, path).toBeDefined();
			expect(findGradientValues(entry?.content ?? "")).toEqual(expected);
		}
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

describe("gradient guard regex", () => {
	// Pinned against fixtures directly, like the border-weight, spacing and
	// cursor-none helpers above. This guard has already been wrong once in the
	// direction that matters least visibly: it flagged documentation, an
	// exemption was added for the documentation, and after three plans the
	// allowlist held five files of which one had no gradient in it.
	const mustFlag = [
		'background: "linear-gradient(90deg, var(--ground), transparent)"',
		'backgroundImage: "radial-gradient(var(--rule) 1px, transparent 1px)"',
		"background-image: repeating-linear-gradient(45deg, #000, #fff)",
		'maskImage: "conic-gradient(from 0deg, #000, transparent)"',
		// The indirection a property-anchored pattern would miss.
		'const wash = "linear-gradient(160deg, #000 55%, transparent 100%)";',
		// Tailwind paints one with no function call anywhere.
		'className="bg-gradient-to-r from-black to-white"',
		'className="bg-linear-to-r"',
		'className="bg-radial"',
	];

	const mustNotFlag = [
		// The false positive this rewrite removes: v2's own guardrail prose,
		// quoted in a doc comment to explain why the chart is drawn as bars.
		"/**\n * v2 forbids a full-frame saturated gradient behind the hero.\n */",
		"/* a lattice is exactly what a gradient expresses well */",
		// A test asserting on the string is not a declaration of one.
		'expect(el.style.maskImage).toContain("linear-gradient");',
		'expect(grain.style.backgroundImage).toContain("radial-gradient");',
		// Neither is a registry answer that happens to discuss photographs.
		'a: "AVIF wins on gradient-heavy images."',
		// Not a gradient utility.
		'className="bg-black border-l"',
	];

	it.each(mustFlag)("flags %j as a painted gradient", (input) => {
		expect(findGradientValues(input).length).toBeGreaterThan(0);
	});

	it.each(mustNotFlag)("does not flag %j", (input) => {
		expect(findGradientValues(input)).toEqual([]);
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
