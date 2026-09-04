import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/design/tokens.css", "utf8");

/**
 * The dark palette is declared twice — once under `:root[data-theme="dark"]`
 * for the JS path, once inside the `prefers-color-scheme` fallback for
 * visitors without JS. Nothing in CSS keeps the two copies in step, and if
 * they drift, dark mode differs between the JS and no-JS paths: a bug that
 * is invisible when clicking around in a normal browser. These tests turn
 * that silent drift into a red test. Carried over from the file this one
 * replaces, because the hazard is unchanged.
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

describe("dark-theme parity", () => {
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

/**
 * DESIGN.md's Special Notes: "Maintain a strict black-and-white palette; any
 * colour should only come from project photography." That is enforceable, so
 * it is enforced — a future `--accent: #3B82F6` fails here rather than
 * shipping.
 */
const ALLOWED_COLOURS = new Set([
	"#ffffff",
	"#000000",
	"#0a0a0a",
	"#525252",
	"#737373",
	"#a3a3a3",
	"#8a8a92",
]);

describe("palette closure", () => {
	it("declares no hex value outside the monochrome set", () => {
		const offenders = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
			.map((match) => match[0].toLowerCase())
			.filter((hex) => !ALLOWED_COLOURS.has(hex));
		expect(offenders).toEqual([]);
	});

	it("declares no saturated colour function", () => {
		// rgb() is permitted only for the two 10%-opacity rules, which are
		// pure black and pure white. Anything else — hsl, oklch, a coloured
		// rgb — is a hue entering the system.
		const rgbUses = [...css.matchAll(/rgb\(([^)]*)\)/g)].map((m) =>
			(m[1] ?? "").trim(),
		);
		for (const use of rgbUses) {
			expect(use).toMatch(/^(0 0 0|255 255 255) \/ (0\.1|\.10)$/);
		}
		expect(css).not.toMatch(/\b(hsl|oklch|lab|lch|color-mix)\(/);
	});

	it("declares exactly one easing, and it is DESIGN.md's", () => {
		expect(css).toMatch(/--ease:\s*cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
		const easings = [...css.matchAll(/cubic-bezier\([^)]*\)/g)].map(
			(m) => m[0],
		);
		expect(new Set(easings).size).toBe(1);
	});
});

describe("required tokens", () => {
	const required = [
		"--ground",
		"--ink",
		"--ink-muted",
		"--ink-faint",
		"--rule",
		"--rule-width",
		"--terminal",
		"--terminal-ink",
		"--terminal-rule",
		"--radius",
		"--radius-card",
		"--radius-card-lg",
		"--ease",
		"--dur-reveal",
		"--dur-hover",
		"--dur-marquee",
		"--dur-min",
	];

	it.each(required)("declares %s", (token) => {
		expect(css).toContain(`${token}:`);
	});

	it("declares the DESIGN.md card radii", () => {
		expect(css).toMatch(/--radius-card:\s*40px/);
		expect(css).toMatch(/--radius-card-lg:\s*100px/);
	});

	it("caps the rule at 1px", () => {
		expect(css).toMatch(/--rule-width:\s*1px/);
	});
});
