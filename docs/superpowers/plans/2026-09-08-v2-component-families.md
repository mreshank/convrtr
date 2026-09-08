# v2 Component Families Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the eight component families DESIGN.v2.md describes but the codebase does not have, composing them from the ten primitives that already exist, and mount each on a real route as it lands.

**Architecture:** Every new family is a composition, not an invention — `FormatStrip` wraps the existing `Marquee`, dividers use the existing `Hairline`, labels use `MonoMeta`, entrances use `Reveal`. Two families derive their content from `src/core/registry` at build time rather than from hand-authored copy, so they cannot go stale. Each task ends by mounting its component on `/` or in `layout.tsx`, because the previous plan proved that a component with no page to render on ships defects a green CI cannot see.

**Tech Stack:** Next.js 16.3 (App Router, `output: "export"`), React 19.2, Tailwind CSS v4, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 + happy-dom + Testing Library, Biome 2.5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-07-void-terminal-glass-design.md`](../specs/2026-09-07-void-terminal-glass-design.md) — §5 ("What v2 adds that does not exist yet") and §6 step 2. The route map it inherits is the prior spec's [§5.1](../specs/2026-09-04-convrtr-editorial-overhaul-design.md).

**Plan 2 of 5.** Then: templates and the existing-route rebuild; samples, live demos, groups and collectives; marketing, legal and sitemap.

**Working directly on `main`** at the user's standing instruction — no worktree. Commit in small, coherent steps.

---

## Why this plan mounts as it builds

The migration plan left eleven design components in the tree and one of them
mounted. Two of the unmounted ones — `SiteHeader` and `SiteFooter` — shipped
real defects that a fully green `pnpm run ci` could not see: the header's focus
ring was clipped to a 1px sliver by its own `overflow-x: auto`, and the footer's
wordmark applied a 68px token's letter-spacing at 32px, crushing the word by
16%. Both were found only when a reviewer injected the components into a built
page, because no route rendered them.

Adding eight more components with nowhere to render them would buy the same
defect class eight more times. So every task here ends with a mount, and the
first task mounts the chrome that already exists.

**A note for the author of Plan 3.** This plan composes `/` directly rather
than through a template. Plan 3 extracts `EditorialPage` from the result. That
order is deliberate: extracting a template from one real composition is sound,
and extracting it from a hypothetical one is how templates acquire parameters
nobody needs.

## Global Constraints

- **The palette is closed.** Only these values may appear in `src/design/tokens.css`: `#000000`, `#111315`, `#E4F1EB`, `#FFFFFF`, `#94979E`, `#131415`, `#303236`, `#18191B`, `#34D59A`, `#47D18C`. Nothing else. No literal hex anywhere else in `src` except the paths in `LITERAL_HEX_ALLOWED`.
- **Mint is rationed.** `--accent` belongs to CTA fills, icon glyphs, code tokens, and the lossless fidelity tint. Never a large fill, never a section background.
- **Mint means two things and shape keeps them apart.** A CTA is a mint **pill fill**; the lossless ring is a mint **stroke tint** on an otherwise ink ring. Filling the ring, or outlining a CTA, collapses the distinction and is a defect.
- **Radius is a closed set:** `0` for everything structural, `4px` for nav-utility controls only, `9999px` for pills and status dots, and `40px`/`100px` for **marquee cards only**.
- **Easing is closed:** `cubic-bezier(0.4, 0, 0.2, 1)`. Durations: `--dur-fade` 150ms, `--dur-hover` 200ms, `--dur-state` 300ms, `--dur-marquee` 30s.
- **Display and headline are weight 400**, not 700.
- **Spacing comes from the scale.** `--space-base` 8px, `--gap-sm` 12px, `--gap-md` 24px, `--gap-lg` 80px, `--section-pad` 240px, `--max-width` 1600px, `--grid-gap` 128px. The sweep in `design-system.test.ts` admits literal px only from `{0, 1, 14, 23, 36, 44}`.
- **Never fill the hero background with a full-frame saturated gradient** — black must dominate; colour stays confined to thin vertical bars and glows in the upper hero region. (DESIGN.v2.md Guardrails.)
- **Never round the feature-grid or panel cards** — 0px radius is structural. (DESIGN.v2.md Guardrails.)
- **The fused headline is one line.** v2 guards explicitly against splitting the muted continuation into a separate subhead.
- **Red and amber are not tokens.** A component needing one declares it locally with a comment.
- **`data-testid` values are frozen.** The Playwright suite drives them.
- **The reduced-motion block in `src/app/globals.css` is load-bearing and must not be touched.** It collapses `animation-duration` to `0.01ms` (not `0`, so `animationend` still fires) and `animation-delay` to `0s`, and pauses `[data-marquee]`.
- **Zero third-party requests.** No CDN, no external font, no remote image. `e2e/network-guard.ts` enforces it.
- **Formatting:** Biome — tabs, double quotes. `pnpm exec biome check --write .` fixes formatting.

---

## File Structure

