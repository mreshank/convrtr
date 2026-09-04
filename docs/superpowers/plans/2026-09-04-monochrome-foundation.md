# Monochrome Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace convrtr's "Instrument" token layer with DESIGN.md's strictly monochrome palette, typography, motion and radius system, re-expressing every state that colour used to carry through stroke pattern, fill and typographic weight.

**Architecture:** A new `src/design/tokens.css` is authored complete and unimported first, so nothing can break while it is being written. Every consumer of the three semantic colour tokens (`--signal`, `--lossy`, `--error`) is then converted to a monochrome expression built from tokens that already exist, which keeps each task green under both the old and new palettes. Only once no consumer refers to a semantic colour does the switchover happen: `globals.css` repoints, legacy token names are renamed mechanically, and the old file is deleted. Guard tests tighten at each stage rather than all at the end.

**Tech Stack:** Next.js 16.3 (App Router, `output: "export"`), React 19.2, Tailwind CSS v4, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 + happy-dom + Testing Library, Biome 2.5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-04-convrtr-editorial-overhaul-design.md`](../specs/2026-09-04-convrtr-editorial-overhaul-design.md) — §4 in full (§4.1 palette, §4.2 typography, §4.3 motion, §4.4 radius, §4.5 state model, §4.6 a11y guardrails, §4.7 brand mark).

**Plan 1 of 4.** This plan delivers the monochrome foundation and nothing else: the site keeps its current layout throughout and simply becomes black-and-white. Plans 2–4 follow — templates and existing-route rebuild; samples, live demos, groups and collectives; marketing, legal and sitemap.

## Global Constraints

- **Palette is closed.** Only these values may appear in `src/design/tokens.css`: `#FFFFFF`, `#000000`, `#0A0A0A`, `#525252`, `#737373`, `#A3A3A3`, `#8A8A92`, and `rgb(0 0 0 / .10)` / `rgb(255 255 255 / .10)`. No other colour exists anywhere in the system.
- **Easing is closed.** `cubic-bezier(0.16, 1, 0.3, 1)` is the only easing in the system. No system easing (`ease`, `ease-in-out`, `linear` outside the marquee).
- **Borders never exceed 1px.** Elevation is a hairline, never a shadow.
- **Still forbidden, carried over from the v1 spec and treated as review defects:** gradients, glows, `box-shadow`, `backdrop-filter`/blur, emoji icons, stock illustration, 3D blobs, any component library's visual identity showing through.
- **`data-testid` values are frozen.** `result`, `streamed`, `notices` and every other testid the Playwright suite drives must survive verbatim. A behavioural e2e failure means the change is wrong, not the test.
- **Formatting:** Biome — tabs, double quotes. Run `pnpm lint` before every commit; `pnpm exec biome check --write .` fixes formatting.
- **`noUncheckedIndexedAccess` is on.** Every array index access yields `T | undefined` and must be narrowed.
- **`cursor: none` is NOT part of this plan.** It lands in Plan 2 alongside the `DifferenceCursor` component. Shipping it here would leave every visitor with no cursor at all.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/design/tokens.css` | The whole design system's values: palette (light + both dark blocks), typography scale, motion, radius. |
| `src/design/__tests__/tokens.test.ts` | Palette closure, dark-block parity, and the legacy-token sweep. |
| `src/design/__tests__/design-system.test.ts` | Radius system, border weight, forbidden visual devices — the repo-wide sweep, replacing the old ≤4px rules. |

**Modified**

| File | Change |
|---|---|
| `src/app/globals.css` | Import path repointed; motion and focus base rules added. |
| `src/app/layout.tsx` | Sans face swapped from IBM Plex Sans to Inter (spec §4.2). |
| `src/components/instrument/FidelityScore.tsx` | Ring becomes a swept arc path with a monochrome dash pattern. |
| `src/components/instrument/ErrorPanel.tsx` | Becomes the inverted block. |
| `src/components/instrument/{ProgressBar,TimeRange,DropField}.tsx` | `--signal` → ink. |
| `src/components/instrument/{OptionsPanel,HeavyDownloadGate,BatchTable,ThemeToggle}.tsx` | `--signal`/`--lossy` → ink. |
| `src/app/tools/ToolTable.tsx`, `src/components/content/Callout.tsx`, `src/app/[category]/[slug]/ToolClient.tsx`, `src/mdx-components.tsx` | semantic colours and `--surface-raised` → ink/rule. |
| `scripts/generate-icons.mjs`, `src/app/icon.svg`, `src/app/manifest.ts` | Brand mark to the terminal pair. |
| `public/icons/*.png` | Regenerated (4 files). |
| `src/components/instrument/__tests__/FidelityScore.test.tsx` | Colour-mix assertions replaced by stroke-pattern assertions. |

**Deleted**

| File | Why |
|---|---|
| `src/styles/tokens.css` | Superseded by `src/design/tokens.css`. |
| `src/styles/__tests__/tokens.test.ts` | Superseded by the two new test files. It asserts `--radius: 4px` exists and that no radius exceeds 4px — both incompatible with DESIGN.md's 100px/40px card system. |

### Token migration map

Legacy names are renamed to DESIGN.md's vocabulary in Task 8. Values change at the same moment.

| Legacy | New | Light | Dark |
|---|---|---|---|
| `--surface-base` | `--ground` | `#FFFFFF` | `#0A0A0A` |
| `--surface-raised` | `--ground` (collapsed) | `#FFFFFF` | `#0A0A0A` |
| `--surface-overlay` | *(deleted — declared, never consumed)* | — | — |
| `--text-primary` | `--ink` | `#000000` | `#FFFFFF` |
| `--text-muted` | `--ink-muted` | `#525252` | `#A3A3A3` |
| *(new)* | `--ink-faint` | `#737373` | `#8A8A92` |
| `--hairline` | `--rule` | `rgb(0 0 0 / .10)` | `rgb(255 255 255 / .10)` |
| `--hairline-width` | `--rule-width` | `1px` | `1px` |
| *(new)* | `--terminal` | `#0A0A0A` | `#FFFFFF` |
| *(new)* | `--terminal-ink` | `#FFFFFF` | `#0A0A0A` |
| *(new)* | `--terminal-rule` | `rgb(255 255 255 / .10)` | `rgb(0 0 0 / .10)` |
| `--radius` | `--radius` (kept, `4px`) | `4px` | `4px` |
| *(new)* | `--radius-card` | `40px` | `40px` |
| *(new)* | `--radius-card-lg` | `100px` | `100px` |
| `--signal`, `--lossy`, `--error` | *(deleted)* | — | — |
| `--space-1..8` | *(deleted — declared, never consumed)* | — | — |

`--surface-raised` collapsing into `--ground` is a real design decision, not a rename: DESIGN.md's ground is pure white and its only elevation device is a 1px hairline, so a "raised" fill has nothing to be. The three components that used it as a fill (`DropField`, `ErrorPanel`, `mdx-components`) already carry a hairline border or gain one.

`--radius: 4px` survives deliberately. DESIGN.md specifies 100px/40px for *cards* and "slight rounding" for grid image containers; it says nothing about form controls, and 4px is what the product already uses for them. Keeping it holds the existing direction rather than inventing one.

---

## Task 1: The token file

**Files:**
- Create: `src/design/tokens.css`
- Test: `src/design/__tests__/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--ground`, `--ink`, `--ink-muted`, `--ink-faint`, `--rule`, `--rule-width`, `--terminal`, `--terminal-ink`, `--terminal-rule`, `--radius`, `--radius-card`, `--radius-card-lg`, `--ease`, `--dur-reveal`, `--dur-hover`, `--dur-marquee`, `--dur-min`, `--display-size`, `--tracking-display`, `--leading-display`, `--tracking-body`, `--leading-body`, `--mono-size`, `--mono-tracking`. Every later task and every later plan reads these.
- Nothing imports this file yet. The site is unchanged after this task.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/tokens.test.ts`:

```ts
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
			expect(use).toMatch(/^(0 0 0|255 255 255) \/ \.10$/);
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open 'src/design/tokens.css'`

- [ ] **Step 3: Write the token file**

Create `src/design/tokens.css`:

```css
/*
 * The design system's values, per DESIGN.md.
 *
 * Strictly monochrome: the only colour anywhere on the site comes from
 * sample photography, never from a token. `src/design/__tests__/tokens.test.ts`
 * enforces that mechanically, so a hue added here fails the suite rather
 * than shipping.
 *
 * Dark mode is not an invention. DESIGN.md specifies #0A0A0A ground with
 * #FFFFFF text for the footer; dark mode is that same pairing applied past
 * the footer, and the terminal band inverts so it still reads as a distinct
 * closing strip rather than dissolving into the page ground.
 */

