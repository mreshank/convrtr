import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/design/tokens.css", "utf8");

/**
 * Design-system guards have to look at every file that could carry a
 * violation, not just the token file — components in this codebase style
 * themselves with inline `style={{ ... }}` in `.tsx`, which is exactly where
 * a stray gradient or an off-system radius gets written and where a
 * token-file-only check would never see it. Copied verbatim from
 * `design-system.test.ts` rather than shared, so each guard file stays
 * independently readable.
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

describe("legacy token vocabulary", () => {
	const LEGACY = [
		"--surface-base",
		"--surface-raised",
		"--surface-overlay",
		"--text-primary",
		"--text-muted",
		"--hairline",
		"--hairline-width",
		"--signal",
		"--lossy",
		"--error",
	];

	// The Instrument-era names describe surfaces and text; DESIGN.md's system
	// is ground and ink. Carrying both vocabularies would leave every file
	// written from here on guessing which one applies.
	it.each(LEGACY)("no file in src still references %s", (token) => {
		const offenders = collectSourceFiles("src", [".tsx", ".ts", ".css"])
			.filter((path) => !path.includes("__tests__"))
			.filter((path) => readFileSync(path, "utf8").includes(`${token}`));
		expect(offenders).toEqual([]);
	});
});

/**
 * An undefined CSS custom property does not warn, does not throw, and does
 * not fail a build — the declaration simply vanishes. A missed rename during
 * the switchover from `src/styles/tokens.css` to this file would produce
 * exactly that: text with no colour, a background with none, and every
 * automated check (typecheck, lint, build) staying green regardless.
 *
 * This guard makes that failure mode mechanical instead of visual: it reads
 * every `var(--name)` reference under `src` and asserts the name is
 * declared somewhere in this token file. `--font-sans` and `--font-mono`
 * are supplied by `next/font` in `layout.tsx`, not by this file, so they
 * are legitimately referenced without being declared here and are
 * allowlisted below.
 */
describe("no dangling custom property references", () => {
	const ALLOWLISTED = new Set(["--font-sans", "--font-mono"]);

	function declaredNames(source: string): Set<string> {
		const names = new Set<string>();
		for (const match of source.matchAll(/--([\w-]+)\s*:/g)) {
			const name = match[1];
			if (name) names.add(`--${name}`);
		}
		return names;
	}

	const declared = declaredNames(css);

	it("references every var(--name) it uses against a name declared in tokens.css", () => {
		const offenders: string[] = [];
		for (const path of collectSourceFiles("src", [".tsx", ".css"])) {
			if (path.includes("__tests__")) continue;
			const source = readFileSync(path, "utf8");
			for (const match of source.matchAll(/var\((--[\w-]+)/g)) {
				const name = match[1];
				if (!name) continue;
				if (ALLOWLISTED.has(name)) continue;
				if (!declared.has(name)) {
					offenders.push(`${path}: var(${name})`);
				}
			}
		}
		expect(
			offenders,
			`Referenced but not declared in src/design/tokens.css:\n${offenders.join("\n")}`,
		).toEqual([]);
	});
});