**Created — `src/design/families/`** (new directory; v2's composite families, distinct from `primitives/` which holds atoms)

| File | Responsibility |
|---|---|
| `FusedHeadline.tsx` | Bold clause + muted continuation on one line. |
| `DotMatrix.tsx` | Dot-matrix grain overlay, CSS-only, no asset. |
| `BarChart.tsx` | Thin vertical bars from a `{label, value}[]`. Presentational only. |
| `HeroBand.tsx` | Composes `FusedHeadline` + `BarChart` + `DotMatrix` + the pill CTA. |
| `TerminalPanel.tsx` | GeistMono log/code panel on `--surface`. |
| `FeatureStrip.tsx` | Five equal columns, label + muted clause + media tile. |
| `FeatureGrid.tsx` | 3×2 uniform grid with hairline dividers. |
| `FormatStrip.tsx` | Infinite format rail. Wraps the existing `Marquee`. |
| `ComplianceRow.tsx` | Verifiable-property badges + mint status dot. |
| `BranchDiagram.tsx` | The conversion graph as branching lines. Exports `branchPath` for testing. |
| `index.ts` | Barrel. |
| `families.css` | The rules a React style object cannot express (grain, grid dividers). |

**Created — data derivation**

| File | Responsibility |
|---|---|
| `src/core/registry/stats.ts` | `toolsByCategory()` and `supportedFormats()`, derived from `TOOLS`. |

**Modified**

| File | Change |
|---|---|
| `src/app/layout.tsx` | Ad-hoc chrome replaced by `SiteHeader` / `SiteFooter`. |
| `src/app/page.tsx` | Composed from the families, one per task. |
| `src/design/primitives/index.ts` | Unchanged — families get their own barrel. |
| `src/design/__tests__/design-system.test.ts` | Family directory added to the sweeps. |
| `src/design/__tests__/primitives-contract.test.ts` | Barrel + client-component coverage extended to `families/`. |

---

## Task 1: Mount the chrome

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `src/app/__tests__/layout.test.tsx` (create)

**Interfaces:**
- Consumes: `SiteHeader({ links, cta })` and `SiteFooter({})` from `src/design/primitives/index.ts` (the barrel re-exports chrome).
- Produces: every later task has a real page with real chrome to mount into.

`layout.tsx` currently renders its whole chrome as one `<Link href="/blog">` inside an ad-hoc flex div. Both real chrome components exist, are tested, and render nowhere. This task is first because it is what makes every later task's mount verifiable.

Read `src/design/chrome/SiteHeader.tsx` before you start, to get the `links` and `cta` prop shapes from the source rather than from this plan.

**One thing may not work as written, and here is the fallback.** `RootLayout` returns `<html>`, and its props are typed `LayoutProps<"/">` — a Next 16 typegen helper. Rendering it into a container works but produces a DOM-nesting warning, and constructing its props in a test may not typecheck. If it does not: extract the chrome into `src/design/chrome/SiteChrome.tsx` — a small component taking `{ children }` and rendering `<SiteHeader> <main> <SiteFooter>` — have `layout.tsx` render that, and point these tests at `SiteChrome` instead. That is a better factoring anyway, since it makes the chrome composition testable without a document. Record which route you took and why in your report; do not weaken the assertions to make the layout render.

- [ ] **Step 1: Write the failing test**

Create `src/app/__tests__/layout.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RootLayout from "@/app/layout";

describe("RootLayout", () => {
	// Rendering a layout that returns <html> inside a container produces a
	// DOM-nesting warning but a usable tree; we assert on the chrome, not on
	// the document shape.
	it("renders the site header and footer, not an ad-hoc bar", () => {
		const { container } = render(
			<RootLayout params={Promise.resolve({})}>
				<main>content</main>
			</RootLayout>,
		);
		expect(container.querySelector("header")).not.toBeNull();
		expect(container.querySelector("footer")).not.toBeNull();
	});

	it("gives the header a wordmark home link and a CTA", () => {
		render(
			<RootLayout params={Promise.resolve({})}>
				<main>content</main>
			</RootLayout>,
		);
		expect(
			screen.getByRole("link", { name: "convrtr" }).getAttribute("href"),
		).toBe("/");
		expect(screen.getByRole("link", { name: /convert/i })).toBeDefined();
	});

	it("routes every nav destination to a route that exists", () => {
		// A header link to a route with no page.tsx is a 404 shipped in the
		// chrome of every page. The route map in the spec lists /tools and
		// /blog as built; groups and collectives are later plans.
		render(
			<RootLayout params={Promise.resolve({})}>
				<main>content</main>
			</RootLayout>,
		);
		const built = new Set(["/", "/tools", "/blog"]);
		for (const link of screen.getAllByRole("link")) {
			const href = link.getAttribute("href") ?? "";
			if (href.startsWith("/")) expect(built.has(href)).toBe(true);
		}
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/app/__tests__/layout.test.tsx`
Expected: FAIL — there is no `<header>` or `<footer>` in the tree.

- [ ] **Step 3: Mount the chrome**

In `src/app/layout.tsx`, delete the ad-hoc `<div className="flex items-center justify-end gap-4 p-4">` block and its `<Link>`, and render the real chrome around `{children}`:

```tsx
import { SiteFooter, SiteHeader } from "@/design/primitives";

const NAV = [
	{ href: "/tools", label: "Tools" },
	{ href: "/blog", label: "Blog" },
];

const CTA = { href: "/tools", label: "Start converting" };
```

```tsx
			<body className="min-h-full flex flex-col">
				<ServiceWorkerRegistration />
				<DifferenceCursor />
				<SiteHeader links={NAV} cta={CTA} />
				<main className="flex-1">{children}</main>
				<SiteFooter />
			</body>
```

Only link to routes that exist. `/tools` and `/blog` both have a `page.tsx`; groups, collectives and the marketing pages are later plans and must not be linked yet.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/app/__tests__/layout.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Verify in a real browser, because this is the first time either component has ever rendered on a route**

Run `pnpm build`, serve `out/`, and with Playwright check on `/`:

1. The header's computed height is `64px` and it stays at `top: 0` after scrolling.
2. **Tab to each nav link and count the focus-ring pixels in the 1–4px annulus around it.** The previous plan fixed a clip that reduced this to a 1px sliver; this is the first time that fix is exercised on a real page rather than on injected markup. All four sides must be non-zero.
3. The footer wordmark's rendered width — the previous plan fixed its letter-spacing from `-2.7px` to `-0.0397em`; confirm the word is not crushed.
4. `document.documentElement.scrollWidth` at 375px equals 375.

Report all four. If the annulus is zero on any side, the previous plan's fix does not survive real mounting and that is a Critical.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/__tests__/layout.test.tsx
git commit -m "feat(chrome): mount the real header and footer

Both components were built, reviewed and rendered nowhere; the layout's
entire chrome was one Blog link in an ad-hoc flex div.

Mounting them first is deliberate. The migration plan shipped two
defects in exactly these two files that a green CI could not see -- a
focus ring clipped to a 1px sliver by the nav's own overflow, and a 68px
token's letter-spacing applied at 32px -- and both were caught only by
injecting the markup into a built page. Every later task in this plan
now has a real page to be verified on.

Nav links point only at routes that exist. Groups, collectives and the
marketing pages are later plans, and a header link to an unbuilt route
is a 404 shipped in the chrome of every page."
```

---

## Task 2: `FusedHeadline`

**Files:**
- Create: `src/design/families/FusedHeadline.tsx`, `src/design/families/index.ts`
- Modify: `src/app/page.tsx`
- Test: `src/design/__tests__/FusedHeadline.test.tsx`

**Interfaces:**
- Produces: `FusedHeadline({ lead, cont, as })` where `lead: string`, `cont: string`, `as?: "h1" | "h2"` defaulting to `"h2"`.

v2's most-repeated text pattern, and the one it guards most explicitly: *"a headline pattern that fuses a bold statement with a muted explanatory continuation in the same line — rejecting the alternative of a separate small subhead below"* (`DESIGN.v2.md:125`). Every content band in v2 is headed by one.

**The muted clause is not a subhead and must not become one.** It is a `<span>` inside the heading, sharing the line. A test pins that, because "make it a subhead" is the single most likely well-intentioned regression here.

**Weight.** v2's display and headline sizes are weight 400. The "bold" clause is bold *relative to its continuation* — the contrast is `--ink` against `--ink-muted`, not 700 against 400. Do not reach for 700; the palette carries the emphasis.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FusedHeadline } from "@/design/families/FusedHeadline";

describe("FusedHeadline", () => {
	it("keeps both clauses inside one heading element", () => {
		// v2 rejects splitting the continuation into a subhead below. If the
		// muted clause escapes the heading, the pattern is gone.
		render(<FusedHeadline lead="Convert anything." cont="Nothing uploads." />);
		const heading = screen.getByRole("heading");
		expect(heading.textContent).toBe("Convert anything. Nothing uploads.");
		expect(heading.querySelectorAll("span").length).toBe(2);
	});

	it("carries the emphasis in colour, not in weight", () => {
		const { container } = render(
			<FusedHeadline lead="Convert anything." cont="Nothing uploads." />,
		);
		const heading = container.querySelector("h2") as HTMLElement;
		const [lead, cont] = [...heading.querySelectorAll("span")] as HTMLElement[];
		expect(heading.style.fontWeight).toBe("400");
		expect(lead?.style.color).toBe("var(--ink)");
		expect(cont?.style.color).toBe("var(--ink-muted)");
	});

	it("renders as h1 when asked, for the one per page that should be", () => {
		render(<FusedHeadline as="h1" lead="a" cont="b" />);
		expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
	});

	it("uses the headline scale, not a literal size", () => {
		const { container } = render(<FusedHeadline lead="a" cont="b" />);
		const heading = container.querySelector("h2") as HTMLElement;
		expect(heading.style.fontSize).toBe("var(--headline-size)");
		expect(heading.style.letterSpacing).toBe("var(--headline-tracking)");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/FusedHeadline.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/FusedHeadline.tsx`:

```tsx
type Props = {
	/** The bold opening clause, in full ink. */
	lead: string;
	/** The muted continuation, on the same line. Not a subhead. */
	cont: string;
	as?: "h1" | "h2";
};

/**
 * v2's headline pattern: a statement and its explanatory continuation fused
 * into one line, the first in `--ink` and the second in `--ink-muted`.
 *
 * v2 states the rejected alternative outright — "rejecting the alternative of
 * a separate small subhead below; this keeps vertical rhythm tight while still
 * carrying two levels of hierarchy in one text block" (DESIGN.v2.md:125). So
 * the continuation is a `<span>` sharing the heading, and a test pins that,
 * because promoting it to a `<p>` beneath is the obvious well-meant edit that
 * would quietly delete the pattern.
 *
 * The emphasis is carried by colour rather than by weight. v2 puts both
 * display sizes at weight 400, so a 700 lead clause would be a departure from
 * the type scale rather than an expression of it.
 */
export function FusedHeadline({ lead, cont, as: Tag = "h2" }: Props) {
	return (
		<Tag
			style={{
				fontSize: "var(--headline-size)",
				fontWeight: 400,
				lineHeight: "var(--display-leading)",
				letterSpacing: "var(--headline-tracking)",
				textWrap: "balance",
			}}
		>
			<span style={{ color: "var(--ink)" }}>{lead}</span>{" "}
			<span style={{ color: "var(--ink-muted)" }}>{cont}</span>
		</Tag>
	);
}
```

Create `src/design/families/index.ts`:

```ts
export { FusedHeadline } from "./FusedHeadline";
```

- [ ] **Step 4: Mount it**

Replace the top of `src/app/page.tsx`'s content with a real fused headline as the page's `h1`. Read the current file first; keep everything else it renders. Use the page's existing copy if it has a headline, otherwise:

```tsx
<FusedHeadline
	as="h1"
	lead="Convert files in your browser."
	cont="Nothing is uploaded, because nothing needs to be."
/>
```

That second clause is the product's actual claim and the `e2e/network-guard.ts` suite proves it, so it is a statement of fact rather than marketing.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/FusedHeadline.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify the fusion actually renders on one line**

Build, serve `out/`, and with Playwright on `/`: read the `h1`'s two spans' bounding boxes and confirm their `top` values are equal at 1280px — i.e. they share a line box rather than stacking. Then confirm at 375px that the heading wraps without overflowing (`documentElement.scrollWidth` equals 375). Report both.

happy-dom cannot do this: it has no line box.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/page.tsx src/design/__tests__/FusedHeadline.test.tsx
git commit -m "feat(families): add v2's fused headline and mount it on the home page

A bold clause and a muted continuation sharing one line. v2 names the
rejected alternative explicitly -- a separate small subhead below -- so
the continuation is a span inside the heading and a test pins it there,
because promoting it to a paragraph is the obvious well-meant edit that
would delete the pattern without failing anything.

The emphasis is colour, not weight: v2 puts both display sizes at 400,
so --ink against --ink-muted carries the hierarchy and a 700 lead would
contradict the scale it is drawn from."
```

---

## Task 3: `DotMatrix`

**Files:**
- Create: `src/design/families/DotMatrix.tsx`, `src/design/families/families.css`
- Modify: `src/design/families/index.ts`, `src/app/globals.css` (import the stylesheet), `src/app/page.tsx`
- Test: `src/design/__tests__/DotMatrix.test.tsx`

**Interfaces:**
- Produces: `DotMatrix({ children })` — wraps content and lays the grain over it.

v2: *"A dot-matrix/halftone grain texture overlays the topmost strip banner and recurs faintly behind code-panel graphics — small, angular, dithered."*

**No image asset.** A repeating `radial-gradient` gives an exact dot lattice at any size, costs no request, and cannot puncture the zero-third-party-request guarantee. It also survives the palette guard, because the gradient's colour comes from a token.

**The grain must not intercept pointer events.** It sits above content, so `pointer-events: none` is load-bearing — without it the grain eats every click in the band it covers, and no unit test would notice.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DotMatrix } from "@/design/families/DotMatrix";

describe("DotMatrix", () => {
	it("renders its children", () => {
		render(
			<DotMatrix>
				<button type="button">click me</button>
			</DotMatrix>,
		);
		expect(screen.getByRole("button", { name: "click me" })).toBeDefined();
	});

	it("never intercepts pointer events", () => {
		// The grain sits above the content it textures. Without this the band
		// it covers stops taking clicks, and no DOM assertion would see it.
		const { container } = render(
			<DotMatrix>
				<span>x</span>
			</DotMatrix>,
		);
		const grain = container.querySelector("[data-grain]") as HTMLElement;
		expect(grain.style.pointerEvents).toBe("none");
	});

	it("hides the grain from assistive technology", () => {
		// It is texture. A screen reader has nothing to say about it.
		const { container } = render(
			<DotMatrix>
				<span>x</span>
			</DotMatrix>,
		);
		const grain = container.querySelector("[data-grain]") as HTMLElement;
		expect(grain.getAttribute("aria-hidden")).toBe("true");
	});

	it("draws the lattice from a token, not a literal", () => {
		const { container } = render(
			<DotMatrix>
				<span>x</span>
			</DotMatrix>,
		);
		const grain = container.querySelector("[data-grain]") as HTMLElement;
		expect(grain.style.backgroundImage).toContain("var(--rule)");
		expect(grain.style.backgroundImage).toContain("radial-gradient");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/DotMatrix.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/DotMatrix.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

/**
 * v2's dot-matrix grain: "small, angular, dithered", over the topmost strip
 * and faintly behind code panels.
 *
 * Drawn as a repeating radial-gradient rather than shipped as an image. A
 * lattice is exactly what a gradient expresses well, it costs no request --
 * which matters in a product whose whole claim is that nothing leaves the
 * device -- and its colour comes from `--rule`, so the palette guard covers
 * it like everything else.
 *
 * `pointer-events: none` is load-bearing, not hygiene. The grain is painted
 * over the content it textures, so without it the entire band stops accepting
 * clicks, and nothing in a DOM-only test suite would notice.
 */
export function DotMatrix({ children }: Props) {
	return (
		<div style={{ position: "relative", isolation: "isolate" }}>
			{children}
			<div
				data-grain
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					backgroundImage:
						"radial-gradient(var(--rule) 1px, transparent 1px)",
					backgroundSize: "var(--gap-sm) var(--gap-sm)",
				}}
			/>
		</div>
	);
}
```

Create `src/design/families/families.css` with only the file header for now — later tasks add rules to it:

```css
/*
 * Rules the families need that a React style object cannot express:
 * descendant selectors, grid pseudo-element dividers, and keyframes.
 *
 * Anything expressible inline belongs inline, next to the component that
 * owns it.
 */
```

Import it from `src/app/globals.css` next to the primitives stylesheet — check how `primitives.css` is imported and follow that exactly.

Add to `src/design/families/index.ts`:

```ts
export { DotMatrix } from "./DotMatrix";
```

- [ ] **Step 4: Mount it**

Wrap the `/` hero region's heading in `DotMatrix` in `src/app/page.tsx`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/DotMatrix.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Prove the grain paints and does not swallow clicks**

happy-dom paints nothing and dispatches no hit-test, so both properties need a browser. Build, serve `out/`, and with Playwright on `/`:

1. Sample pixels across the grain region and confirm at least two distinct values — the dot and the gap. If every pixel is identical, the lattice is not rendering.
2. `document.elementFromPoint(x, y)` at a point inside the grain over an interactive element must return that element, **not** the grain div.
3. Click a link under the grain and confirm the navigation happens.

Report all three.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/globals.css src/app/page.tsx src/design/__tests__/DotMatrix.test.tsx
git commit -m "feat(families): add the dot-matrix grain

Drawn as a repeating radial-gradient rather than shipped as an image: a
lattice is what a gradient expresses well, it costs no request in a
product whose claim is that nothing leaves the device, and its colour
comes from --rule so the palette guard covers it.

pointer-events: none is load-bearing rather than hygiene. The grain is
painted over the content it textures, so without it the whole band stops
taking clicks -- verified by hit-testing in a real browser, since a
DOM-only suite dispatches no hit test and would report this as fine."
```

---

## Task 4: `BarChart`, from the registry

**Files:**
- Create: `src/core/registry/stats.ts`, `src/design/families/BarChart.tsx`
- Modify: `src/design/families/index.ts`, `src/app/page.tsx`
- Test: `src/core/registry/__tests__/stats.test.ts`, `src/design/__tests__/BarChart.test.tsx`

**Interfaces:**
- Produces: `toolsByCategory(): { label: Category; value: number }[]` and `supportedFormats(): string[]` from `src/core/registry/stats.ts`; `BarChart({ data })` from the family, where `data: { label: string; value: number }[]`. There is no `max` prop — the chart derives its own scale from the largest value it is given.

v2's hero carries a bar-chart data visualisation, and its guardrail is specific: *"colour stays confined to thin vertical bars/glows in the upper hero region"* and *"Never fill the hero background with a full-frame saturated gradient."* Thin mint bars on black is exactly the permitted form.

**The data is derived, not authored.** `TOOLS` in `src/core/registry/index.ts` holds 53 tools across the five `CATEGORIES`. Counting them at build time means the chart cannot drift from the product, and a chart of invented numbers on a page that claims verifiability would be self-defeating.

`supportedFormats()` is built here too, because it is the same derivation and Task 9 consumes it.

- [ ] **Step 1: Write the failing test for the derivation**

Create `src/core/registry/__tests__/stats.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CATEGORIES, TOOLS } from "@/core/registry";
import { supportedFormats, toolsByCategory } from "@/core/registry/stats";

