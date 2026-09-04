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
			for (const match of content.matchAll(
				/border(?:-[a-z]+)?(?:Width)?:\s*["']?(\d+(?:\.\d+)?)px/gi,
			)) {
				if (Number(match[1]) > 1) offenders.push(`${path}: ${match[0].trim()}`);
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