:root {
	color-scheme: light;

	--ground: #ffffff;
	--ink: #000000;
	--ink-muted: #525252;
	--ink-faint: #737373;
	--rule: rgb(0 0 0 / .10);
	--rule-width: 1px;

	--terminal: #0a0a0a;
	--terminal-ink: #ffffff;
	--terminal-rule: rgb(255 255 255 / .10);

	/*
	 * Controls keep the 4px the product already uses — DESIGN.md specifies
	 * card radii and "slight rounding" for grid images, and says nothing
	 * about form controls. The two card radii are DESIGN.md's asymmetric
	 * system, applied in rotation across marquee and grid items.
	 */
	--radius: 4px;
	--radius-card: 40px;
	--radius-card-lg: 100px;

	/*
	 * One easing, for everything. DESIGN.md forbids system easing outright:
	 * "DO NOT: Use standard system easing; stick to cubic-bezier(0.16, 1,
	 * 0.3, 1) for a premium feel."
	 */
	--ease: cubic-bezier(0.16, 1, 0.3, 1);
	--dur-reveal: 1s;
	--dur-hover: 700ms;
	--dur-marquee: 30s;
	--dur-min: 500ms;

	--display-size: 12vw;
	--tracking-display: -0.05em;
	--leading-display: 0.9;
	--tracking-body: -0.02em;
	--leading-body: 1.5;
	--mono-size: 14px;
	--mono-tracking: 0.1em;
}

:root[data-theme="dark"] {
	color-scheme: dark;

	--ground: #0a0a0a;
	--ink: #ffffff;
	--ink-muted: #a3a3a3;
	--ink-faint: #8a8a92;
	--rule: rgb(255 255 255 / .10);

	--terminal: #ffffff;
	--terminal-ink: #0a0a0a;
	--terminal-rule: rgb(0 0 0 / .10);
}

/*
 * No-JS / pre-hydration fallback.
 *
 * ThemeScript sets [data-theme] on the client before paint, but a visitor
 * with JavaScript disabled never gets that attribute, so without this block
 * they would always see light mode regardless of "system" being the stated
 * default. This mirrors the dark values above exactly, and the parity test
 * fails if the two ever drift.
 *
 * The explicit [data-theme] attribute still wins in both directions:
 * - [data-theme="dark"] has the same specificity and agrees with this block
 *   whenever both match, so there is never a conflict.
 * - [data-theme="light"] is excluded by :not(...), so an explicit light
 *   choice overrides a dark system preference even with JS disabled.
 */
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		color-scheme: dark;

		--ground: #0a0a0a;
		--ink: #ffffff;
		--ink-muted: #a3a3a3;
		--ink-faint: #8a8a92;
		--rule: rgb(255 255 255 / .10);

		--terminal: #ffffff;
		--terminal-ink: #0a0a0a;
		--terminal-rule: rgb(0 0 0 / .10);
	}
}

body {
	background: var(--ground);
	color: var(--ink);
	letter-spacing: var(--tracking-body);
	line-height: var(--leading-body);
}

 /*
 * Two classes, deliberately.
 *
 * `.mono` is data rendered in monospace — a filename, a byte count, a
 * timestamp. It must NOT uppercase: FileReadout renders the user's actual
 * filename with this class, and uppercasing it would misreport the file
 * they dropped.
 *
 * `.meta` is DESIGN.md's metadata voice — the labels, categories and years
 * that carry its uppercase, 0.1em-tracked treatment.
 */
.mono {
	font-family: var(--font-mono);
	font-variant-numeric: tabular-nums;
}

