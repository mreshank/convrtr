import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/tokens.css", "utf8");

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
