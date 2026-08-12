import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/tokens.css", "utf8");

/**
 * Design-system guard tests need to look at every file that could possibly
 * carry a violation, not just `tokens.css` — every component in this
 * codebase styles itself with an inline `style={{ ... }}` in a `.tsx` file,
 * which is exactly where a stray gradient or an oversized radius would be
 * written and where `tokens.css`-only checks would never see it.
 */
function collectSourceFiles(root: string, extensions: string[]): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(root)) {
		const full = join(root, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...collectSourceFiles(full, extensions));
			continue;
		}
		if (extensions.some((ext) => entry.endsWith(ext))) out.push(full);
	}
	return out;
}

const sourceFiles = collectSourceFiles("src", [".tsx", ".css"]);
const sourceFileContents = sourceFiles.map((path) => ({
	path,
	content: readFileSync(path, "utf8"),
}));

/**
 * The dark palette is declared twice: once under `:root[data-theme="dark"]`
 * for the JS path, and once inside the `prefers-color-scheme` fallback for
 * visitors without JS. Nothing in CSS keeps the two copies in step, and if
 * they drift, dark mode differs between the JS and no-JS paths — a bug that
 * is invisible when clicking around in a normal browser. These tests turn
 * that silent drift into a red test.
 */
function declarations(blockSource: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const match of blockSource.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
		const name = match[1];
		const value = match[2];
		if (name && value) out[name] = value.trim();
	}
	return out;
}

function block(pattern: RegExp): string {
	const body = css.match(pattern)?.[1];
	if (!body) throw new Error(`tokens.css: no block matched ${pattern}`);
	return body;
}

const attributeDark = declarations(
	block(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/),
);
const mediaDark = declarations(
	block(
		/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/,
	),
);

describe("tokens.css dark-theme parity", () => {
	it("locates declarations in both dark blocks", () => {
		expect(Object.keys(attributeDark).length).toBeGreaterThan(0);
		expect(Object.keys(mediaDark).length).toBeGreaterThan(0);
	});

	it("declares the same token names in both dark blocks", () => {
		expect(Object.keys(mediaDark).sort()).toEqual(
			Object.keys(attributeDark).sort(),
		);
	});

	it("declares identical values in both dark blocks", () => {
		expect(mediaDark).toEqual(attributeDark);
	});
});

describe("design-system invariants", () => {
	it("never declares a CSS custom radius property above 4px", () => {
		// Every `--radius*` custom property, anywhere in `src`, must stay
		// within the design system's 4px ceiling. A future `--radius-lg: 12px`
		// added to any stylesheet is caught here, not just a literal
		// `--radius` in tokens.css.
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (!path.endsWith(".css")) continue;
			for (const match of content.matchAll(
				/--radius[\w-]*\s*:\s*([\d.]+)px/g,
			)) {
				const value = Number(match[1]);
				if (value > 4) offenders.push(`${path}: ${match[0].trim()}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("never hardcodes an inline border-radius above 4px outside the pill exception", () => {
		// Radius is governed by `var(--radius)` (<=4px) everywhere except
		// pills, which the design system allows to be fully rounded. Any
		// other literal pixel radius written directly into a component's
		// inline style is a violation, wherever it is written.
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (!path.endsWith(".tsx")) continue;
			for (const match of content.matchAll(
				/borderRadius:\s*["'](\d+(?:\.\d+)?)(px|%)["']/g,
			)) {
				const value = Number(match[1]);
				const unit = match[2];
				const isPill = unit === "%" || value >= 100;
				if (unit === "px" && value > 4 && !isPill) {
					offenders.push(`${path}: ${match[0].trim()}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("uses no forbidden visual devices anywhere in src", () => {
		const forbidden =
			/gradient|box-shadow|boxShadow|backdrop-filter|backdropFilter/i;
		const offenders = sourceFileContents
			.filter(({ content }) => forbidden.test(content))
			.map(({ path }) => path);
		expect(offenders).toEqual([]);
	});
});