describe("toolsByCategory", () => {
	it("counts every tool exactly once", () => {
		const total = toolsByCategory().reduce((sum, d) => sum + d.value, 0);
		expect(total).toBe(TOOLS.length);
	});

	it("returns a row per declared category, in the declared order", () => {
		// Declared order, not count order: the chart's x-axis must be stable
		// as tools are added, or the bars reshuffle between builds.
		expect(toolsByCategory().map((d) => d.label)).toEqual([...CATEGORIES]);
	});

	it("gives an empty category a zero rather than omitting it", () => {
		// A category with no tools yet must still hold its slot, or the axis
		// silently loses a column.
		const rows = toolsByCategory();
		expect(rows.length).toBe(CATEGORIES.length);
		for (const row of rows) expect(row.value).toBeGreaterThanOrEqual(0);
	});
});

describe("supportedFormats", () => {
	it("unions the accepted and emitted extensions", () => {
		const formats = supportedFormats();
		expect(formats).toContain("png");
		expect(formats).toContain("pdf");
		expect(formats.length).toBeGreaterThan(10);
	});

	it("deduplicates and sorts, so the rail is stable between builds", () => {
		const formats = supportedFormats();
		expect(new Set(formats).size).toBe(formats.length);
		expect([...formats].sort()).toEqual(formats);
	});

	it("normalises case, so jpg and JPG are one format", () => {
		expect(supportedFormats().every((f) => f === f.toLowerCase())).toBe(true);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/core/registry/__tests__/stats.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the derivation**

Create `src/core/registry/stats.ts`:

```ts
import { CATEGORIES, TOOLS } from "./index";
import type { Category } from "./types";

/**
 * Tool counts per category, derived from the registry at build time.
 *
 * Derived rather than authored so the hero's chart cannot drift from the
 * product it describes. A page whose headline claim is verifiable should not
 * carry a chart of numbers nobody can check.
 *
 * Rows come back in `CATEGORIES` order rather than sorted by count, so the
 * axis stays put as tools are added instead of reshuffling between builds.
 */
export function toolsByCategory(): { label: Category; value: number }[] {
	return CATEGORIES.map((label) => ({
		label,
		value: TOOLS.filter((tool) => tool.category === label).length,
	}));
}

/**
 * Every file extension the product accepts or emits, lowercased, deduplicated
 * and sorted.
 *
 * Sorted for the same reason the categories are not: this feeds a scrolling
 * rail, and a set's iteration order is insertion order, which would change
 * whenever the registry is reordered.
 */
export function supportedFormats(): string[] {
	const formats = new Set<string>();
	for (const tool of TOOLS) {
		for (const ext of tool.accept.ext) formats.add(ext.toLowerCase());
		formats.add(tool.output.ext.toLowerCase());
	}
	return [...formats].sort();
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm exec vitest run src/core/registry/__tests__/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the chart**

Create `src/design/__tests__/BarChart.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart } from "@/design/families/BarChart";

const DATA = [
	{ label: "image", value: 26 },
	{ label: "audio", value: 14 },
	{ label: "video", value: 10 },
	{ label: "document", value: 3 },
	{ label: "data", value: 0 },
];

describe("BarChart", () => {
	it("draws one bar per row", () => {
		const { container } = render(<BarChart data={DATA} />);
		expect(container.querySelectorAll("[data-bar]").length).toBe(DATA.length);
	});

	it("scales bar heights against the largest value", () => {
		const { container } = render(<BarChart data={DATA} />);
		const bars = [...container.querySelectorAll("[data-bar]")] as HTMLElement[];
		expect(bars[0]?.style.height).toBe("100%");
		// 10/26 = 38.46%, rounded to two places.
		expect(bars[2]?.style.height).toBe("38.46%");
	});

	it("gives a zero-value category a visible floor, not nothing", () => {
		// A bar of height 0 reads as a missing column rather than an empty
		// one, which misrepresents the axis.
		const { container } = render(<BarChart data={DATA} />);
		const bars = [...container.querySelectorAll("[data-bar]")] as HTMLElement[];
		expect(bars[4]?.style.height).toBe("1px");
	});

	it("uses mint for the bars, which is a permitted rationed use", () => {
		const { container } = render(<BarChart data={DATA} />);
		const bar = container.querySelector("[data-bar]") as HTMLElement;
		expect(bar.style.background).toBe("var(--accent)");
	});

	it("is readable as a table by assistive technology", () => {
		// The bars are decorative geometry; the numbers are the content. A
		// screen reader gets the figures, not a row of unlabelled divs.
		const { container, getByText } = render(<BarChart data={DATA} />);
		expect(container.querySelector("table")).not.toBeNull();
		expect(getByText("26")).toBeDefined();
	});
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/BarChart.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 7: Write the chart**

Create `src/design/families/BarChart.tsx`:

```tsx
type Row = {
	label: string;
	value: number;
};

type Props = {
	data: Row[];
};

/**
 * v2's hero data visualisation, in the only form its guardrails permit: thin
 * vertical mint bars over black. v2 forbids a full-frame saturated gradient
 * behind the hero and confines colour to "thin vertical bars/glows in the
 * upper hero region", which is precisely this.
 *
 * Built on a `<table>` rather than a row of divs. The bars are geometry and
 * the numbers are the content, so assistive technology gets a real table with
 * real figures while the visual layer stays decorative. That also means the
 * chart degrades to something legible with no CSS at all, which a static
 * export should.
 *
 * A zero row draws a 1px floor rather than nothing. A category with no tools
 * yet is an empty column, and a column of height zero reads as a missing one.
 */
export function BarChart({ data }: Props) {
	const max = Math.max(...data.map((row) => row.value), 1);

	return (
		<table
			style={{
				width: "100%",
				borderCollapse: "collapse",
				tableLayout: "fixed",
			}}
		>
			<caption className="meta" style={{ textAlign: "left" }}>
				Tools by category
			</caption>
			<tbody>
				<tr>
					{data.map((row) => (
						<td
							key={row.label}
							style={{
								verticalAlign: "bottom",
								height: "var(--gap-lg)",
								padding: 0,
							}}
						>
							<div
								data-bar
								style={{
									background: "var(--accent)",
									height:
										row.value === 0
											? "1px"
											: `${Math.round((row.value / max) * 10000) / 100}%`,
									width: "var(--space-base)",
									margin: "0 auto",
								}}
							/>
						</td>
					))}
				</tr>
				<tr>
					{data.map((row) => (
						<td
							key={row.label}
							className="mono"
							style={{
								color: "var(--ink)",
								textAlign: "center",
								padding: "var(--gap-sm) 0 0",
							}}
						>
							{row.value}
						</td>
					))}
				</tr>
				<tr>
					{data.map((row) => (
						<th
							key={row.label}
							scope="col"
							className="meta"
							style={{
								color: "var(--ink-muted)",
								fontWeight: 400,
								textAlign: "center",
								padding: "var(--space-base) 0 0",
							}}
						>
							{row.label}
						</th>
					))}
				</tr>
			</tbody>
		</table>
	);
}
```

Add to `src/design/families/index.ts`:

```ts
export { BarChart } from "./BarChart";
```

- [ ] **Step 8: Mount it**

In `src/app/page.tsx`, render the chart from the derivation:

```tsx
import { toolsByCategory } from "@/core/registry/stats";
```

```tsx
<BarChart data={toolsByCategory()} />
```

- [ ] **Step 9: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/BarChart.test.tsx src/core/registry/__tests__/stats.test.ts && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 10: Verify the bars have real height in a browser**

Percentage heights resolve against a parent's computed height, which happy-dom does not compute — so the unit test above proves the *string* is right and nothing about the rendering. Build, serve `out/`, and with Playwright on `/`: report each bar's `getBoundingClientRect().height`. The tallest must be non-zero, they must be ordered consistently with the data, and the zero-value bar must be 1px rather than 0. If every bar is 0, the percentage has no containing height and the chart is invisible — a Critical.

- [ ] **Step 11: Commit**

```bash
git add src/core/registry/stats.ts src/core/registry/__tests__ src/design/families src/app/page.tsx src/design/__tests__/BarChart.test.tsx
git commit -m "feat(families): add the hero bar chart, derived from the registry

Thin vertical mint bars over black -- the only form v2's guardrails
permit, since it forbids a full-frame saturated gradient behind the hero
and confines colour to thin bars and glows in the upper region.

The data is derived from TOOLS at build time rather than authored. A
page whose headline claim is that anyone can verify it should not carry
a chart of numbers nobody can check, and a derived count cannot drift
from the product as tools are added.

Built on a table: the bars are geometry, the numbers are the content, so
assistive technology gets real figures and the chart stays legible with
no CSS at all. A zero-value category draws a 1px floor rather than
nothing, because a column of height zero reads as a missing column
rather than an empty one."
```

---

## Task 5: `HeroBand` — and the first mint pill

**Files:**
- Create: `src/design/families/HeroBand.tsx`
- Modify: `src/design/families/index.ts`, `src/app/page.tsx`
- Test: `src/design/__tests__/HeroBand.test.tsx`

**Interfaces:**
- Consumes: `FusedHeadline`, `BarChart`, `DotMatrix` from the family barrel; `toolsByCategory()` from `src/core/registry/stats.ts`.
- Produces: `HeroBand({ lead, cont, cta, secondary })` where `cta` and `secondary` are `{ href: string; label: string }`.

v2's first screen: eyebrow, two-line display headline, a pill-button pair, then content bleeding into the fold. `DESIGN.v2.md:138` specifies the primary as *"an observed near-white/off-white solid pill, ~44px tall, full pill corners — the highest-contrast, most emphasized control on the first screen. Paired with a secondary outline pill (transparent fill, white text, border, same height) — outline variant is secondary, never primary."*

**This task ships the first mint pill fill in the codebase, and that matters beyond this page.** The whole "mint means two things, shape keeps them apart" constraint rests on both shapes existing: a mint **pill fill** for a call to action, a mint **stroke tint** for the lossless ring. Until now only the ring existed, so the distinction was asserted but not demonstrated. The shell-command CTA from `DESIGN.v2.md:143` — *"a mint-fill pill CTA styled as a shell command (`#34D59A` fill, black text, 9999px radius, 44px height, 0px/28px padding, monospace command text)"* — is that shape.

Note the hero primary is **white**, not mint; the mint pill is the shell-command variant. Both appear here, which is what makes the pairing legible.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBand } from "@/design/families/HeroBand";

const PROPS = {
	lead: "Convert files in your browser.",
	cont: "Nothing is uploaded.",
	cta: { href: "/tools", label: "Start converting" },
	secondary: { href: "/how-it-works", label: "How it works" },
};

describe("HeroBand", () => {
	it("makes the headline the page's h1", () => {
		render(<HeroBand {...PROPS} />);
		expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
	});

	it("fills the primary pill and only outlines the secondary", () => {
		// v2: the outline variant is secondary, never primary. Swapping them
		// inverts the emphasis of the first screen.
		render(<HeroBand {...PROPS} />);
		const primary = screen.getByRole("link", { name: PROPS.cta.label });
		const secondary = screen.getByRole("link", { name: PROPS.secondary.label });
		expect(primary.style.background).toBe("var(--ink)");
		expect(primary.style.color).toBe("var(--ground)");
		expect(secondary.style.background).toBe("transparent");
		expect(secondary.style.border).toContain("var(--rule)");
	});

	it("gives both pills full pill corners and v2's height", () => {
		render(<HeroBand {...PROPS} />);
		for (const label of [PROPS.cta.label, PROPS.secondary.label]) {
			const pill = screen.getByRole("link", { name: label });
			expect(pill.style.borderRadius).toBe("var(--radius-pill)");
			expect(pill.style.height).toBe("44px");
		}
	});

	it("never outlines a mint call to action", () => {
		// Mint means two things and shape keeps them apart: a CTA is a mint
		// pill FILL, the lossless fidelity ring is a mint stroke TINT.
		// Outlining a CTA in mint collapses the distinction.
		render(<HeroBand {...PROPS} />);
		for (const link of screen.getAllByRole("link")) {
			if (link.style.borderColor?.includes("--accent")) {
				throw new Error(`mint used as a stroke on a CTA: ${link.textContent}`);
			}
		}
	});

	it("renders the chart without making it the page's headline", () => {
		const { container } = render(<HeroBand {...PROPS} />);
		expect(container.querySelectorAll("[data-bar]").length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/HeroBand.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/HeroBand.tsx`:

```tsx
import Link from "next/link";
import { toolsByCategory } from "@/core/registry/stats";
import { BarChart } from "./BarChart";
import { DotMatrix } from "./DotMatrix";
import { FusedHeadline } from "./FusedHeadline";

type Action = {
	href: string;
	label: string;
};

type Props = {
	lead: string;
	cont: string;
	cta: Action;
	secondary: Action;
};

const PILL = {
	height: "44px",
	borderRadius: "var(--radius-pill)",
	display: "inline-flex",
	alignItems: "center",
	padding: "0 var(--gap-md)",
	fontSize: "var(--label-size)",
	fontWeight: 500,
	letterSpacing: "var(--label-tracking)",
	textDecoration: "none",
	transition: "background var(--dur-hover) var(--ease)",
} as const;

/**
 * v2's first screen: the fused headline, a pill pair, and the bar chart
 * bleeding into the fold, all under the dot-matrix grain.
 *
 * The primary pill is white-filled and the secondary is a transparent outline.
 * v2 is explicit that "the outline variant is secondary, never primary"
 * (DESIGN.v2.md:138), and swapping them inverts the emphasis of the whole
 * first screen -- so a test pins the fill on one and the border on the other.
 *
 * Mint is deliberately absent from these two. It means two things in this
 * system and shape is what keeps them apart: a mint pill FILL is a call to
 * action, a mint stroke TINT is the lossless fidelity ring. The mint pill
 * belongs to v2's shell-command CTA (DESIGN.v2.md:143), not to the hero
 * primary, which v2 observes as white. Outlining anything in mint here would
 * collapse the distinction the fidelity ring depends on.
 */
export function HeroBand({ lead, cont, cta, secondary }: Props) {
	return (
		<DotMatrix>
			<section
				style={{
					maxWidth: "var(--max-width)",
					margin: "0 auto",
					padding: "var(--gap-lg) var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
				}}
			>
				<p className="meta" style={{ color: "var(--ink-muted)" }}>
					Local file conversion
				</p>

				<FusedHeadline as="h1" lead={lead} cont={cont} />

				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--gap-sm)",
						marginTop: "var(--space-base)",
					}}
				>
					<Link
						href={cta.href}
						style={{
							...PILL,
							background: "var(--ink)",
							color: "var(--ground)",
						}}
					>
						{cta.label}
					</Link>
					<Link
						href={secondary.href}
						style={{
							...PILL,
							background: "transparent",
							color: "var(--ink)",
							border: "var(--rule-width) solid var(--rule)",
						}}
					>
						{secondary.label}
					</Link>
				</div>

				<div style={{ marginTop: "var(--gap-lg)" }}>
					<BarChart data={toolsByCategory()} />
				</div>
			</section>
		</DotMatrix>
	);
}
```

Add to `src/design/families/index.ts`:

```ts
export { HeroBand } from "./HeroBand";
```

- [ ] **Step 4: Mount it, replacing the pieces it absorbs**

In `src/app/page.tsx`, replace the separate `FusedHeadline`, `DotMatrix` and `BarChart` mounts from Tasks 2–4 with one `HeroBand`. The secondary action must point at a route that exists — `/tools` and `/blog` are the only built ones, so use `/blog` until the marketing pages land, or drop the secondary if neither reads honestly.

- [ ] **Step 5: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify the pills and the hover in a browser**

Build, serve `out/`, and with Playwright on `/`:

1. Both pills' computed `height` is `44px` and `border-radius` resolves to a full pill.
2. The primary's computed `background-color` is `rgb(255, 255, 255)` and its text `rgb(0, 0, 0)`; compute the contrast ratio and report it.
3. Hover the primary and confirm the background transitions rather than jumping — read `transition-duration`, and confirm it is `0.2s`.
4. **Tab to each pill and report the focus-ring contrast** against the pill's own background. A white pill on a black page with a white focus ring is the trap here: the ring must be visible against the *pill*, not just against the page. If it is not, say so — that is an Important finding, and the fix is the concern of this task.
5. `documentElement.scrollWidth` at 375px equals 375.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/page.tsx src/design/__tests__/HeroBand.test.tsx
git commit -m "feat(families): assemble v2's hero band

The fused headline, a pill pair and the registry-derived bar chart under
the dot-matrix grain.

The primary pill is filled and the secondary is outlined, pinned by a
test in both directions: v2 states that the outline variant is secondary
and never primary, and swapping them inverts the emphasis of the entire
first screen.

Mint is deliberately absent from both. It carries two meanings held
apart by shape -- a mint pill fill is an action, a mint stroke tint is
the lossless fidelity ring -- and v2 observes the hero primary as white,
reserving the mint fill for its shell-command CTA. A test fails if any
call to action takes mint as a stroke, because that is the shape
collision the fidelity encoding depends on not happening."
```

---

## Task 6: `TerminalPanel`

**Files:**
- Create: `src/design/families/TerminalPanel.tsx`
- Modify: `src/design/families/index.ts`, `src/design/families/families.css`, `src/app/page.tsx`
- Test: `src/design/__tests__/TerminalPanel.test.tsx`

**Interfaces:**
- Produces: `TerminalPanel({ lines, label })` where `lines: { text: string; tone?: "ink" | "muted" | "accent" }[]`.

v2 names GeistMono as *"the system's accent face, signaling 'developer tool' wherever it appears — in code panels, terminal timestamps, and the CTA reading a shell command."* This is that panel. It sits on `--surface` (`#111315`), which until now had **zero consumers** — the one v2 colour the migration declared and never used.

**`tone: "accent"` is the code-token use of mint**, which the constraint permits explicitly ("code tokens"). It is a colour on text, not a fill.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TerminalPanel } from "@/design/families/TerminalPanel";

const LINES = [
	{ text: "$ convrtr heic-to-jpg photo.heic" },
	{ text: "reading photo.heic (4.2 MB)", tone: "muted" as const },
	{ text: "done -> photo.jpg (1.1 MB)", tone: "accent" as const },
];

describe("TerminalPanel", () => {
	it("renders every line in order", () => {
		render(<TerminalPanel label="Shell" lines={LINES} />);
		const panel = screen.getByRole("group", { name: "Shell" });
		expect(panel.textContent).toContain("$ convrtr heic-to-jpg photo.heic");
		expect(panel.textContent).toContain("done -> photo.jpg (1.1 MB)");
	});

	it("sits on the raised surface, not on the page ground", () => {
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		const panel = container.querySelector("[data-terminal]") as HTMLElement;
		expect(panel.style.background).toBe("var(--surface)");
	});

	it("is square, because panels are structural", () => {
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		const panel = container.querySelector("[data-terminal]") as HTMLElement;
		expect(panel.style.borderRadius).toBe("");
	});

	it("maps tones to tokens, with accent only on a code token", () => {
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		const rows = [...container.querySelectorAll("[data-line]")] as HTMLElement[];
		expect(rows[0]?.style.color).toBe("var(--ink)");
		expect(rows[1]?.style.color).toBe("var(--ink-muted)");
		expect(rows[2]?.style.color).toBe("var(--accent)");
	});

	it("preserves each line as its own line without relying on white-space", () => {
		// A pre-wrap panel that loses its newlines reads as one run-on line.
		// One element per line makes the structure independent of CSS.
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		expect(container.querySelectorAll("[data-line]").length).toBe(LINES.length);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/TerminalPanel.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/TerminalPanel.tsx`:

```tsx
type Tone = "ink" | "muted" | "accent";

type Line = {
	text: string;
	tone?: Tone;
};

type Props = {
	lines: Line[];
	/** Names the panel for assistive technology. */
	label: string;
};

const TONE: Record<Tone, string> = {
	ink: "var(--ink)",
	muted: "var(--ink-muted)",
	accent: "var(--accent)",
};

/**
 * v2's terminal and code panel, in GeistMono on the raised surface.
 *
 * v2 calls the mono family "the system's accent face, signaling 'developer
 * tool' wherever it appears -- in code panels, terminal timestamps, and the
 * CTA reading a shell command". This is the panel that claim describes, and it
 * is the first consumer of `--surface`: the migration declared that colour and
 * nothing used it, because there was no raised panel in the system yet.
 *
 * `tone: "accent"` is the code-token use of mint, which the palette rations
 * explicitly alongside CTA fills and the lossless ring. It colours text, never
 * a fill, so it stays clear of the pill-fill shape that means "action".
 *
 * One element per line rather than a single `white-space: pre` block, so the
 * line structure survives with no CSS -- which matters for a static export
 * whose stylesheet may not have arrived yet.
 */
export function TerminalPanel({ lines, label }: Props) {
	return (
		<div
			data-terminal
			role="group"
			aria-label={label}
			style={{
				background: "var(--surface)",
				border: "var(--rule-width) solid var(--rule-subtle)",
				padding: "var(--gap-md)",
				overflowX: "auto",
			}}
		>
			{lines.map((line, index) => (
				<div
					// The text alone is not unique -- a real log repeats lines --
					// and the index alone loses identity when lines are prepended.
					key={`${index}-${line.text}`}
					data-line
					className="mono"
					style={{
						color: TONE[line.tone ?? "ink"],
						fontSize: "var(--mono-size)",
						lineHeight: "var(--body-leading)",
						whiteSpace: "pre",
					}}
				>
					{line.text}
				</div>
			))}
		</div>
	);
}
```

**On the `key`:** Biome's `noArrayIndexKey` rule forbids a bare index. The composite key satisfies it and is honest about why — read the comment before changing it.

Add to `src/design/families/index.ts`:

```ts
export { TerminalPanel } from "./TerminalPanel";
```

- [ ] **Step 4: Mount it, inside the grain**

In `src/app/page.tsx`, render a panel below the hero showing a real conversion, using real numbers from a tool that exists. Do not invent a command-line interface the product does not have — describe what the browser does.

**Wrap it in `DotMatrix`.** v2 says the grain *"overlays the topmost strip banner and recurs faintly behind code-panel graphics"* — the code panel is its second stated home, and Task 3 mounted only the first. This is what closes that half of the requirement.

```tsx
<DotMatrix>
	<TerminalPanel
		label="What happens when you convert a file"
		lines={[
			{ text: "photo.heic selected — 4.2 MB" },
			{ text: "decoding locally, no upload", tone: "muted" },
			{ text: "libheif → jpeg, quality 78", tone: "muted" },
			{ text: "photo.jpg ready — 1.1 MB", tone: "accent" },
		]}
	/>
</DotMatrix>
```

The grain's `pointer-events: none` matters more here than in the hero: the panel has `overflow-x: auto`, so a grain that swallowed events would also kill its scroll. Your Step 6 hit-test covers it.

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/TerminalPanel.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify contrast on the raised surface**

`--surface` is `#111315`, not the page's `#000000`, so every contrast pair inside the panel is against a different ground than the rest of the page — and this is the first component in the codebase to sit on it. Build, serve `out/`, and with Playwright on `/`, compute and report the WCAG ratio of each tone against the panel's computed background:

- `--ink` (`#FFFFFF`) on `#111315`
- `--ink-muted` (`#94979E`) on `#111315`
- `--accent` (`#34D59A`) on `#111315`

Flag anything below 4.5:1. Report the panel's own `border` visibility too: `--rule-subtle` (`#18191B`) on `#111315` is a very low ratio by design, so say what it computes to rather than judging it.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/page.tsx src/design/__tests__/TerminalPanel.test.tsx
git commit -m "feat(families): add the terminal panel

GeistMono on the raised surface -- v2's accent face doing the job v2
names for it, signalling developer tool in a code panel. First consumer
of --surface, which the migration declared and nothing used, because the
system had no raised panel yet.

The accent tone is the code-token use of mint the palette rations
explicitly. It colours text and never a fill, so it stays clear of the
pill-fill shape that means action.

One element per line rather than a pre block, so the line structure
survives with no stylesheet -- which a static export should not assume
has arrived. Contrast for all three tones is measured against the
panel's own ground rather than the page's, since this is the first
component to sit on a surface that is not #000000."
```

---

## Task 7: `FeatureStrip` — five-up

**Files:**
- Create: `src/design/families/FeatureStrip.tsx`
- Modify: `src/design/families/index.ts`, `src/app/page.tsx`
- Test: `src/design/__tests__/FeatureStrip.test.tsx`

**Interfaces:**
- Produces: `FeatureStrip({ items })` where `items: { label: string; body: string; media?: ReactNode }[]`.

`DESIGN.v2.md:139`: *"first screen, 5 equal columns, each: small bold label + gray descriptive clause (label-md), then a media tile below — media covers roughly half the card height, zero radius, transparent card background, no border, no padding (edge-bleeding media)."*

**Five equal columns at 1280px is 256px each; at 375px it is 75px.** v2 says "uniform width, not variable spans" and is silent on mobile. A five-column grid at phone width is unreadable, so this task owes a responsive answer the way the display clamp did: the columns collapse to a single column below the point where they stop being legible. Record that as an extension.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureStrip } from "@/design/families/FeatureStrip";

const ITEMS = [
	{ label: "Local", body: "Files never leave the device." },
	{ label: "Fast", body: "No round trip to a server." },
	{ label: "Private", body: "No account, no telemetry." },
	{ label: "Offline", body: "Works with the network off." },
	{ label: "Honest", body: "Fidelity is stated, not implied." },
];

describe("FeatureStrip", () => {
	it("renders one column per item", () => {
		const { container } = render(<FeatureStrip items={ITEMS} />);
		expect(container.querySelectorAll("[data-feature]").length).toBe(5);
	});

	it("splits emphasis between an ink label and a muted clause", () => {
		render(<FeatureStrip items={ITEMS} />);
		const label = screen.getByText("Local");
		const body = screen.getByText("Files never leave the device.");
		expect(label.style.color).toBe("var(--ink)");
		expect(body.style.color).toBe("var(--ink-muted)");
	});

	it("gives the cards no border, no radius and no background", () => {
		// v2: transparent card background, no border, zero radius,
		// edge-bleeding media.
		const { container } = render(<FeatureStrip items={ITEMS} />);
		const card = container.querySelector("[data-feature]") as HTMLElement;
		expect(card.style.background).toBe("transparent");
		expect(card.style.border).toBe("");
		expect(card.style.borderRadius).toBe("");
		expect(card.style.padding).toBe("");
	});

	it("declares five equal columns rather than variable spans", () => {
		const { container } = render(<FeatureStrip items={ITEMS} />);
		const grid = container.querySelector("[data-feature-strip]") as HTMLElement;
		expect(grid.style.gridTemplateColumns).toContain("repeat(5,");
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/FeatureStrip.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/FeatureStrip.tsx`:

```tsx
import type { ReactNode } from "react";

type Item = {
	label: string;
	body: string;
	media?: ReactNode;
};

type Props = {
	items: Item[];
};

/**
 * v2's five-up feature strip: five equal columns, each a small ink label over
 * a muted clause, with an optional media tile bleeding to the card's edges.
 *
 * v2 specifies "uniform width, not variable spans" and gives the cards a
 * transparent background, no border, zero radius and no padding. All four are
 * pinned by tests, because a card is the thing most likely to acquire a border
 * and a radius from habit.
 *
 * The single-column collapse below 900px is an extension. v2 states the
 * desktop composition and is silent on smaller viewports; five equal columns
 * at phone width give each about 75px, which is narrower than the words in
 * them. The breakpoint lives in `families.css` because a media query cannot be
 * expressed in a style object.
 */
export function FeatureStrip({ items }: Props) {
	return (
		<div
			data-feature-strip
			style={{
				display: "grid",
				gridTemplateColumns: `repeat(5, minmax(0, 1fr))`,
				gap: "var(--gap-md)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{items.map((item) => (
				<div
					key={item.label}
					data-feature
					style={{
						background: "transparent",
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
					}}
				>
					<p
						style={{
							color: "var(--ink)",
							fontSize: "var(--label-size)",
							fontWeight: "var(--label-weight)",
							letterSpacing: "var(--label-tracking)",
						}}
					>
						{item.label}
					</p>
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--label-size)",
							letterSpacing: "var(--label-tracking)",
							lineHeight: "var(--body-leading)",
						}}
					>
						{item.body}
					</p>
					{item.media ? (
						<div style={{ marginTop: "var(--gap-sm)" }}>{item.media}</div>
					) : null}
				</div>
			))}
		</div>
	);
}
```

Add to `src/design/families/families.css`:

```css
/*
 * The five-up strip collapses to one column below 900px.
 *
 * An extension, not a restatement: v2 specifies five equal columns for the
 * first screen and says nothing about narrow viewports. Five columns at 375px
 * leave roughly 75px each, which is narrower than the labels they hold.
 */
@media (max-width: 900px) {
	[data-feature-strip] {
		grid-template-columns: minmax(0, 1fr);
	}
}
```

Add to `src/design/families/index.ts`:

```ts
export { FeatureStrip } from "./FeatureStrip";
```

- [ ] **Step 4: Mount it**

In `src/app/page.tsx`, render the strip below the terminal panel with the five items from the test above — each one a property the product actually has. "Works with the network off" is true because of the service worker (`ServiceWorkerRegistration` in `layout.tsx`); if you cannot verify a claim, replace it with one you can.

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/FeatureStrip.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify the columns and the collapse**

Grid layout is exactly what happy-dom does not do. Build, serve `out/`, and with Playwright on `/`:

1. At 1280px, report all five columns' `getBoundingClientRect().width`. They must be equal to within a pixel.
2. At 375px, confirm they stack — report the five `rect.top` values, which must be distinct and increasing — and confirm `documentElement.scrollWidth` equals 375.
3. At exactly 901px and 899px, confirm the layout switches.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/page.tsx src/design/__tests__/FeatureStrip.test.tsx
git commit -m "feat(families): add the five-up feature strip

Five equal columns, each an ink label over a muted clause. v2's card
here is transparent with no border, zero radius and no padding, and all
four are pinned by tests -- a card is the element most likely to acquire
a border and a radius from habit rather than from the brief.

The single-column collapse below 900px is recorded as an extension. v2
specifies the desktop composition and is silent below it; five equal
columns at 375px leave each about 75px, narrower than the labels they
hold. Verified by measuring real column widths in a browser, since grid
layout is precisely what the unit environment does not do.

The five claims are properties the product has rather than copy: the
offline one rests on the service worker the layout already registers."
```

---

## Task 8: `FeatureGrid` — 3×2 with hairline dividers

**Files:**
- Create: `src/design/families/FeatureGrid.tsx`
- Modify: `src/design/families/index.ts`, `src/design/families/families.css`, `src/app/page.tsx`
- Test: `src/design/__tests__/FeatureGrid.test.tsx`

**Interfaces:**
- Produces: `FeatureGrid({ items })` where `items: { label: string; body: string }[]` of length 6.

`DESIGN.v2.md:142`: *"mid-page, 6 cards in 2 rows of 3 equal-width columns (30/30/30 per row), each card: small mint-tinted icon glyph top, bold label + gray body text below, transparent fill, 0px radius, thin border dividers between cells, no padding beyond text inset — no CTA, informational only."* And the guardrail: *"Never round the feature-grid or panel cards."*

**"Thin border dividers between cells" means between, not around.** A border on every cell doubles every interior line and draws an outer frame v2 does not ask for. The correct expression is a one-directional border on the cells that have a neighbour, which needs CSS selectors — hence `families.css`.

**The mint icon glyph is a permitted rationed use** ("icon glyphs"). Keep it a glyph, not a fill.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureGrid } from "@/design/families/FeatureGrid";

const ITEMS = [
	{ label: "No upload", body: "Conversion runs in the page." },
	{ label: "No account", body: "Nothing to sign up for." },
	{ label: "No telemetry", body: "No analytics beacon." },
	{ label: "Stated fidelity", body: "Lossless is labelled lossless." },
	{ label: "Open formats", body: "Eighteen extensions in and out." },
	{ label: "Offline", body: "Cached and usable with no network." },
];

describe("FeatureGrid", () => {
	it("renders six cells in three columns", () => {
		const { container } = render(<FeatureGrid items={ITEMS} />);
		expect(container.querySelectorAll("[data-cell]").length).toBe(6);
		const grid = container.querySelector("[data-feature-grid]") as HTMLElement;
		expect(grid.style.gridTemplateColumns).toContain("repeat(3,");
	});

	it("keeps every cell square and transparent", () => {
		// v2's guardrail names this one directly: never round the
		// feature-grid cards, 0px radius is structural.
		const { container } = render(<FeatureGrid items={ITEMS} />);
		for (const cell of container.querySelectorAll("[data-cell]")) {
			const el = cell as HTMLElement;
			expect(el.style.borderRadius).toBe("");
			expect(el.style.background).toBe("transparent");
		}
	});

	it("tints the glyph with mint and leaves it a glyph, not a fill", () => {
		const { container } = render(<FeatureGrid items={ITEMS} />);
		const glyph = container.querySelector("[data-glyph]") as HTMLElement;
		expect(glyph.style.color).toBe("var(--accent)");
		expect(glyph.style.background).toBe("");
	});

	it("hides the glyphs from assistive technology", () => {
		// They are decoration above a real label; announcing them adds noise.
		const { container } = render(<FeatureGrid items={ITEMS} />);
		for (const glyph of container.querySelectorAll("[data-glyph]")) {
			expect(glyph.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("splits emphasis between label and body", () => {
		render(<FeatureGrid items={ITEMS} />);
		expect(screen.getByText("No upload").style.color).toBe("var(--ink)");
		expect(screen.getByText("Conversion runs in the page.").style.color).toBe(
			"var(--ink-muted)",
		);
	});

	it("carries no call to action, because the grid is informational", () => {
		const { container } = render(<FeatureGrid items={ITEMS} />);
		expect(container.querySelectorAll("a, button").length).toBe(0);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/FeatureGrid.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/FeatureGrid.tsx`:

```tsx
type Item = {
	label: string;
	body: string;
};

type Props = {
	items: Item[];
};

/**
 * v2's enterprise-feature grid: six informational cells in two rows of three,
 * separated by hairline dividers, with a mint glyph over an ink label and a
 * muted body.
 *
 * v2's guardrail names this component specifically -- "Never round the
 * feature-grid or panel cards -- 0px radius is structural to this system" --
 * so the square corners and transparent fill are both pinned by tests.
 *
 * The dividers go *between* cells, not around them. A border on every cell
 * would double every interior line and draw an outer frame v2 does not ask
 * for, so the rules live in `families.css` where a selector can pick out only
 * the cells that have a neighbour.
 *
 * The glyph is the "icon glyph" use of mint the palette rations. It stays a
 * glyph: mint as a fill is what a call to action looks like, and this grid
 * deliberately has none.
 */
export function FeatureGrid({ items }: Props) {
	return (
		<div
			data-feature-grid
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{items.map((item) => (
				<div
					key={item.label}
					data-cell
					style={{
						background: "transparent",
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
						padding: "var(--gap-md)",
					}}
				>
					<span
						data-glyph
						aria-hidden="true"
						className="mono"
						style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
					>
						///
					</span>
					<p
						style={{
							color: "var(--ink)",
							fontSize: "var(--label-size)",
							fontWeight: "var(--label-weight)",
							letterSpacing: "var(--label-tracking)",
						}}
					>
						{item.label}
					</p>
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--body-size)",
							lineHeight: "var(--body-leading)",
						}}
					>
						{item.body}
					</p>
				</div>
			))}
		</div>
	);
}
```

Add to `src/design/families/families.css`:

```css
/*
 * Dividers between the grid's cells, never around them.
 *
 * v2 asks for "thin border dividers between cells". A border on every cell
 * doubles each interior line and adds an outer frame the brief does not
 * describe, so these rules draw a left edge on every cell that is not in the
 * first column and a top edge on every cell that is not in the first row.
 *
 * The `:nth-child` arithmetic assumes three columns and is stated here rather
 * than derived, because the component's own contract is six cells in three
 * columns.
 */
[data-feature-grid] > [data-cell]:not(:nth-child(3n + 1)) {
	border-left: var(--rule-width) solid var(--rule);
}

[data-feature-grid] > [data-cell]:nth-child(n + 4) {
	border-top: var(--rule-width) solid var(--rule);
}

/*
 * Two columns below 900px, one below 600px. An extension: v2 specifies the
 * 3x2 desktop composition and is silent below it. The divider arithmetic
 * above is column-count-specific, so it is restated for each breakpoint
 * rather than left to draw lines in the wrong places.
 */
@media (max-width: 900px) {
	[data-feature-grid] {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	[data-feature-grid] > [data-cell] {
		border-left: 0;
		border-top: 0;
	}

	[data-feature-grid] > [data-cell]:not(:nth-child(2n + 1)) {
		border-left: var(--rule-width) solid var(--rule);
	}

	[data-feature-grid] > [data-cell]:nth-child(n + 3) {
		border-top: var(--rule-width) solid var(--rule);
	}
}

@media (max-width: 600px) {
	[data-feature-grid] {
		grid-template-columns: minmax(0, 1fr);
	}

	[data-feature-grid] > [data-cell] {
		border-left: 0;
	}

	[data-feature-grid] > [data-cell]:not(:first-child) {
		border-top: var(--rule-width) solid var(--rule);
	}
}
```

Add to `src/design/families/index.ts`:

```ts
export { FeatureGrid } from "./FeatureGrid";
```

- [ ] **Step 4: Mount it**

In `src/app/page.tsx`, render the grid below the feature strip with the six items from the test. "Eighteen extensions in and out" must match `supportedFormats().length` — check it and use the real number, or phrase it so it cannot go stale.

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/FeatureGrid.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify the dividers land between cells and not around them**

This is the whole point of the task and it is entirely a cascade question, which happy-dom does not resolve. Build, serve `out/`, and with Playwright on `/`:

1. For each of the six cells, report the computed `border-left-width` and `border-top-width`. Expect: cells 1 and 4 have no left border; cells 1, 2, 3 have no top border; every other edge is `1px`.
2. Confirm **no cell has a right or bottom border** — that would be the doubled-line mistake.
3. Screenshot the grid and confirm there is no outer frame around its perimeter.
4. At 899px and at 599px, re-report the same and confirm the divider pattern matches the new column count rather than leaving lines in the old places.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/page.tsx src/design/__tests__/FeatureGrid.test.tsx
git commit -m "feat(families): add the 3x2 feature grid

Six informational cells, a mint glyph over an ink label over a muted
body. v2's guardrail names this component directly -- never round the
feature-grid cards, 0px radius is structural -- so square corners and a
transparent fill are pinned in both directions.

The dividers go between cells rather than around them. A border on every
cell doubles each interior line and adds an outer frame the brief never
describes, so the rules pick out only cells that have a neighbour, and
the computed border widths of all six cells are checked in a real
browser rather than inferred -- a divider pattern is a cascade result,
which the unit environment does not resolve.

The glyph is the icon-glyph use of mint the palette rations, and it
stays a glyph: mint as a fill is what an action looks like, and this
grid deliberately has none."
```

---

## Task 9: `FormatStrip` — v2's logo strip, adapted

**Files:**
- Create: `src/design/families/FormatStrip.tsx`
- Modify: `src/design/families/index.ts`, `src/app/page.tsx`
- Test: `src/design/__tests__/FormatStrip.test.tsx`

**Interfaces:**
- Consumes: `Marquee` from `src/design/primitives/index.ts`; `supportedFormats()` from `src/core/registry/stats.ts`.
- Produces: `FormatStrip({ formats })`.

v2 has *"a continuously scrolling logo/marquee rail"* driven by its `infinityScroll` keyframe, and a logo strip on black below the fold.

**convrtr has no customer logos, and inventing them would be fabrication.** The honest equivalent of "the companies we work with" for this product is "the formats we speak" — a derived list of every extension the registry accepts or emits. It is the same component anatomy, the same scroll, real content, and it cannot go stale.

**Reuse `Marquee`.** The primitive already exists, already duplicates its track for a seamless loop, already marks the duplicate `aria-hidden` and `inert`, and is already covered by the reduced-motion pause on `[data-marquee]`. Reimplementing the scroll here would duplicate all of that and break the DRY rule the spec states as enforceable.

Its signature is:

```ts
Marquee({ children, ariaLabel }: { children: ReactNode; ariaLabel: string })
```

`ariaLabel` is **required**, and for a good reason recorded in that file: the duplicate track leaves the accessibility tree, so the region is named once rather than twice. Read `src/design/primitives/Marquee.tsx` before writing this — it also explains why `data-marquee` sits on the tracks rather than the container, which is what makes the reduced-motion pause work.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormatStrip } from "@/design/families/FormatStrip";

const FORMATS = ["avif", "flac", "gif", "heic", "jpg", "pdf", "png", "webp"];

describe("FormatStrip", () => {
	it("renders every format", () => {
		const { container } = render(<FormatStrip formats={FORMATS} />);
		// The marquee duplicates its track for a seamless loop, so each
		// format appears twice: once real, once in the aria-hidden copy.
		const text = container.textContent ?? "";
		for (const format of FORMATS) expect(text).toContain(format.toUpperCase());
	});

	it("scrolls through the existing marquee primitive, not its own loop", () => {
		// Reimplementing the scroll would duplicate the primitive's seamless
		// track, its aria-hidden duplicate, and the reduced-motion pause that
		// is keyed on [data-marquee].
		const { container } = render(<FormatStrip formats={FORMATS} />);
		expect(container.querySelector("[data-marquee]")).not.toBeNull();
	});

	it("announces the list once, not twice", () => {
		// The duplicate track exists for the loop, not for the reader.
		const { container } = render(<FormatStrip formats={FORMATS} />);
		const hidden = container.querySelectorAll('[aria-hidden="true"]');
		expect(hidden.length).toBeGreaterThan(0);
	});

	it("renders nothing at all when there are no formats", () => {
		// An empty marquee still animates an empty track, which is a moving
		// blank band. Better to render nothing.
		const { container } = render(<FormatStrip formats={[]} />);
		expect(container.firstElementChild).toBeNull();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/FormatStrip.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/FormatStrip.tsx`, adapting the `Marquee` call to that primitive's real prop shape:

```tsx
import { Marquee } from "@/design/primitives";

type Props = {
	formats: string[];
};

/**
 * v2's scrolling logo rail, adapted to a product that has no customer logos.
 *
 * The honest equivalent of "the companies we work with" here is "the formats
 * we speak": every extension the registry accepts or emits, derived at build
 * time. Same component anatomy, same continuous scroll, real content, and it
 * cannot drift from the product as tools are added. Inventing logos would be
 * fabrication on a page whose entire claim is that it can be checked.
 *
 * The scroll comes from the existing `Marquee` primitive rather than a second
 * implementation. That primitive already duplicates its track for a seamless
 * loop, marks the duplicate `aria-hidden` and `inert` so a keyboard user
 * cannot tab into a copy, and is covered by the reduced-motion pause keyed on
 * `[data-marquee]`. Reimplementing any of that here would duplicate four
 * solved problems and break the DRY rule the spec states as enforceable.
 */
export function FormatStrip({ formats }: Props) {
	if (formats.length === 0) return null;

	return (
		<Marquee ariaLabel="Supported file formats">
			{formats.map((format) => (
				<span
					key={format}
					className="meta"
					style={{
						color: "var(--ink-muted)",
						padding: "0 var(--gap-md)",
						whiteSpace: "nowrap",
					}}
				>
					{format.toUpperCase()}
				</span>
			))}
		</Marquee>
	);
}
```

Add to `src/design/families/index.ts`:

```ts
export { FormatStrip } from "./FormatStrip";
```

- [ ] **Step 4: Mount it**

In `src/app/page.tsx`:

```tsx
import { supportedFormats } from "@/core/registry/stats";
```

```tsx
<FormatStrip formats={supportedFormats()} />
```

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/FormatStrip.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify the scroll runs, loops seamlessly, and stops for reduced motion**

Build, serve `out/`, and with Playwright on `/`:

1. Read the track's `getBoundingClientRect().x` twice, one second apart, and confirm it moved. A marquee whose animation never starts is a static overflowing row.
2. Confirm no horizontal page scrollbar appears: `documentElement.scrollWidth` equals the viewport at 1280 and at 375.
3. Launch a context with `reducedMotion: "reduce"`, load the page, read the x twice a second apart, and confirm it **did not** move — the existing `[data-marquee]` pause must cover this new consumer. If it moved, the pause does not reach here and that is an Important finding.
4. Tab through the page and confirm focus never lands inside the duplicated track.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/page.tsx src/design/__tests__/FormatStrip.test.tsx
git commit -m "feat(families): add the format strip

v2's scrolling logo rail, adapted for a product with no customer logos.
The honest equivalent of the companies we work with is the formats we
speak: every extension the registry accepts or emits, derived at build
time so it cannot drift as tools are added. Inventing logos would be
fabrication on a page whose whole claim is that it can be checked.

The scroll reuses the existing Marquee primitive rather than adding a
second implementation. That primitive already solves the seamless
duplicate track, the aria-hidden and inert copy that keeps a keyboard
user out of it, and the reduced-motion pause keyed on [data-marquee] --
verified here in a real browser with reducedMotion: reduce, since the
pause reaching a new consumer is an assumption worth checking rather
than inheriting.

This also mounts Marquee, which had been built and rendered nowhere."
```

---

## Task 10: `ComplianceRow` — badges and the mint status dot

**Files:**
- Create: `src/design/families/ComplianceRow.tsx`
- Modify: `src/design/families/index.ts`, `src/app/page.tsx`
- Test: `src/design/__tests__/ComplianceRow.test.tsx`

**Interfaces:**
- Produces: `ComplianceRow({ claims, status })` where `claims: string[]` and `status: { label: string; ok: boolean }`.

`DESIGN.v2.md:144` puts a *"compliance badge row (certification labels with small checkmark chips) and a status dot ('all systems operational') in the accent mint"* in the footer band.

**convrtr has no certifications, and printing SOC 2 or ISO badges it does not hold would be a fabricated credential** — the one thing this plan must not do. But the component's *purpose* translates exactly: a row of short, verifiable claims with a check chip. convrtr's claims are stronger than most certifications precisely because they are checkable — `e2e/network-guard.ts` asserts that no file bytes leave the device, and it self-tests by injecting a cross-origin beacon.

So the claims are the product's real guarantees, and the row says how they are verified rather than asserting a seal.

**The status dot is a rationed mint use and a pill** — `9999px`, per the radius set. It must also not encode its state in colour alone: a dot that is mint for good and something else for bad fails for a colour-blind reader, so the state carries a text label too.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComplianceRow } from "@/design/families/ComplianceRow";

const CLAIMS = [
	"No file leaves the device",
	"No account required",
	"No analytics beacon",
];

describe("ComplianceRow", () => {
	it("renders every claim with a check chip", () => {
		const { container } = render(
			<ComplianceRow claims={CLAIMS} status={{ label: "Verified", ok: true }} />,
		);
		for (const claim of CLAIMS) expect(screen.getByText(claim)).toBeDefined();
		expect(container.querySelectorAll("[data-chip]").length).toBe(CLAIMS.length);
	});

	it("makes the status dot a mint pill", () => {
		const { container } = render(
			<ComplianceRow claims={CLAIMS} status={{ label: "Verified", ok: true }} />,
		);
		const dot = container.querySelector("[data-status-dot]") as HTMLElement;
		expect(dot.style.background).toBe("var(--accent)");
		expect(dot.style.borderRadius).toBe("var(--radius-pill)");
	});

	it("states the status in words, not only in the dot's colour", () => {
		// A dot that carries its meaning in hue alone says nothing to a
		// colour-blind reader, and nothing at all in greyscale or in print.
		render(
			<ComplianceRow claims={CLAIMS} status={{ label: "Verified", ok: true }} />,
		);
		expect(screen.getByText("Verified")).toBeDefined();
	});

	it("drops the mint when the status is not ok", () => {
		// Mint means intact. A failing status must not wear it.
		const { container } = render(
			<ComplianceRow claims={CLAIMS} status={{ label: "Degraded", ok: false }} />,
		);
		const dot = container.querySelector("[data-status-dot]") as HTMLElement;
		expect(dot.style.background).toBe("var(--ink-muted)");
	});

	it("hides the chips from assistive technology", () => {
		// The claim text is the content; the chip is decoration beside it.
		const { container } = render(
			<ComplianceRow claims={CLAIMS} status={{ label: "Verified", ok: true }} />,
		);
		for (const chip of container.querySelectorAll("[data-chip]")) {
			expect(chip.getAttribute("aria-hidden")).toBe("true");
		}
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/ComplianceRow.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/design/families/ComplianceRow.tsx`:

```tsx
type Props = {
	claims: string[];
	status: { label: string; ok: boolean };
};

/**
 * v2's compliance badge row and mint status dot, adapted to a product that
 * holds no certifications.
 *
 * Printing a SOC 2 or ISO badge this product does not have would be a
 * fabricated credential, which is the one thing a page about verifiability
 * must not do. The component's purpose translates cleanly though: a row of
 * short claims with a check chip. convrtr's claims are stronger than most
 * seals precisely because they are checkable -- `e2e/network-guard.ts`
 * asserts no file bytes leave the device, and self-tests by injecting a
 * cross-origin beacon to prove the guard fires.
 *
 * The status dot is a rationed mint use and a pill, per the radius set. It
 * does not encode its state in colour alone: a hue-only signal says nothing
 * to a colour-blind reader and nothing at all in greyscale or print, so the
 * label carries the state and the dot reinforces it. When the status is not
 * ok the mint is dropped entirely -- mint means intact in this system, and a
 * failing status wearing it would be the same lie the fidelity ring was fixed
 * to stop telling.
 */
export function ComplianceRow({ claims, status }: Props) {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				gap: "var(--gap-md)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{claims.map((claim) => (
				<span
					key={claim}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "var(--space-base)",
					}}
				>
					<span
						data-chip
						aria-hidden="true"
						className="mono"
						style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
					>
						✓
					</span>
					<span
						className="meta"
						style={{ color: "var(--ink-muted)" }}
					>
						{claim}
					</span>
				</span>
			))}

			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "var(--space-base)",
					marginLeft: "auto",
				}}
			>
				<span
					data-status-dot
					aria-hidden="true"
					style={{
						width: "var(--space-base)",
						height: "var(--space-base)",
						borderRadius: "var(--radius-pill)",
						background: status.ok ? "var(--accent)" : "var(--ink-muted)",
					}}
				/>
				<span className="meta" style={{ color: "var(--ink-muted)" }}>
					{status.label}
				</span>
			</span>
		</div>
	);
}
```

Add to `src/design/families/index.ts`:

```ts
export { ComplianceRow } from "./ComplianceRow";
```

- [ ] **Step 4: Mount it**

In `src/app/page.tsx`, render the row at the foot of the page content with the three claims from the test and `status={{ label: "Verified in CI", ok: true }}`. That label is true: the e2e network guard runs in `pnpm run ci`.

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/ComplianceRow.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify the dot is round and the row survives greyscale**

Build, serve `out/`, and with Playwright on `/`:

1. Report the dot's computed `border-radius`, `width` and `height`, and confirm it renders as a circle rather than a square — sample its corner pixels against its centre.
2. Compute the contrast of the mint chip and the muted claim text against the page ground, and report both.
3. Screenshot the row with a CSS `filter: grayscale(1)` applied to the page, and confirm the status is still readable — it should be, because the label carries it. Say so explicitly.

- [ ] **Step 7: Commit**

```bash
git add src/design/families src/app/page.tsx src/design/__tests__/ComplianceRow.test.tsx
git commit -m "feat(families): add the compliance row and status dot

v2's certification badge row, adapted for a product that holds no
certifications. Printing a seal this product does not have would be a
fabricated credential, which is the one thing a page about
verifiability must not do -- so the row carries the guarantees that are
actually checkable. The network guard in the e2e suite asserts no file
bytes leave the device and self-tests by injecting a cross-origin
beacon, which is a stronger claim than most badges.

The status dot is a rationed mint use and a pill. It never carries its
state in hue alone: a colour-only signal says nothing to a colour-blind
reader and nothing in greyscale or print, so the label states the status
and the dot reinforces it. A failing status drops the mint entirely --
mint means intact here, and letting a degraded state wear it would be
the same lie the fidelity ring was fixed to stop telling."
```

---

## Task 11: `BranchDiagram` — the branching graphic

**Files:**
- Create: `src/design/families/BranchDiagram.tsx`
- Modify: `src/core/registry/stats.ts`, `src/design/families/index.ts`, `src/app/page.tsx`
- Test: `src/core/registry/__tests__/stats.test.ts`, `src/design/__tests__/BranchDiagram.test.tsx`

**Interfaces:**
- Consumes: `TOOLS` from `src/core/registry`.
- Produces: `conversionBranches(from: string): string[]` in `src/core/registry/stats.ts`; `branchPath(index, count, width, height): string` and `BranchDiagram({ from, to })` in the family.

v2 asks for *"branching diagram lines"* as a data-viz treatment and *"a fine branching-line network graphic for the footer band"*. This is the last of §5's families.

**The honest content is the conversion graph.** For any input extension, the registry knows every output reachable from it — `heic` branches to `jpg`, `png` and `webp`. That is literally a branching diagram of real data, and it tells a visitor something useful rather than decorating the page with a network graphic that means nothing.

**The geometry must be computed by a function a test can check.** SVG path rendering is the single thing happy-dom is worst at: it parses a `d` attribute and draws nothing, so a test asserting the path "exists" or is non-empty asserts nothing at all. The previous plan shipped exactly that mistake. So the coordinates come from an exported pure function, and the test checks the arithmetic.

- [ ] **Step 1: Write the failing test for the derivation**

Append to `src/core/registry/__tests__/stats.test.ts`:

```ts
import { conversionBranches } from "@/core/registry/stats";

describe("conversionBranches", () => {
	it("finds every output reachable from an input extension", () => {
		const outputs = conversionBranches("heic");
		expect(outputs).toContain("jpg");
		expect(outputs).toContain("png");
		expect(outputs).toContain("webp");
	});

	it("never lists an input as its own output", () => {
		// A self-edge is not a conversion, and drawing one would claim a
		// tool that does not exist.
		expect(conversionBranches("png")).not.toContain("png");
	});

	it("deduplicates and sorts, so the diagram is stable between builds", () => {
		const outputs = conversionBranches("jpg");
		expect(new Set(outputs).size).toBe(outputs.length);
		expect([...outputs].sort()).toEqual(outputs);
	});

	it("returns an empty list for an extension nothing accepts", () => {
		expect(conversionBranches("nosuchformat")).toEqual([]);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/core/registry/__tests__/stats.test.ts`
Expected: FAIL — `conversionBranches` is not exported.

- [ ] **Step 3: Write the derivation**

Append to `src/core/registry/stats.ts`:

```ts
/**
 * Every output extension reachable from a given input, across the whole
 * registry.
 *
 * The branching diagram's content, derived rather than drawn: `heic` really
 * does branch to jpg, png and webp, because three tools accept it. A network
 * graphic of invented nodes would decorate the page and say nothing.
 *
 * A self-edge is excluded. `png` accepting png and emitting png happens for
 * resize and metadata tools, but drawing png -> png as a *conversion* would
 * claim something the diagram does not mean.
 */
export function conversionBranches(from: string): string[] {
	const needle = from.toLowerCase();
	const outputs = new Set<string>();

	for (const tool of TOOLS) {
		if (!tool.accept.ext.some((ext) => ext.toLowerCase() === needle)) continue;
		const out = tool.output.ext.toLowerCase();
		if (out !== needle) outputs.add(out);
	}

	return [...outputs].sort();
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm exec vitest run src/core/registry/__tests__/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the geometry**

Create `src/design/__tests__/BranchDiagram.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BranchDiagram, branchPath } from "@/design/families/BranchDiagram";

describe("branchPath", () => {
	// The arithmetic is checked here rather than the rendered shape, because
	// happy-dom parses a `d` attribute and draws nothing. A test asserting
	// the path is non-empty would pass for every wrong path there is.
	it("puts a single branch on the centre line", () => {
		// One branch, height 100: it should end at y = 50, dead centre.
		expect(branchPath(0, 1, 200, 100)).toBe("M 0 50 H 100 V 50 H 200");
	});

	it("spaces branches evenly, each in the middle of its own band", () => {
		// Two branches, height 100: bands are 0-50 and 50-100, so the
		// midpoints are 25 and 75.
		expect(branchPath(0, 2, 200, 100)).toBe("M 0 50 H 100 V 25 H 200");
		expect(branchPath(1, 2, 200, 100)).toBe("M 0 50 H 100 V 75 H 200");
	});

	it("elbows at the horizontal midpoint", () => {
		// The trunk runs to width/2 before turning, so every branch shares
		// the same vertical spine.
		expect(branchPath(0, 4, 400, 200)).toContain("H 200 V");
	});

	it("keeps every endpoint inside the box", () => {
		for (let i = 0; i < 6; i++) {
			const d = branchPath(i, 6, 300, 120);
			const y = Number(d.split("V ")[1]?.split(" ")[0]);
			expect(y).toBeGreaterThan(0);
			expect(y).toBeLessThan(120);
		}
	});
});

describe("BranchDiagram", () => {
	it("draws one path per output", () => {
		const { container } = render(
			<BranchDiagram from="heic" to={["jpg", "png", "webp"]} />,
		);
		expect(container.querySelectorAll("path").length).toBe(3);
	});

	it("labels the input and every output as real text", () => {
		// The lines are geometry; the format names are the content. They must
		// be readable without the SVG rendering at all.
		render(<BranchDiagram from="heic" to={["jpg", "png"]} />);
		expect(screen.getByText("HEIC")).toBeDefined();
		expect(screen.getByText("JPG")).toBeDefined();
		expect(screen.getByText("PNG")).toBeDefined();
	});

	it("strokes the lines with a token and fills nothing", () => {
		const { container } = render(<BranchDiagram from="heic" to={["jpg"]} />);
		const path = container.querySelector("path") as SVGPathElement;
		expect(path.getAttribute("stroke")).toBe("var(--rule)");
		expect(path.getAttribute("fill")).toBe("none");
	});

	it("hides the drawing from assistive technology, since the text carries it", () => {
		const { container } = render(<BranchDiagram from="heic" to={["jpg"]} />);
		expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("renders nothing when there is nowhere to branch to", () => {
		const { container } = render(<BranchDiagram from="nosuch" to={[]} />);
		expect(container.firstElementChild).toBeNull();
	});
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/BranchDiagram.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 7: Write the component**

Create `src/design/families/BranchDiagram.tsx`:

```tsx
type Props = {
	/** The input extension, e.g. "heic". */
	from: string;
	/** Every output reachable from it. */
	to: string[];
};

/**
 * The `d` attribute for one branch: a trunk along the vertical centre, an
 * elbow at the horizontal midpoint, then a run out to the right edge at the
 * middle of this branch's own horizontal band.
 *
 * Exported and pure so its arithmetic can be tested directly. That is not
 * incidental: happy-dom parses a `d` attribute and renders nothing, so a test
 * asserting the path exists, or is non-empty, passes for every wrong path
 * there is. Checking the numbers is the only assertion with teeth here.
 */
export function branchPath(
	index: number,
	count: number,
	width: number,
	height: number,
): string {
	const mid = height / 2;
	const elbow = width / 2;
	const band = height / count;
	const y = band * index + band / 2;

	return `M 0 ${mid} H ${elbow} V ${y} H ${width}`;
}

const WIDTH = 240;
const HEIGHT = 120;

/**
 * v2's branching-line graphic, carrying the conversion graph.
 *
 * v2 asks for "branching diagram lines" and "a fine branching-line network
 * graphic". The honest content for this product is the registry's own graph:
 * an input extension really does branch to the outputs reachable from it, so
 * the drawing means something instead of decorating the page.
 *
 * The format names are real text beside the drawing, and the `<svg>` is
 * `aria-hidden`. The lines are geometry; the labels are the content, and a
 * screen reader should get the second without the first.
 */
export function BranchDiagram({ from, to }: Props) {
	if (to.length === 0) return null;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "var(--gap-sm)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			<span className="meta" style={{ color: "var(--ink)" }}>
				{from.toUpperCase()}
			</span>

			<svg
				aria-hidden="true"
				width={WIDTH}
				height={HEIGHT}
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				style={{ flexShrink: 0, overflow: "visible" }}
			>
				{to.map((output, index) => (
					<path
						key={output}
						d={branchPath(index, to.length, WIDTH, HEIGHT)}
						stroke="var(--rule)"
						strokeWidth="1"
						fill="none"
					/>
				))}
			</svg>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-around",
					height: `${HEIGHT}px`,
				}}
			>
				{to.map((output) => (
					<span
						key={output}
						className="meta"
						style={{ color: "var(--ink-muted)" }}
					>
						{output.toUpperCase()}
					</span>
				))}
			</div>
		</div>
	);
}
```

Add to `src/design/families/index.ts`:

```ts
export { BranchDiagram, branchPath } from "./BranchDiagram";
```

- [ ] **Step 8: Mount it**

In `src/app/page.tsx`, render the diagram near the foot of the content, above the compliance row:

```tsx
import { conversionBranches } from "@/core/registry/stats";
```

```tsx
<BranchDiagram from="heic" to={conversionBranches("heic")} />
```

`heic` is a good choice because it is the format people most often need converted and it genuinely branches three ways. Check `conversionBranches("heic")` returns something before you rely on it — if the registry has changed, pick an input that branches and say which.

- [ ] **Step 9: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/BranchDiagram.test.tsx src/core/registry/__tests__/stats.test.ts && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 10: Verify the lines actually render**

The unit tests prove the arithmetic; only a browser proves a stroke was painted. Build, serve `out/`, and with Playwright on `/`:

1. For each `<path>`, call `getTotalLength()` and report it. Each must be greater than the diagram's width, since every path is a trunk plus an elbow plus a run.
2. Sample pixels along the trunk and confirm at least one differs from the page ground — a `stroke` that failed to resolve paints nothing and `getTotalLength()` would still be happy.
3. Confirm each output label's vertical centre is within a few pixels of its path's endpoint `y`, so the labels line up with the lines they belong to rather than merely sitting nearby.

- [ ] **Step 11: Commit**

```bash
git add src/core/registry/stats.ts src/core/registry/__tests__ src/design/families src/app/page.tsx src/design/__tests__/BranchDiagram.test.tsx
git commit -m "feat(families): add the branching diagram, carrying the conversion graph

v2 asks for branching diagram lines and a fine branching-line network
graphic. The honest content here is the registry's own graph: heic
really does branch to jpg, png and webp, because three tools accept it.
A network of invented nodes would decorate the page and mean nothing.

The geometry comes from an exported pure function so its arithmetic can
be tested directly. That is the point rather than a detail: happy-dom
parses a d attribute and draws nothing, so a test asserting the path is
non-empty passes for every wrong path there is -- a mistake the previous
plan shipped once already. The rendering is then checked in a browser
via getTotalLength plus a pixel sample, because a stroke that fails to
resolve paints nothing while the path length stays correct.

Self-edges are excluded: png accepts and emits png for resize and
metadata tools, but drawing png -> png as a conversion would claim
something the diagram does not mean."
```

---

## Task 12: Close the guards, and the exit gate

**Files:**
- Modify: `src/design/__tests__/design-system.test.ts`, `src/design/__tests__/primitives-contract.test.ts`
- Test: the same two files

**Interfaces:**
- Consumes: every family from Tasks 2–11.

The sweeps that keep this design system honest were written when `src/design/` held only `primitives/` and `chrome/`. A whole new directory of components now exists, and several guards enumerate directories by name. **A guard that does not know about `families/` passes vacuously over it** — which is exactly how the previous plan shipped a cursor that flew off-screen.

- [ ] **Step 1: Find every guard that enumerates a directory**

Run:

```bash
grep -rn "design/primitives\|design/chrome\|componentFiles\|collectSourceFiles" src/design/__tests__/
```

For each hit, decide whether it walks `src` as a whole — in which case `families/` is already covered — or names directories explicitly, in which case it is not. Write the list into your report with a verdict per guard, because "I checked the guards" without that list is not a check.

- [ ] **Step 2: Prove the gap before closing it**

Pick the barrel guard in `primitives-contract.test.ts`. Add a throwaway component file `src/design/families/Unexported.tsx` that the barrel does **not** export, and run:

```bash
pnpm exec vitest run src/design/__tests__/primitives-contract.test.ts
```

Expected: **PASS** — which is the bug. The guard walks `primitives/` and `chrome/` and cannot see the new directory. Report the output, then delete the throwaway file.

- [ ] **Step 3: Extend the barrel and client-component guards to `families/`**

In `src/design/__tests__/primitives-contract.test.ts`, add a `families` barrel check mirroring the existing chrome one, and extend the `"use client"` allowlist sweep to walk `src/design/families` as well. Every family in this plan is a server component — none holds state — so the allowlist gains no entries, and the sweep must fail if one acquires the directive without being added.

```ts
	it.each(componentFiles("src/design/families"))(
		"exports %s from families",
		(component) => {
			// The families barrel is the only import path templates use. A
			// family that exists but is not exported is invisible to them, and
			// nothing else in the suite would notice.
			expect(familiesBarrel).toContain(`from "./${component}"`);
		},
	);
```

Read the existing file and follow its shape exactly — it reads its barrel once at describe scope and walks the directory rather than holding a hand-written list.

- [ ] **Step 4: Re-run the mutation to prove the guard now bites**

Re-add `src/design/families/Unexported.tsx`, run the same command, and confirm it now **FAILS**. Delete the throwaway file and confirm green. Report both outputs.

- [ ] **Step 5: Confirm the spacing and palette sweeps already cover the new directory**

Both walk `src` wholesale via `collectSourceFiles`, so they should. Prove it rather than assuming:

- Add `padding: "17px"` to any family component, run `pnpm exec vitest run src/design/__tests__/design-system.test.ts`, confirm FAIL, revert.
- Add a literal `#ff0000` to any family component, run `pnpm exec vitest run src/design/__tests__/tokens.test.ts`, confirm FAIL, revert.

Report both. If either passes, the sweep does not reach `families/` and closing that is part of this task.

- [ ] **Step 6: Check the token consumption the review flagged**

The migration left eleven declared-but-unconsumed tokens. This plan should have consumed most of them. Run:

```bash
for t in --accent-hover --body-size --dur-hover --gap-lg --grid-gap --headline-size --headline-tracking --max-width --section-pad --space-base --surface; do
  n=$(grep -rlF "var($t)" src --include='*.tsx' --include='*.css' 2>/dev/null | grep -v __tests__ | wc -l | tr -d ' ')
  echo "$t: $n consumer file(s)"
done
```

Report the table. Any token still at zero is either genuinely for a later plan — say which — or a sign this plan left a component using a literal where a token exists. `--section-pad` and `--grid-gap` are the likeliest genuine deferrals, since they belong to the full-bleed band rhythm Plan 3 builds.

- [ ] **Step 7: Run the exit gate**

Run: `pnpm run ci`
Expected: PASS — typecheck, lint, unit tests, static build, Playwright.

Known flake: `src/core/io/__tests__/zip.test.ts` has timed out under parallel load and passed alone. If and only if that test fails, re-run it in isolation before concluding anything. Any other failure means a change is wrong, not the test.

- [ ] **Step 8: Walk the finished page**

Build, serve `out/`, and with Playwright on `/`, in one pass:

1. **Every text node's contrast** against its composited background. Report anything below 4.5:1. The terminal panel is on `--surface`, so its pairs differ from the rest of the page — do not assume one ground.
2. **Every tab stop's focus ring** contrast against what is behind it, including the pills inside the hero and the links in the mounted chrome. The white primary pill is the case to watch.
3. `documentElement.scrollWidth` at 375, 900 and 1280 — each must equal the viewport.
4. A **reduced-motion** pass: confirm the format strip is stationary and nothing else animates.
5. Screenshot the whole page at 1280 and 375 and save both paths in your report.

- [ ] **Step 9: Commit**

```bash
git add src/design/__tests__
git commit -m "feat(design): extend the design guards to the families directory

The sweeps were written when src/design held primitives and chrome, and
several enumerate directories by name -- so a whole new directory of
components sat outside them, passing vacuously. That is the shape of
failure the previous plan shipped a flying cursor through.

The gap was proved before it was closed: an unexported family component
passed the barrel guard, and fails it now. The spacing and palette
sweeps walk src wholesale and were confirmed to reach the new directory
by mutation rather than by inspection."
```

---

## Definition of done

- [ ] `pnpm run ci` passes end to end.
- [ ] `SiteHeader` and `SiteFooter` render on every route, and their focus rings and wordmark tracking are verified on a real page rather than on injected markup.
- [ ] All ten families exist under `src/design/families/`, are exported from its barrel, and each renders on `/`.
- [ ] `Marquee` is mounted (via `FormatStrip`), bringing the count of built-but-unmounted primitives down.
- [ ] The bar chart and the format strip derive their content from `src/core/registry`, so neither can drift from the product.
- [ ] No fabricated credential, logo, or metric appears anywhere on the page.
- [ ] The mint pill fill and the mint stroke tint both exist in the codebase, so the shape distinction the fidelity ring depends on is demonstrated rather than asserted.
- [ ] The barrel guard and the `"use client"` sweep cover `src/design/families/`, proved by mutation.
- [ ] The spacing and palette sweeps reach `families/`, proved by mutation.
- [ ] Every text pair on `/` clears 4.5:1, including inside the terminal panel on `--surface`.
- [ ] Every tab stop on `/` has a visible focus ring, including the white hero pill.
- [ ] `documentElement.scrollWidth` equals the viewport at 375, 900 and 1280.
- [ ] Under `prefers-reduced-motion`, the format strip is stationary.
- [ ] The reduced-motion block in `globals.css` is untouched.
