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

/**
 * DESIGN.md's radius system is a closed set: 4px for controls, 40px and
 * 100px for cards, and full rounding for pills. A literal 12px written into
 * a component is off-system — the kind of drift that turns a coherent design
 * into an approximate one, one reasonable-looking commit at a time.
 */
const ALLOWED_RADII = new Set([0, 4, 40, 100]);

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

describe("forbidden visual devices", () => {
	it("uses none anywhere in src", () => {
		// Carried over unchanged from the v1 design system. DESIGN.md does not
		// contradict any of these, so §14 of the spec keeps them in force.
		const forbidden =
			/gradient|box-shadow|boxShadow|backdrop-filter|backdropFilter/i;
		const offenders = sourceFileContents
			.filter(({ content }) => forbidden.test(content))
			.map(({ path }) => path);
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

	it("gives keyboard focus a visible outline", () => {
		// The difference cursor is mouse-only, so without this a keyboard user
		// has no indication of what is focused at all.
		expect(globals).toMatch(/:focus-visible/);
		expect(globals).toMatch(/outline:\s*1px solid var\(--ink\)/);
	});

	it("does not hide the cursor — that ships with its replacement", () => {
		expect(globals).not.toMatch(/cursor:\s*none/);
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
		expect(layout).toMatch(/IBM_Plex_Mono/);
		expect(layout).toMatch(/variable: "--font-mono"/);
	});

	it("self-hosts rather than linking a font CDN", () => {
		// A runtime request to fonts.googleapis.com would put a third-party
		// call on every page of a product whose whole claim is that nothing
		// leaves the device.
		expect(layout).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
	});
});