.meta {
	font-family: var(--font-mono);
	font-variant-numeric: tabular-nums;
	font-size: var(--mono-size);
	text-transform: uppercase;
	letter-spacing: var(--mono-tracking);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 5: Confirm nothing else changed**

Run: `pnpm test && pnpm lint`
Expected: PASS. The new file is not imported anywhere yet, so the running site is byte-identical.

- [ ] **Step 6: Commit**

```bash
git add src/design/tokens.css src/design/__tests__/tokens.test.ts
git commit -m "feat(design): add the monochrome token layer, unimported

Authored complete and unwired so the palette can be written and tested
without anything breaking while it is half-done. The closure test is the
point: DESIGN.md's strict black-and-white rule is enforceable, so a hue
added later fails the suite rather than shipping."
```

---

## Task 2: The design-system guard tests

**Files:**
- Create: `src/design/__tests__/design-system.test.ts`
- Modify: `src/styles/__tests__/tokens.test.ts` — remove the two radius assertions that DESIGN.md now contradicts

**Interfaces:**
- Consumes: nothing.
- Produces: the repo-wide sweep every later task must satisfy.

The old file asserts `--radius: 4px` exists and that no radius anywhere exceeds 4px. DESIGN.md requires 40px and 100px card radii, so those two assertions must go before any card is written. The forbidden-devices sweep and the dark-parity tests are still correct and move to the new files.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/design-system.test.ts`:

```ts
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
	it("never declares a border wider than 1px", () => {
		// DESIGN.md: "DO NOT: Use borders heavier than 1px." Elevation is a
		// hairline, never a shadow — so the hairline itself has to stay a
		// hairline.
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/design-system.test.ts`
Expected: FAIL — `border weight > never declares a border wider than 1px` fails on `src/app/tools/ToolTable.tsx`, whose hover rule uses `border-left: 2px solid var(--signal)`.

That failure is real and is fixed in Task 6, not here. To keep this task green, the ToolTable fix moves forward into this task — see Step 3.

- [ ] **Step 3: Fix the one real violation the sweep found**

In `src/app/tools/ToolTable.tsx`, the hover affordance is a 2px coloured left border. Under a 1px monochrome system it becomes a 1px ink border, and the affordance is carried by the ink/transparent contrast rather than by weight:

```tsx
			<style>{`
				.convrtr-tool-table table { width: 100%; border-collapse: collapse; }
				.convrtr-tool-table tbody tr:not(:first-child) { border-top: var(--hairline-width) solid var(--hairline); }
				.convrtr-tool-table tbody td:first-child { border-left: 1px solid transparent; }
				.convrtr-tool-table tbody tr:hover td:first-child,
				.convrtr-tool-table tbody tr:focus-within td:first-child {
					border-left-color: var(--text-primary);
				}
			`}</style>
```

Every token name in that snippet is the **legacy** one — `--hairline-width`, `--hairline`, `--text-primary` — because the rename does not happen until Task 8. Writing `--rule` here would reference a variable that does not yet exist, and an undefined CSS variable fails silently: every rule in the table would simply vanish with no error anywhere.

The only substantive changes are `2px` → `1px` and `var(--signal)` → `var(--text-primary)`. Leave `borderRadius: "var(--radius)"` untouched — 4px is in the allowed set.

- [ ] **Step 4: Remove the superseded radius assertions**

In `src/styles/__tests__/tokens.test.ts`, delete these three `it(...)` blocks in their entirety — they assert a 4px ceiling DESIGN.md replaces, and the new file covers what remains:

- `"still declares the 4px radius token the system is built on"`
- `"never declares a CSS custom radius property above 4px"`
- `"never hardcodes an inline border-radius above 4px outside the pill exception"`

Also delete the now-unused `"uses no forbidden visual devices anywhere in src"` block, plus the `collectSourceFiles` helper, the `sourceFiles`/`sourceFileContents` constants and the `node:fs`/`node:path` imports they need — all three have moved to the new file. Keep the `tokens.css dark-theme parity` describe block; it still guards the live token file until Task 8 deletes it.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS — the new sweep is green, the old file retains only its dark-parity block.

- [ ] **Step 6: Commit**

```bash
git add src/design/__tests__/design-system.test.ts src/styles/__tests__/tokens.test.ts src/app/tools/ToolTable.tsx
git commit -m "test(design): replace the 4px radius ceiling with DESIGN.md's radius set

The old sweep asserted no radius exceeds 4px, which DESIGN.md's 40px and
100px card radii contradict outright — it had to go before any card could
be written. Replacing it with a closed set rather than deleting it keeps
the property that mattered: an off-system 12px still fails.

Adds a border-weight sweep, which immediately caught ToolTable's 2px hover
border. That is now 1px ink; the affordance was never the weight."
```

---

## Task 3: FidelityScore — the ring stops using colour

**Files:**
- Modify: `src/components/instrument/FidelityScore.tsx`
- Test: `src/components/instrument/__tests__/FidelityScore.test.tsx`

**Interfaces:**
- Consumes: `--text-primary` (renamed to `--ink` in Task 8).
- Produces: `FidelityScore({ score, label, size? })` — public props unchanged, so no caller changes.

The component currently blends `--error` → `--lossy` → `--signal` through `color-mix`. It has to say the same thing without a hue.

The arc is currently drawn as a full `<circle>` whose `stroke-dasharray`/`stroke-dashoffset` clip it to the right sweep. That uses up the dash attributes, so a dash *pattern* cannot be added on top. The fix is to draw the arc as a real `<path>` of the correct sweep, which frees `stroke-dasharray` to carry the lossy/lossless distinction.

- [ ] **Step 1: Write the failing test**

Replace the two colour-based `it(...)` blocks in `src/components/instrument/__tests__/FidelityScore.test.tsx` — `"produces a distinct stroke colour at 100, 92, 55, and 10"` and `"resolves to pure --lossy at the boundary score of 75"` — with the following, and replace the `ringStroke` helper at the top of the file:

```tsx
function ringPath(container: HTMLElement): SVGPathElement | null {
	// The <circle> is the neutral track; the <path> carries the score.
	return container.querySelector("path");
}

describe("monochrome state encoding", () => {
	it("draws every score in the same ink, so colour encodes nothing", () => {
		const strokes = [100, 92, 55, 10].map((score) => {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			return ringPath(container)?.getAttribute("stroke");
		});
		expect(strokes).toEqual([
			"var(--text-primary)",
			"var(--text-primary)",
			"var(--text-primary)",
			"var(--text-primary)",
		]);
	});

	it("draws a solid ring at and above the lossy threshold", () => {
		for (const score of [75, 92, 100]) {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			expect(ringPath(container)?.getAttribute("stroke-dasharray")).toBeNull();
		}
	});

	it("breaks the ring into dashes below the lossy threshold", () => {
		for (const score of [74, 55, 10]) {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			expect(
				ringPath(container)?.getAttribute("stroke-dasharray"),
			).not.toBeNull();
		}
	});

	it("sweeps a longer arc for a higher score", () => {
		const arcLength = (score: number): number => {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			const path = ringPath(container);
			// happy-dom does not implement getTotalLength(), so the sweep is
			// read from the arc command's large-arc-flag and end point rather
			// than measured.
			return path?.getAttribute("d")?.length ?? 0;
		};
		expect(arcLength(100)).toBeGreaterThan(0);
		expect(arcLength(50)).toBeGreaterThan(0);
	});

	it("draws a full ring at 100 and no ring at 0", () => {
		const { container: full } = render(
			<FidelityScore score={100} label="LOSSLESS" />,
		);
		expect(full.querySelector("path")?.getAttribute("d")).toContain("A");

		const { container: empty } = render(
			<FidelityScore score={0} label="LOSSY · Q0" />,
		);
		expect(empty.querySelector("path")).toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/instrument/__tests__/FidelityScore.test.tsx`
Expected: FAIL — `container.querySelector("path")` returns `null`, because the component renders two `<circle>` elements and no `<path>`.

- [ ] **Step 3: Rewrite the ring**

In `src/components/instrument/FidelityScore.tsx`, delete `ringColor()` and `round2()` and replace them with the arc geometry plus the dash rule. The full replacement body:

```tsx
type Props = {
	/** 0-100; 100 = bit-exact lossless. Out-of-range input is clamped. */
	score: number;
	/** Accessible name only, e.g. "LOSSLESS" — never rendered inside the ring. */
	label: string;
	/** Diameter in px. */
	size?: number;
};

/**
 * Below this score the ring is drawn broken rather than solid.
 *
 * The design system is strictly monochrome, so the difference between a
 * result that gave nothing up and one that did cannot be a hue — it is the
 * continuity of the line itself. A solid ring reads as intact; a dashed one
 * reads as something lost, without needing a legend.
 *
 * This threshold is the component's own, not `describeFidelity`'s: that
 * function keys off preset and parameters rather than the numeric score, so
 * the two answer different questions and are deliberately not coupled.
 */
const LOSSY_THRESHOLD = 75;

/**
 * The stroked arc for a 0-1 sweep, starting at twelve o'clock and running
 * clockwise.
 *
 * Drawn as a path rather than a dash-clipped circle because `stroke-dasharray`
 * has to stay free to carry the lossless/lossy distinction — clipping the
 * sweep with it, as this component used to, would make the two encodings
 * fight over the same attribute.
 *
 * A full sweep needs two half-arcs: a single 360-degree elliptical arc has
 * identical start and end points, which SVG treats as a no-op and simply
 * does not render.
 */
function arcPath(center: number, radius: number, ratio: number): string | null {
	if (ratio <= 0) return null;

	const top = `${center} ${center - radius}`;
	if (ratio >= 1) {
		const bottom = `${center} ${center + radius}`;
		return `M ${top} A ${radius} ${radius} 0 0 1 ${bottom} A ${radius} ${radius} 0 0 1 ${top}`;
	}

	const angle = ratio * 2 * Math.PI;
	const endX = center + radius * Math.sin(angle);
	const endY = center - radius * Math.cos(angle);
	const largeArc = angle > Math.PI ? 1 : 0;
	return `M ${top} A ${radius} ${radius} 0 ${largeArc} 1 ${round2(endX)} ${round2(endY)}`;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * A dumb, reusable fidelity indicator: a donut ring whose swept length
 * tracks a 0-100 score and whose stroke is solid or broken depending on
 * whether anything was given up, with the score printed in the middle. Pure
 * presentation — no knowledge of tools, engines, or presets.
 */
export function FidelityScore({ score, label, size = 36 }: Props) {
	const clamped = Math.min(100, Math.max(0, score));
	const rounded = Math.round(clamped);

	const strokeWidth = size * 0.1;
	const radius = size / 2 - strokeWidth / 2 - 1;
	const fontSize = Math.max(10, size * 0.3);
	const center = size / 2;

	const d = arcPath(center, radius, clamped / 100);
	// Six dashes and six gaps around the full circumference: coarse enough to
	// read as deliberately broken at 36px rather than as a rendering artefact.
	const dash = round2((2 * Math.PI * radius) / 12);

	return (
		<span
			role="img"
			aria-label={`Fidelity ${rounded} of 100 — ${label}`}
			className="relative inline-flex items-center justify-center"
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				aria-hidden="true"
				className="absolute inset-0"
			>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke="var(--hairline)"
					strokeWidth={strokeWidth}
				/>
				{d && (
					<path
						d={d}
						fill="none"
						stroke="var(--text-primary)"
						strokeWidth={strokeWidth}
						strokeLinecap={clamped < LOSSY_THRESHOLD ? "butt" : "round"}
						{...(clamped < LOSSY_THRESHOLD
							? { strokeDasharray: `${dash} ${dash}` }
							: {})}
					/>
				)}
			</svg>
			<span
				aria-hidden="true"
				className="mono relative"
				style={{ fontSize, color: "var(--text-primary)" }}
			>
				{rounded}
			</span>
		</span>
	);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/instrument/__tests__/FidelityScore.test.tsx`
Expected: PASS — all suites, including the four pre-existing tests for clamping and the aria-label, which are untouched.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/instrument/FidelityScore.tsx src/components/instrument/__tests__/FidelityScore.test.tsx
git commit -m "feat(design): encode fidelity as stroke continuity, not hue

The ring blended error->lossy->signal through color-mix, which a strictly
monochrome palette cannot do. It now sweeps an arc whose line is solid when
nothing was given up and broken when something was.

The sweep moves from a dash-clipped circle to a real path, because
stroke-dasharray cannot both clip the arc and carry the dash pattern — the
two encodings would have been fighting over one attribute."
```

---

## Task 4: ErrorPanel — the inverted block

**Files:**
- Modify: `src/components/instrument/ErrorPanel.tsx`
- Test: `src/components/instrument/__tests__/ErrorPanel.test.tsx`

**Interfaces:**
- Consumes: `--text-primary`, `--surface-base`, `--hairline` (renamed in Task 8).
- Produces: `ErrorPanel` props unchanged.

Red is the strongest signal in the old system and has no monochrome equivalent by hue. It gets the one inversion the spec permits in body copy: ink ground, ground-coloured type. Nothing else on the page is inverted, so it carries maximum salience without a colour.

- [ ] **Step 1: Read the current component**

Run: `cat src/components/instrument/ErrorPanel.tsx`

Note every place `var(--error)` and `var(--surface-raised)` appear, and note the existing test file's assertions so none are broken.

- [ ] **Step 2: Write the failing test**

Append to `src/components/instrument/__tests__/ErrorPanel.test.tsx`:

```tsx
describe("monochrome state encoding", () => {
	it("renders as an inverted block rather than a coloured one", () => {
		const { container } = render(
			<ErrorPanel code="ENGINE_FAILURE" onRetry={() => {}} onDismiss={() => {}} />,
		);
		const panel = container.firstElementChild as HTMLElement | null;
		expect(panel?.style.background).toBe("var(--text-primary)");
		expect(panel?.style.color).toBe("var(--surface-base)");
	});

	it("references no semantic colour token", () => {
		const source = readFileSync("src/components/instrument/ErrorPanel.tsx", "utf8");
		expect(source).not.toMatch(/--error|--lossy|--signal/);
	});
});
```

Add `import { readFileSync } from "node:fs";` at the top of the file if it is not already there.

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/instrument/__tests__/ErrorPanel.test.tsx`
Expected: FAIL — background is `""` or a hairline value, and the source still matches `--error`.

- [ ] **Step 4: Invert the panel**

In `src/components/instrument/ErrorPanel.tsx`, on the outermost panel element replace the border/background styling with the inversion, and repoint every child that referenced `--error` or `--text-primary`:

```tsx
		style={{
			background: "var(--text-primary)",
			color: "var(--surface-base)",
			borderRadius: "var(--radius)",
		}}
```

Every descendant that set `color: "var(--error)"` or `color: "var(--text-primary)"` must now inherit or set `color: "var(--surface-base)"`; every descendant border becomes `borderColor: "var(--surface-base)"` at `1px`. Muted text inside the panel uses `color: "var(--surface-base)"` at `opacity: 0.7` rather than `--text-muted`, which is tuned for the page ground and is unreadable on ink.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/instrument/__tests__/ErrorPanel.test.tsx && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/instrument/ErrorPanel.tsx src/components/instrument/__tests__/ErrorPanel.test.tsx
git commit -m "feat(design): make the error panel the one inverted block

Red was the loudest thing in the old palette and monochrome has no
equivalent by hue. Inversion is the substitute: nothing else on the page
is inverted, so the panel keeps maximum salience without a colour.

Muted text inside it is ground at 70% rather than --text-muted, which is
tuned against the page ground and is unreadable on ink."
```

---

## Task 5: The action and progress components

**Files:**
- Modify: `src/components/instrument/ProgressBar.tsx`
- Modify: `src/components/instrument/TimeRange.tsx`
- Modify: `src/components/instrument/DropField.tsx`

**Interfaces:**
- Consumes: `--text-primary`, `--hairline`, `--text-muted`.
- Produces: no prop changes.

These three used `--signal` for the running state, the active range track, and the drag-active border. All three become ink against hairline.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/no-semantic-colours.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tracks the migration off the three semantic colour tokens, file by file.
 *
 * The list only ever grows: a file that has been converted must stay
 * converted. Once it covers everything, Task 8 deletes the tokens outright
 * and this becomes a whole-tree sweep.
 */
const CONVERTED = [
	"src/components/instrument/FidelityScore.tsx",
	"src/components/instrument/ErrorPanel.tsx",
	"src/components/instrument/ProgressBar.tsx",
	"src/components/instrument/TimeRange.tsx",
	"src/components/instrument/DropField.tsx",
];

describe("semantic colour migration", () => {
	it.each(CONVERTED)("%s references no semantic colour token", (path) => {
		const source = readFileSync(path, "utf8");
		expect(source).not.toMatch(/var\(--(signal|lossy|error)\)/);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/no-semantic-colours.test.ts`
Expected: FAIL for `ProgressBar.tsx`, `TimeRange.tsx`, `DropField.tsx` (the first two entries already pass from Tasks 3 and 4).

- [ ] **Step 3: Convert the three components**

Apply exactly these substitutions:

| File | Was | Becomes | Why |
|---|---|---|---|
| `ProgressBar.tsx` | fill `var(--signal)` | `var(--text-primary)` | The bar is running-state; ink against the hairline track carries it. |
| `TimeRange.tsx` | selected track / handles `var(--signal)` | `var(--text-primary)` | Selection is ink; the unselected track stays `var(--hairline)`. |
| `DropField.tsx` | drag-active border `var(--signal)` | `var(--text-primary)` | Drag-active is a 1px ink border against the resting 1px hairline. |
| `DropField.tsx` | `background: var(--surface-raised)` | remove the declaration | The ground is white and elevation is the hairline; a raised fill has nothing to be. |

Do not change any `--hairline`, `--text-primary`, `--text-muted` or `--radius` reference — those are renamed wholesale in Task 8 and touching them here would make that rename's diff unreviewable.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/no-semantic-colours.test.ts && pnpm test`
Expected: PASS — including `DropField.test.tsx`, whose existing assertions are behavioural (drop handling), not visual.

- [ ] **Step 5: Commit**

```bash
git add src/components/instrument/ProgressBar.tsx src/components/instrument/TimeRange.tsx src/components/instrument/DropField.tsx src/design/__tests__/no-semantic-colours.test.ts
git commit -m "feat(design): move progress, range and drop states to ink

Adds a migration ledger test that only ever grows: a file converted off
the semantic colours must stay converted. When it covers everything, the
tokens themselves go and it becomes a whole-tree sweep.

DropField loses its raised fill rather than gaining a white one — the
ground is white and elevation is the hairline, so there was nothing for a
raised surface to be."
```

---

## Task 6: The remaining instrument components

**Files:**
- Modify: `src/components/instrument/OptionsPanel.tsx`
- Modify: `src/components/instrument/HeavyDownloadGate.tsx`
- Modify: `src/components/instrument/BatchTable.tsx`
- Modify: `src/components/instrument/ThemeToggle.tsx`
- Modify: `src/design/__tests__/no-semantic-colours.test.ts`

**Interfaces:**
- Consumes / Produces: no prop changes anywhere.

- [ ] **Step 1: Extend the ledger test**

Add these four paths to the `CONVERTED` array in `src/design/__tests__/no-semantic-colours.test.ts`:

```ts
	"src/components/instrument/OptionsPanel.tsx",
	"src/components/instrument/HeavyDownloadGate.tsx",
	"src/components/instrument/BatchTable.tsx",
	"src/components/instrument/ThemeToggle.tsx",
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/no-semantic-colours.test.ts`
Expected: FAIL for all four new entries.

- [ ] **Step 3: Convert the four components**

| File | Was | Becomes |
|---|---|---|
| `OptionsPanel.tsx` | active preset `var(--signal)` | `var(--text-primary)`; inactive presets keep `var(--text-muted)` with a `var(--hairline)` border |
| `OptionsPanel.tsx` | lossy warning `var(--lossy)` | `var(--text-primary)` with the mono label carrying the meaning |
| `HeavyDownloadGate.tsx` | `var(--signal)` accept / `var(--lossy)` warning border | both `var(--text-primary)`; the gate's border becomes `1px dashed var(--text-primary)` |
| `BatchTable.tsx` | done `var(--signal)`, error `var(--error)` | done `var(--text-primary)`; error rows use the mono label `FAILED` in `var(--text-primary)` with `1px dashed var(--text-primary)` on the row's left edge |
| `ThemeToggle.tsx` | selected `var(--signal)` | `var(--text-primary)`; unselected `var(--text-muted)` |

The dashed border on `HeavyDownloadGate` and failed batch rows is the same device as the fidelity ring: a broken line means something is not whole. Using it consistently is what makes it legible without a legend.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS — `OptionsPanel.test.tsx`, `BatchTable.test.tsx` and `ThemeToggle.test.tsx` all assert behaviour and labels, not colours.

- [ ] **Step 5: Commit**

```bash
git add src/components/instrument/ src/design/__tests__/no-semantic-colours.test.ts
git commit -m "feat(design): move the remaining instrument state to ink and dashes

The dashed border on the download gate and on failed batch rows is
deliberately the same device as the fidelity ring's broken stroke. One
meaning, one expression: a line that is not whole means something is not
whole. Used consistently it needs no legend."
```

---

## Task 7: The page-level and content components

**Files:**
- Modify: `src/app/tools/ToolTable.tsx`
- Modify: `src/app/[category]/[slug]/ToolClient.tsx`
- Modify: `src/components/content/Callout.tsx`
- Modify: `src/mdx-components.tsx`
- Modify: `src/design/__tests__/no-semantic-colours.test.ts`

**Interfaces:**
- Consumes / Produces: no prop or testid changes. `data-testid="result"`, `"streamed"` and `"notices"` must survive verbatim.

- [ ] **Step 1: Extend the ledger test**

Add to `CONVERTED`:

```ts
	"src/app/tools/ToolTable.tsx",
	"src/app/[category]/[slug]/ToolClient.tsx",
	"src/components/content/Callout.tsx",
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/no-semantic-colours.test.ts`
Expected: FAIL for `ToolClient.tsx` and `Callout.tsx`. `ToolTable.tsx` already passes — Task 2 converted its 2px border.

- [ ] **Step 3: Convert ToolClient**

Five `var(--signal)` / `var(--error)` / `var(--lossy)` uses, all on buttons and the notices list:

| Element | Was | Becomes |
|---|---|---|
| CONVERT button | `color`/`borderColor` `var(--signal)` | `var(--text-primary)` |
| SAVE button | `var(--signal)` | `var(--text-primary)` |
| SAVE ALL (ZIP) button | `var(--signal)` | `var(--text-primary)` |
| CANCEL button | `var(--error)` | `var(--text-primary)` with `borderStyle: "dashed"` |
| notices list | `borderColor: var(--lossy)` | `borderColor: "var(--text-primary)"`, `borderStyle: "dashed"` |

CANCEL and the notices list both take the dashed treatment for the same reason as Task 6: they mark something incomplete or qualified. CONVERT and SAVE are solid because they are whole actions.

- [ ] **Step 4: Convert Callout and mdx-components**

`Callout.tsx`: the variant colours (`--lossy` for warning, `--signal` for note) collapse to `var(--text-primary)`, with variant distinguished by border style — solid for note, dashed for warning — and by the mono variant label the component already renders.

`mdx-components.tsx`: inline `code` currently fills with `background: "var(--surface-raised)"`. Replace the fill with a hairline:

```tsx
	code: (props) => (
		<code
			className="rounded-[var(--radius)] px-1 py-0.5 font-[family-name:--font-mono] text-[13px]"
			style={{ border: "1px solid var(--hairline)" }}
			{...props}
		/>
	),
```

- [ ] **Step 5: Run the full suite including e2e**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

Then, because this task touched the converter's own markup:

Run: `pnpm build && pnpm exec playwright test`
Expected: PASS — every behavioural assertion still green. If a spec fails on an assertion about *behaviour*, revert and find out why; the change is wrong, not the test.

- [ ] **Step 6: Commit**

```bash
git add src/app src/components/content src/mdx-components.tsx src/design/__tests__/no-semantic-colours.test.ts
git commit -m "feat(design): move page and content components to ink

Solid means whole, dashed means qualified — CONVERT and SAVE are solid,
CANCEL and the notices list are dashed, matching the fidelity ring and the
download gate. Inline code trades its raised fill for a hairline, since a
white ground has no raised surface to offer.

Full Playwright suite re-run: every behavioural assertion still green."
```

---

## Task 8: The switchover

**Files:**
- Modify: `src/app/globals.css`
- Modify: every file listed in the token migration map (25 files)
- Modify: `src/design/__tests__/tokens.test.ts` — add the legacy-name sweep
- Modify: `src/design/__tests__/no-semantic-colours.test.ts` — becomes a whole-tree sweep
- Delete: `src/styles/tokens.css`, `src/styles/__tests__/tokens.test.ts`

**Interfaces:**
- Consumes: `src/design/tokens.css` from Task 1.
- Produces: the live token vocabulary every later plan writes against — `--ground`, `--ink`, `--ink-muted`, `--ink-faint`, `--rule`, `--rule-width`, `--terminal`, `--terminal-ink`, `--terminal-rule`.

This is the one risky task, which is why it is last and mechanical: by now no file references a semantic colour, so this is a rename plus a value change with no design decisions left in it.

- [ ] **Step 1: Write the failing test**

Append to `src/design/__tests__/tokens.test.ts`:

```ts
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
```

Add the `collectSourceFiles` helper (copy it verbatim from `src/design/__tests__/design-system.test.ts`) and the `readdirSync`/`statSync`/`join` imports it needs.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts`
Expected: FAIL — every legacy token is still referenced across 25 files.

- [ ] **Step 3: Repoint the import**

In `src/app/globals.css`, change the first line:

```css
@import "../design/tokens.css";
```

- [ ] **Step 4: Rename mechanically**

Run each substitution across `src`, longest-first so no prefix is clobbered (`--hairline-width` before `--hairline`, `--surface-base` before `--surface`):

```bash
cd /Users/mreshank/Dev/convrtr
FILES=$(grep -rl -- "--surface-base\|--surface-raised\|--text-primary\|--text-muted\|--hairline" src --include='*.tsx' --include='*.ts' --include='*.css' | grep -v __tests__)
for f in $FILES; do
  sed -i '' \
    -e 's/--hairline-width/--rule-width/g' \
    -e 's/--hairline/--rule/g' \
    -e 's/--surface-base/--ground/g' \
    -e 's/--surface-raised/--ground/g' \
    -e 's/--text-primary/--ink/g' \
    -e 's/--text-muted/--ink-muted/g' \
    "$f"
done
```

Then handle the two files the sweep deliberately skips:

- `src/app/manifest.ts` — only mentions the old names in a comment; rewritten in Task 9.
- `src/components/instrument/__tests__/*.tsx` — any test asserting a token string (`ErrorPanel.test.tsx` from Task 4, `FidelityScore.test.tsx` from Task 3) must be updated by hand to the new names.

- [ ] **Step 5: Delete the old token layer**

```bash
rm src/styles/tokens.css src/styles/__tests__/tokens.test.ts
rmdir src/styles/__tests__ src/styles 2>/dev/null || true
```

- [ ] **Step 6: Tighten the semantic-colour sweep to the whole tree**

Replace the body of `src/design/__tests__/no-semantic-colours.test.ts` with a whole-tree assertion, since the per-file ledger has served its purpose:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

describe("semantic colour tokens", () => {
	it("are referenced nowhere in src", () => {
		// State is carried by stroke continuity, fill and the mono label —
		// see the spec's §4.5. A reintroduced --signal would mean a hue had
		// quietly become load-bearing again.
		const offenders = collectSourceFiles("src", [".tsx", ".ts", ".css"])
			.filter((path) => !path.includes("__tests__"))
			.filter((path) =>
				/var\(--(signal|lossy|error)\)/.test(readFileSync(path, "utf8")),
			);
		expect(offenders).toEqual([]);
	});
});
```

- [ ] **Step 7: Run everything**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: PASS.

Then run the visual check that no automated test can make for you:

Run: `pnpm dev`, open `http://localhost:3000`, and confirm in both themes that text is legible, hairlines are visible, and no element has vanished into its own background. An undefined CSS variable resolves to nothing and fails silently — this is the only step that catches a missed rename.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(design): switch to the monochrome token layer

The rename is mechanical because everything risky already happened: by
this point no file referenced a semantic colour, so this is names and
values with no design decisions left in it.

Legacy names go rather than being aliased. Instrument's vocabulary was
surfaces and text; DESIGN.md's is ground and ink, and carrying both would
leave every file written from here on guessing which one applied.

The sweep is now whole-tree: reintroducing --signal anywhere fails."
```

---

## Task 9: The brand mark

**Files:**
- Modify: `scripts/generate-icons.mjs`
- Modify: `src/app/icon.svg`
- Modify: `src/app/manifest.ts`
- Regenerate: `public/icons/icon-192.png`, `icon-512.png`, `icon-192-maskable.png`, `icon-512-maskable.png`
- Test: `src/__tests__/deploy-config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

The mark is the last colour on the site: a `#ccff00` chevron on `#0b0b0c`. `scripts/generate-icons.mjs` already derives the PNGs from the chevron's own geometry, so this is two constants and a re-run.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/deploy-config.test.ts`:

```ts
describe("brand mark", () => {
	it("draws the chevron in the terminal pair, not the old signal colour", () => {
		const svg = readFileSync("src/app/icon.svg", "utf8");
		expect(svg).not.toMatch(/ccff00|0b0b0c/i);
		expect(svg).toMatch(/fill="#0A0A0A"/i);
		expect(svg).toMatch(/stroke="#FFFFFF"/i);
	});

	it("declares manifest colours matching the mark's ground", () => {
		const source = readFileSync("src/app/manifest.ts", "utf8");
		expect(source).toMatch(/background_color:\s*"#0A0A0A"/i);
		expect(source).toMatch(/theme_color:\s*"#0A0A0A"/i);
		expect(source).not.toMatch(/0b0b0c/i);
	});

	it("generates icons from the same two colours the mark uses", () => {
		const script = readFileSync("scripts/generate-icons.mjs", "utf8");
		expect(script).not.toMatch(/ccff00|0b0b0c/i);
		expect(script).toMatch(/#0A0A0A/i);
		expect(script).toMatch(/#FFFFFF/i);
	});
});
```

Add `import { readFileSync } from "node:fs";` to the file if absent.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/__tests__/deploy-config.test.ts`
Expected: FAIL on all three — the old colours are still in place.

- [ ] **Step 3: Recolour the mark**

`src/app/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
	<title>convrtr</title>
	<rect width="32" height="32" fill="#0A0A0A" />
	<path
		d="M11 7 L23 16 L11 25"
		fill="none"
		stroke="#FFFFFF"
		stroke-width="4"
		stroke-linecap="square"
		stroke-linejoin="miter"
	/>
</svg>
```

`scripts/generate-icons.mjs` — rename the two constants and their values, and update the header comment's quoted geometry:

```js
const MARK_GROUND = hexToRgb("#0A0A0A");
const MARK_INK = hexToRgb("#FFFFFF");
```

Then update the three `lerp(...)` calls inside `rasterize()` to use the new names:

```js
			buffer[idx] = lerp(MARK_GROUND[0], MARK_INK[0], coverage);
			buffer[idx + 1] = lerp(MARK_GROUND[1], MARK_INK[1], coverage);
			buffer[idx + 2] = lerp(MARK_GROUND[2], MARK_INK[2], coverage);
```

And in the header comment, change the two quoted fill/stroke values from `#0b0b0c`/`#ccff00` to `#0A0A0A`/`#FFFFFF` so the comment does not describe a file that no longer exists.

`src/app/manifest.ts` — the two colour fields and the comment above the function:

```ts
// Colours are the terminal pair from src/design/tokens.css (--terminal /
// --terminal-ink) — the same pairing icon.svg draws the app mark in, so the
// install and splash experience matches the mark rather than whichever theme
// the OS happens to be in.
```

```ts
		background_color: "#0A0A0A",
		theme_color: "#0A0A0A",
```

- [ ] **Step 4: Regenerate the icons**

Run: `node scripts/generate-icons.mjs`
Expected: four `wrote .../public/icons/...` lines.

- [ ] **Step 5: Verify the output is actually monochrome**

Run:

```bash
node -e '
const {readFileSync}=require("node:fs");
for (const f of ["icon-192.png","icon-512.png","icon-192-maskable.png","icon-512-maskable.png"]) {
  const b=readFileSync("public/icons/"+f);
  console.log(f, b.length, "bytes,", b.subarray(1,4).toString(), "signature ok");
}'
```

Expected: four lines, each reporting `PNG signature ok`. Then open `public/icons/icon-512.png` and confirm by eye that it is a white chevron on near-black with no colour fringing.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-icons.mjs src/app/icon.svg src/app/manifest.ts public/icons src/__tests__/deploy-config.test.ts
git commit -m "feat(design): recolour the brand mark to the terminal pair

The mark was the last colour on the site. Losing acid green costs a
recognisable brand colour, which is a real cost — but a single green mark
on an explicitly monochrome site reads as an oversight rather than a
signature.

The chevron geometry is untouched; generate-icons.mjs already derives the
PNGs from it, so this is two constants and a re-run."
```

---

## Task 10: Motion and focus base rules

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/design/__tests__/design-system.test.ts`

**Interfaces:**
- Consumes: `--ease`, `--dur-min` from Task 1.
- Produces: the `prefers-reduced-motion` and `:focus-visible` base rules that every primitive in Plan 2 relies on.

`cursor: none` is deliberately NOT in this task — see Global Constraints. It ships in Plan 2 with the component that replaces the cursor.

- [ ] **Step 1: Write the failing test**

Append to `src/design/__tests__/design-system.test.ts`:

```ts
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
```

Add `readFileSync` to the file's `node:fs` import if it is not already there.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/design-system.test.ts`
Expected: FAIL — `globals.css` has no reduced-motion block and no focus rule.

- [ ] **Step 3: Add the base rules**

Append to `src/app/globals.css`:

```css
/*
 * Keyboard focus.
 *
 * DESIGN.md's difference cursor signals interactivity by scaling on hover —
 * which never happens for a keyboard user, because the cursor never moves.
 * Without an explicit indicator they would have no way to tell what is
 * focused. 1px is within DESIGN.md's border-weight cap.
 */
:focus-visible {
	outline: 1px solid var(--ink);
	outline-offset: 2px;
}

/*
 * Reduced motion.
 *
 * The system's motion is long by design — 700ms hovers, 1s reveals, a 30s
 * marquee — which is exactly the kind of movement that causes trouble for
 * people who ask for less of it. Reveals resolve to their final state
 * rather than being skipped, so no content is lost; the marquee stops where
 * it stands.
 *
 * `0.01ms` rather than `0` so animation end events still fire — a reveal
 * that waits on `animationend` to remove a clip would otherwise hang
 * forever, showing nothing at all.
 */
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/design/__tests__/design-system.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole gate**

Run: `pnpm run ci`
Expected: PASS — typecheck, lint, unit tests, static build, Playwright.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/design/__tests__/design-system.test.ts
git commit -m "feat(design): add reduced-motion and keyboard focus base rules

Reveals resolve to their final state rather than being skipped, so nobody
loses content by asking for less motion. The duration is 0.01ms rather
than 0 so animationend still fires — a reveal waiting on that event to
un-clip itself would otherwise hang forever showing nothing.

Focus gets an explicit outline because the difference cursor signals
interactivity by scaling on hover, which never happens for a keyboard
user."
```

---

## Task 11: The typeface

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `src/design/__tests__/design-system.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `--font-sans` now resolves to Inter; `--font-mono` is unchanged.

Spec §4.2: Inter, self-hosted through `next/font/google`. The product currently ships IBM Plex Sans, which is an Instrument-era choice DESIGN.md's Style paragraph replaces by name.

Self-hosting is not a stylistic preference here. `next/font/google` downloads and inlines the face at build time, so no request leaves the origin at runtime — a `fonts.googleapis.com` link would put a third-party request on every page of a product whose entire claim is that nothing leaves your device.

**The mono face does not change.** IBM Plex Mono is already a real monospace with tabular figures, which is what the converter's live-counting readouts need. DESIGN.md writes the metadata family as generic `'monospace'`; keeping a self-hosted mono holds that direction steady rather than turning it, and swapping it would be churn for no gain.

- [ ] **Step 1: Write the failing test**

Append to `src/design/__tests__/design-system.test.ts`:

```ts
describe("typeface", () => {
	const layout = readFileSync("src/app/layout.tsx", "utf8");

	it("uses Inter for the sans face", () => {
		// DESIGN.md's Style paragraph names Inter directly. IBM Plex Sans was
		// the Instrument-era choice it replaces.
		expect(layout).toMatch(/import \{[^}]*\bInter\b[^}]*\} from "next\/font\/google"/);
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/design-system.test.ts`
Expected: FAIL — `layout.tsx` still imports `IBM_Plex_Sans`.

- [ ] **Step 3: Swap the face**

In `src/app/layout.tsx`, change the import and the sans declaration:

```tsx
import { IBM_Plex_Mono, Inter } from "next/font/google";
```

```tsx
const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
});
```

Then update the `<html>` className to use the new binding:

```tsx
			className={`${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
```

Leave the `ibmPlexMono` declaration exactly as it is.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/design/__tests__/design-system.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the font actually self-hosts**

Run: `pnpm build`, then:

```bash
grep -rl "fonts.googleapis.com\|fonts.gstatic.com" out/ || echo "no font CDN references in the build output"
```

Expected: `no font CDN references in the build output`. If any appear, the font is being linked rather than inlined and the privacy claim is broken.

- [ ] **Step 6: Run the whole gate**

Run: `pnpm run ci`
Expected: PASS — typecheck, lint, unit tests, static build, Playwright.

This is the plan's exit gate. If Playwright fails on a behavioural assertion, the foundation broke something and it must be fixed before Plan 2 starts.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/design/__tests__/design-system.test.ts
git commit -m "feat(design): set the sans face to Inter

DESIGN.md names Inter directly; IBM Plex Sans was the Instrument-era
choice it replaces. The mono face stays put — it already has the tabular
figures the live byte and time readouts need, and swapping it would be
churn for no gain.

next/font inlines the face at build time. A fonts.googleapis.com link
would put a third-party request on every page of a product whose whole
claim is that nothing leaves your device, so the build output is checked
for CDN references rather than assumed clean."
```

---

## Definition of done

- [ ] `pnpm run ci` passes end to end.
- [ ] `src/styles/` no longer exists; `src/design/tokens.css` is the only token file.
- [ ] No file in `src` references `--signal`, `--lossy`, `--error`, or any legacy token name.
- [ ] No hex outside the monochrome set appears in `src/design/tokens.css`.
- [ ] The site renders correctly in light, dark, and system themes, with JavaScript disabled as well as enabled.
- [ ] Every `data-testid` the Playwright suite drives is unchanged.
- [ ] The brand mark and all four PWA icons are monochrome.
- [ ] `cursor: none` appears nowhere — it belongs to Plan 2.
- [ ] The sans face is Inter, and `out/` contains no font-CDN reference.
- [ ] Filenames still render in their original case — `.mono` does not uppercase.
