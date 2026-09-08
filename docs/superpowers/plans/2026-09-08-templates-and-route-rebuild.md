# Templates and the Route Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract four page templates from the compositions that already exist, rebuild all six live routes on top of them, and make the rule that keeps them honest enforceable.

**Architecture:** The nine families built in the previous plan are composed directly into routes today; this plan lifts the recurring shapes into `src/design/templates/` and reduces every `page.tsx` to data resolution plus one template call. The constraint that makes it stick is a test: a route file may not contain layout, must import from `@/design/templates`, and must stay at or under 50 lines. Templates are extracted from one real composition each rather than designed speculatively.

**Tech Stack:** Next.js 16.3 (App Router, `output: "export"`), React 19.2, Tailwind CSS v4, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 + happy-dom + Testing Library, Biome 2.5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-04-convrtr-editorial-overhaul-design.md`](../specs/2026-09-04-convrtr-editorial-overhaul-design.md) §6.2 (template shapes) and §6.3 (the DRY rule, stated as an enforceable constraint) — both of which stand. Its visual vocabulary is superseded by [`2026-09-07-void-terminal-glass-design.md`](../specs/2026-09-07-void-terminal-glass-design.md), which governs.

**Plan 3 of 4** in the consolidated sequence. One plan remains after this: the new routes — groups, collectives, samples and live demos, marketing, legal and the sitemap — plus the two templates they need.

**Working directly on `main`** at the user's standing instruction — no worktree.

## Why only four templates

§6.2 lists six. `ShowcasePage` and `LegalPage` have **no consumer until the next plan**, and a template extracted from zero real compositions acquires parameters nobody needs. They are built in the plan that builds their routes, which is what §6.2's own note anticipates: *"A shape no template covers means the template gains a prop, or a new template is added."*

## Global Constraints

- **A `page.tsx` may not contain layout.** It resolves data from a registry and hands it to a template. Enforced by `src/app/__tests__/route-purity.test.ts`: every `src/app/**/page.tsx` imports from `@/design/templates` and is **at or under 50 lines**.
- **The palette is closed.** Only these values may appear in `src/design/tokens.css`: `#000000`, `#111315`, `#E4F1EB`, `#FFFFFF`, `#94979E`, `#131415`, `#303236`, `#18191B`, `#34D59A`, `#47D18C`. No literal hex elsewhere in `src` except the paths in `LITERAL_HEX_ALLOWED`.
- **Mint is rationed** — CTA fills, icon glyphs, code tokens, the lossless fidelity tint. Never a large fill, never a section background.
- **Mint means two things and shape keeps them apart:** a CTA is a mint pill **fill**; the lossless ring is a mint stroke **tint**.
- **Radius is a closed set:** `0` structural, `4px` nav-utility controls only, `9999px` pills and status dots, `40px`/`100px` marquee cards only.
- **Spacing comes from the scale.** `--space-base` 8px, `--gap-sm` 12px, `--gap-md` 24px, `--gap-lg` 80px, `--section-pad` 240px, `--max-width` 1600px, `--navbar-height` 64px. The sweeps admit literal px only from `{0, 1, 14, 23, 36, 44}`, and now also police template literals and Tailwind arbitrary values.
- **Display and headline are weight 400.**
- **`data-testid` values are frozen.** The Playwright suite drives them.
- **The reduced-motion block in `src/app/globals.css` must not be touched.**
- **Zero third-party requests.** `e2e/network-guard.ts` enforces it.
- **Formatting:** Biome — tabs, double quotes.

---

## File Structure

**Created — `src/design/templates/`**

| File | Responsibility |
|---|---|
| `EditorialPage.tsx` | The home shape: hero band, then a sequence of content bands. |
| `HubPage.tsx` | Eyebrow, headline, lede, optional mono count, then a listing slot. |
| `ArticlePage.tsx` | Prose measure, mono dateline, body slot, related-reading slot. |
| `ConverterPage.tsx` | The instrument, framed — eyebrow, headline, lede, the tool itself. |
| `index.ts` | Barrel. The only import surface routes may use. |
| `templates.css` | Rules a style object cannot express (prose measure, band rhythm). |

**Created — guard**

`src/app/__tests__/route-purity.test.ts` — the DRY rule from spec §6.3.

**Modified — every live route**

`src/app/page.tsx` · `src/app/tools/page.tsx` · `src/app/[category]/page.tsx` · `src/app/[category]/[slug]/page.tsx` · `src/app/blog/page.tsx` · `src/app/blog/[slug]/page.tsx`

**Modified — guards**

`src/design/__tests__/primitives-contract.test.ts` — barrel and client-component coverage extended to `templates/`.

---

## Task 1: `EditorialPage`, and the home page rebuilt

**Files:**
- Create: `src/design/templates/EditorialPage.tsx`, `src/design/templates/index.ts`, `src/design/templates/templates.css`
- Modify: `src/app/page.tsx`, `src/app/globals.css` (import the stylesheet)
- Test: `src/design/__tests__/EditorialPage.test.tsx`

**Interfaces:**
- Consumes: every family from `@/design/families`.
- Produces: `EditorialPage({ hero, bands })` where `hero: ReactNode` and `bands: { key: string; node: ReactNode }[]`.

`src/app/page.tsx` is currently ~270 lines of composition. This task lifts its shape into a template and reduces the route to data plus one call.

**Two editorial defects were deferred to this task** by the previous plan's whole-branch review, and they are yours:

1. **The same four or five claims are stated across four consecutive bands** — `FeatureStrip` (Local/Fast/Private/Offline/Honest), `FeatureGrid` (No upload/No account/No telemetry/Stated fidelity/Open formats/Offline), a legacy tagline (`LOCAL ONLY · 0 BYTES UPLOADED · WORKS OFFLINE`), and `ComplianceRow` (No file leaves the device/No account required/No analytics beacon). A reader meets the same idea four times before reaching anything new.
2. **The 53-link tool grid sits unframed** between `FormatStrip` and `BranchDiagram`, with no eyebrow and no heading, breaking the composition every other band follows.

Resolve both while rebuilding. The band sequence is yours to choose, but each band must earn its place: **delete the legacy tagline** (it is pre-plan scaffolding duplicating `ComplianceRow`), and give the tool grid the same eyebrow-and-headline framing the other bands have. Where `FeatureStrip` and `FeatureGrid` overlap, differentiate them by *angle* rather than deleting one — the strip is what the product is like to use, the grid is what it does not do. Say what you chose and why.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorialPage } from "@/design/templates/EditorialPage";

const HERO = <div data-testid="hero">hero</div>;
const BANDS = [
	{ key: "a", node: <section data-testid="band-a">a</section> },
	{ key: "b", node: <section data-testid="band-b">b</section> },
];

describe("EditorialPage", () => {
	it("renders the hero first, then every band in order", () => {
		const { container } = render(<EditorialPage hero={HERO} bands={BANDS} />);
		const seen = [...container.querySelectorAll("[data-testid]")].map((el) =>
			el.getAttribute("data-testid"),
		);
		expect(seen).toEqual(["hero", "band-a", "band-b"]);
	});

	it("spaces bands from the scale, never from a literal", () => {
		// The previous plan shipped a stub wrapper whose gap-4 clamped every
		// band to 16px apart and whose max-w-4xl made every family's own
		// --max-width permanently dead. The template owns this now.
		const { container } = render(<EditorialPage hero={HERO} bands={BANDS} />);
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell.style.getPropertyValue("gap")).toBe("var(--section-pad)");
	});

	it("imposes no max-width of its own", () => {
		// Each family carries its own var(--max-width). A competing clamp on
		// the shell is what made those dead last time.
		const { container } = render(<EditorialPage hero={HERO} bands={BANDS} />);
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell.style.maxWidth).toBe("");
	});

	it("renders nothing for an empty band list rather than an empty shell", () => {
		const { container } = render(<EditorialPage hero={HERO} bands={[]} />);
		expect(container.querySelectorAll("section").length).toBe(0);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/EditorialPage.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the template**

Create `src/design/templates/EditorialPage.tsx`:

```tsx
import type { ReactNode } from "react";

type Band = {
	/** Stable identity for the band, used as its React key. */
	key: string;
	node: ReactNode;
};

type Props = {
	hero: ReactNode;
	bands: Band[];
};

/**
 * The home shape: a hero band, then a sequence of content bands separated by
 * v2's section rhythm.
 *
 * The shell deliberately imposes **no** max-width. Each family carries its own
 * `var(--max-width)`, and the previous plan shipped a stub wrapper whose
 * `max-w-4xl` clamped the page to 896px — which made every one of those
 * declarations permanently dead, at any viewport, and left the bands 16px
 * apart instead of v2's 240px. Two tests pin both halves of that lesson.
 *
 * The narrow-viewport rhythm lives in `templates.css`: 240px between every band
 * is right at desktop and absurd at 375px, and a media query cannot be written
 * in a style object.
 */
export function EditorialPage({ hero, bands }: Props) {
	return (
		<div
			data-editorial
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--section-pad)",
			}}
		>
			{hero}
			{bands.map((band) => (
				<div key={band.key}>{band.node}</div>
			))}
		</div>
	);
}
```

Create `src/design/templates/index.ts`:

```ts
/**
 * The only import surface a route may use.
 *
 * `route-purity.test.ts` requires every `src/app/**\/page.tsx` to import from
 * here, so this barrel is what makes the DRY rule checkable rather than
 * aspirational.
 */

export { EditorialPage } from "./EditorialPage";
```

Create `src/design/templates/templates.css`.

**Move the existing rhythm rules rather than writing new ones.** The previous plan's fix wave already solved this, on `[data-home-shell]` in `src/design/families/families.css` (around `:97-108`). Its mechanism is the right one and matches the cascade technique established earlier in that plan: it **redefines `--section-pad` itself** at each breakpoint, and the shell simply declares `gap: var(--section-pad)`. Do not invent a second mechanism that overrides `gap` directly.

`[data-home-shell]` ceases to exist when `page.tsx` is rebuilt on this template, so those rules would become dead. Move them to `templates.css`, repointed at `[data-editorial]`, and **delete them from `families.css`** — carrying the comment across, since it records why the redefinition is done this way:

```css
/*
 * Rules the templates need that a React style object cannot express: media
 * queries and prose measures. Anything expressible inline belongs inline,
 * next to the template that owns it.
 *
 * The band rhythm scales down below the desktop tier by redefining
 * `--section-pad` on the shell rather than overriding `gap`, so the template's
 * own `gap: var(--section-pad)` keeps reading through the ordinary cascade.
 * That is the same technique `FeatureStrip` and `FeatureGrid` use for their
 * column counts, and it is why no `!important` is needed anywhere here.
 *
 * v2 states 240px section padding (DESIGN.v2.md:134) and is silent on narrow
 * viewports; 240px between every band at 375px is most of a screen of nothing.
 * Recorded as an extension, not a restatement.
 */
@media (max-width: 900px) {
	[data-editorial] {
		--section-pad: 96px;
	}
}

@media (max-width: 600px) {
	[data-editorial] {
		--section-pad: 64px;
	}
}
```

**The shell must not set `--section-pad` inline.** It declares `gap: var(--section-pad)` and inherits the default from `:root`. An inline value would outrank these media queries for that same property on that same element and defeat them silently — the previous plan proved this by isolated reproduction, twice.

Import `templates.css` from `src/app/globals.css` next to the families stylesheet — read how that one is imported and follow it exactly.

Note the `96px` and `64px` here are declaration values in a stylesheet, not TSX spacing literals, so they sit outside the spacing sweep's remit; they are already in the tree in exactly this form.

- [ ] **Step 4: Rebuild the route**

Rewrite `src/app/page.tsx` so it resolves data and calls `EditorialPage` once. It must end at **50 lines or fewer** — that is the rule Task 5 makes enforceable, and writing to it now avoids a second pass. Move the band content into the template call as `bands`, delete the legacy tagline, and frame the tool grid.

If the composition needs a shape the families do not cover — an eyebrow-and-headline wrapper around an arbitrary child, say — **add it as a family or a template prop, never as inline JSX in the route.**

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/EditorialPage.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Verify the page still composes**

Rebuild (`pnpm build`) before measuring — Playwright serves the built `out/` directory, not source. Serve `out/` and on `/` report:

1. `main`'s computed width at 375, 1280 and 1920, and whether any family still reaches exactly `1600px` at 1920. The previous plan fixed this; confirm the template did not undo it.
2. The gap between two adjacent bands at 1920, 1280, 900 and 375.
3. `document.documentElement.scrollWidth` equals the viewport at all four widths.
4. `wc -l src/app/page.tsx`.
5. A screenshot at 1280, and one sentence on whether the repetition and the unframed grid are actually resolved.

- [ ] **Step 7: Commit**

```bash
git add src/design/templates src/app/page.tsx src/app/globals.css src/design/__tests__/EditorialPage.test.tsx
git commit -m "feat(templates): extract EditorialPage and rebuild the home page on it

The route drops from ~270 lines of composition to data plus one template
call. The shape it had was already the shape every editorial page wants,
so the template is extracted from a real composition rather than designed
against a guess.

The shell imposes no max-width of its own, and a test pins that. The
previous plan shipped a stub wrapper whose max-w-4xl clamped the page to
896px and made every family's own --max-width permanently dead at every
viewport; the same wrapper's gap-4 put 16px between bands where v2 asks
for 240px. Both halves of that lesson are now assertions.

Two editorial defects deferred from that plan's whole-branch review are
resolved here: the legacy tagline is deleted rather than restating what
ComplianceRow already says, and the tool grid gains the eyebrow-and-
headline framing every other band on the page has."
```

---

## Task 2: `HubPage`, and three routes rebuilt on it

**Files:**
- Create: `src/design/templates/HubPage.tsx`
- Modify: `src/design/templates/index.ts`, `src/app/tools/page.tsx`, `src/app/[category]/page.tsx`, `src/app/blog/page.tsx`
- Test: `src/design/__tests__/HubPage.test.tsx`

**Interfaces:**
- Produces: `HubPage({ eyebrow, title, lede, count, children })` where `count?: { value: number; noun: string }`.

Three routes share one shape today: an `h1`, a muted lede, and a listing. `/tools` renders `ToolSearch`, `/[category]` a filtered list, `/blog` a post list. **Read all three before writing the template** — the props must cover what each actually needs, not what this plan guesses.

The mono count is v2's data-readout voice applied to a hub: "53 conversions", "12 posts". It is optional because not every hub has a meaningful total.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HubPage } from "@/design/templates/HubPage";

describe("HubPage", () => {
	it("renders eyebrow, headline, lede and children in order", () => {
		render(
			<HubPage
				eyebrow="Everything"
				title="All tools"
				lede="Every conversion, in your browser."
			>
				<ul data-testid="listing" />
			</HubPage>,
		);
		expect(screen.getByText("Everything")).toBeDefined();
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"All tools",
		);
		expect(screen.getByText("Every conversion, in your browser.")).toBeDefined();
		expect(screen.getByTestId("listing")).toBeDefined();
	});

	it("renders the count in the mono voice when given one", () => {
		const { container } = render(
			<HubPage title="All tools" lede="x" count={{ value: 53, noun: "conversions" }}>
				<div />
			</HubPage>,
		);
		const count = container.querySelector("[data-count]") as HTMLElement;
		expect(count.textContent).toBe("53 conversions");
		expect(count.className).toContain("mono");
	});

	it("omits the count entirely when not given one", () => {
		const { container } = render(
			<HubPage title="Blog" lede="x">
				<div />
			</HubPage>,
		);
		expect(container.querySelector("[data-count]")).toBeNull();
	});

	it("uses the headline scale rather than a literal size", () => {
		const { container } = render(
			<HubPage title="All tools" lede="x">
				<div />
			</HubPage>,
		);
		const h1 = container.querySelector("h1") as HTMLElement;
		expect(h1.style.fontSize).toBe("var(--headline-size)");
		expect(h1.style.fontWeight).toBe("400");
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/HubPage.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the template**

Create `src/design/templates/HubPage.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
	/** Small mono label above the headline. Optional — not every hub needs one. */
	eyebrow?: string;
	title: string;
	lede: string;
	/** v2's data-readout voice applied to a hub: "53 conversions". */
	count?: { value: number; noun: string };
	children: ReactNode;
};

/**
 * The hub shape, shared by the tools index, each category, and the blog: an
 * eyebrow, a headline at the headline scale, a muted lede, an optional mono
 * count, then whatever listing the route resolves.
 *
 * The count is optional rather than derived, because not every hub has a total
 * worth stating — and a hub that invents one would be stating a number for the
 * sake of the shape.
 */
export function HubPage({ eyebrow, title, lede, count, children }: Props) {
	return (
		<div
			data-hub
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			{eyebrow ? (
				<p className="meta" style={{ color: "var(--ink-muted)" }}>
					{eyebrow}
				</p>
			) : null}

			<h1
				style={{
					fontSize: "var(--headline-size)",
					fontWeight: 400,
					letterSpacing: "var(--headline-tracking)",
					lineHeight: "var(--display-leading)",
					color: "var(--ink)",
				}}
			>
				{title}
			</h1>

			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: "var(--body-leading)",
				}}
			>
				{lede}
			</p>

			{count ? (
				<p data-count className="mono" style={{ color: "var(--ink-muted)" }}>
					{`${count.value} ${count.noun}`}
				</p>
			) : null}

			{children}
		</div>
	);
}
```

Add to `src/design/templates/index.ts`:

```ts
export { HubPage } from "./HubPage";
```

- [ ] **Step 4: Rebuild all three routes**

This is one batch of the same edit. For each of `src/app/tools/page.tsx`, `src/app/[category]/page.tsx` and `src/app/blog/page.tsx`: keep `generateMetadata` and the data resolution exactly as they are, and replace the returned JSX with a single `HubPage` call wrapping the listing. Each must end at **50 lines or fewer**.

`/[category]` is the one to read most carefully — it resolves a dynamic param and may have `generateStaticParams`. Leave that machinery alone; only the JSX changes.

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/HubPage.test.tsx && pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS. The build matters — three routes changed and one is dynamic.

- [ ] **Step 6: Verify all three routes render**

Rebuild first, then serve `out/` and for each of `/tools`, `/blog` and one category (`/image`):

1. The `h1`'s computed `font-size` and `font-weight`.
2. The lede's contrast against the page ground, computed arithmetically, with the ground named.
3. `document.documentElement.scrollWidth` equals the viewport at 375 and 1280.
4. The listing still renders — count the rows or links on each and compare against what the registry yields.
5. `wc -l` on all three route files.

- [ ] **Step 7: Commit**

```bash
git add src/design/templates src/app/tools/page.tsx "src/app/[category]/page.tsx" src/app/blog/page.tsx src/design/__tests__/HubPage.test.tsx
git commit -m "feat(templates): extract HubPage and rebuild the three hubs on it

The tools index, each category and the blog were the same shape written
three times: a headline, a muted lede, and a listing. One template now
carries it, and each route is data resolution plus one call.

The mono count is optional rather than derived. Not every hub has a total
worth stating, and a hub that invented one would be stating a number for
the sake of the shape."
```

---

## Task 3: `ArticlePage`, and the blog post rebuilt

**Files:**
- Create: `src/design/templates/ArticlePage.tsx`
- Modify: `src/design/templates/index.ts`, `src/design/templates/templates.css`, `src/app/blog/[slug]/page.tsx`
- Test: `src/design/__tests__/ArticlePage.test.tsx`

**Interfaces:**
- Produces: `ArticlePage({ title, dateline, children, related })` where `dateline: string` and `related?: ReactNode`.

`/blog/[slug]` renders MDX with a related-reading block. Read it before writing the template — in particular how the MDX body is passed and what `RelatedReading` expects.

**The prose measure is the point of this template.** Body text at full `--max-width` is unreadable; typographic convention puts a comfortable measure at roughly 60–75 characters. That is a `ch`-based width, which belongs in `templates.css` — and it is the one place in this design system where a width is not `var(--max-width)`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticlePage } from "@/design/templates/ArticlePage";

describe("ArticlePage", () => {
	it("renders the title as the page's h1", () => {
		render(
			<ArticlePage title="Why HEIC" dateline="4 September 2026">
				<p>body</p>
			</ArticlePage>,
		);
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Why HEIC",
		);
	});

	it("renders the dateline in the mono voice", () => {
		const { container } = render(
			<ArticlePage title="x" dateline="4 September 2026">
				<p>body</p>
			</ArticlePage>,
		);
		const dateline = container.querySelector("[data-dateline]") as HTMLElement;
		expect(dateline.textContent).toBe("4 September 2026");
		expect(dateline.className).toContain("mono");
	});

	it("constrains the body to a prose measure, not the page max-width", () => {
		// Body copy at 1600px is unreadable. This is the one width in the
		// system that is not var(--max-width).
		const { container } = render(
			<ArticlePage title="x" dateline="y">
				<p>body</p>
			</ArticlePage>,
		);
		const prose = container.querySelector("[data-prose]") as HTMLElement;
		expect(prose).not.toBeNull();
		expect(prose.style.maxWidth).toBe("");
	});

	it("omits the related slot entirely when not given one", () => {
		const { container } = render(
			<ArticlePage title="x" dateline="y">
				<p>body</p>
			</ArticlePage>,
		);
		expect(container.querySelector("[data-related]")).toBeNull();
	});

	it("renders the related slot when given one", () => {
		render(
			<ArticlePage title="x" dateline="y" related={<nav data-testid="rel" />}>
				<p>body</p>
			</ArticlePage>,
		);
		expect(screen.getByTestId("rel")).toBeDefined();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/ArticlePage.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the template**

Create `src/design/templates/ArticlePage.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
	title: string;
	/** Rendered in the mono voice, already formatted by the route. */
	dateline: string;
	children: ReactNode;
	related?: ReactNode;
};

/**
 * The article shape: a headline, a mono dateline, a body at a prose measure,
 * and an optional related-reading slot.
 *
 * The prose measure is the reason this template exists. Body copy set to the
 * page's 1600px `--max-width` is unreadable — convention puts a comfortable
 * measure around 60–75 characters. That is a `ch` width, which cannot be
 * expressed against the spacing scale, so it lives in `templates.css` and is
 * the one width in this system that is deliberately not `var(--max-width)`.
 *
 * The date is formatted by the route rather than here. A template that parsed
 * dates would need a locale, and the route already knows the post's own.
 */
export function ArticlePage({ title, dateline, children, related }: Props) {
	return (
		<article
			style={{
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			<header
				data-prose
				style={{ display: "flex", flexDirection: "column", gap: "var(--gap-sm)" }}
			>
				<p data-dateline className="mono" style={{ color: "var(--ink-muted)" }}>
					{dateline}
				</p>
				<h1
					style={{
						fontSize: "var(--headline-size)",
						fontWeight: 400,
						letterSpacing: "var(--headline-tracking)",
						lineHeight: "var(--display-leading)",
						color: "var(--ink)",
					}}
				>
					{title}
				</h1>
			</header>

			<div data-prose>{children}</div>

			{related ? <div data-related data-prose>{related}</div> : null}
		</article>
	);
}
```

Append to `src/design/templates/templates.css`:

```css
/*
 * The prose measure. Body copy at the page's 1600px --max-width is
 * unreadable; typographic convention puts a comfortable line at roughly
 * 60–75 characters. `ch` is the honest unit for that, and it is the one
 * width in this system that is deliberately not var(--max-width).
 *
 * Centred rather than left-aligned so the article sits under its own
 * headline at every viewport.
 */
[data-prose] {
	max-width: 68ch;
	margin-inline: auto;
	width: 100%;
}
```

Add to `src/design/templates/index.ts`:

```ts
export { ArticlePage } from "./ArticlePage";
```

- [ ] **Step 4: Rebuild the route**

Rewrite `src/app/blog/[slug]/page.tsx` to resolve the post, format its date, and call `ArticlePage` once with the MDX body as children and `RelatedReading` as `related`. Keep `generateMetadata`, `generateStaticParams` and the `notFound()` handling exactly as they are. **50 lines or fewer.**

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__/ArticlePage.test.tsx && pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS.

- [ ] **Step 6: Verify the measure and the MDX**

Rebuild first, then serve `out/` and on a real post:

1. The rendered **character count per line** of a full body paragraph — measure the element's width and divide by the width of a `0` glyph at the body font, or measure directly. Report the number and say whether it lands in the 60–75 range.
2. `[data-prose]`'s computed `max-width` at 1920 — it must be the `ch` measure, not 1600px.
3. That the MDX body still renders: count the paragraphs, headings and code blocks and compare against the source `.mdx`.
4. The dateline's contrast against the page ground, with the ground named.
5. `wc -l` on the route file.

- [ ] **Step 7: Commit**

```bash
git add src/design/templates "src/app/blog/[slug]/page.tsx" src/design/__tests__/ArticlePage.test.tsx
git commit -m "feat(templates): extract ArticlePage and rebuild the blog post on it

A headline, a mono dateline, a body at a prose measure, and an optional
related-reading slot.

The prose measure is why this template exists rather than being another
HubPage. Body copy at the page's 1600px --max-width is unreadable, and a
comfortable measure is about 60-75 characters -- a ch width, which cannot
be said in terms of the spacing scale. It is the one width in this system
deliberately not var(--max-width), and it is written down as such.

The date is formatted by the route. A template that parsed dates would
need a locale the route already has."
```

---

## Task 4: `ConverterPage`, and the tool route rebuilt

**Files:**
- Create: `src/design/templates/ConverterPage.tsx`
- Modify: `src/design/templates/index.ts`, `src/app/[category]/[slug]/page.tsx`
- Test: `src/design/__tests__/ConverterPage.test.tsx`

**Interfaces:**
- Produces: `ConverterPage({ eyebrow, title, lede, children, related })`.

This is the route that matters most — it is the product. `ToolClient` is ~1100 lines and **this task does not touch it.** The template frames the instrument; it does not rebuild it.

**The `data-testid` values inside `ToolClient` are frozen** — the Playwright suite drives them, and 42 e2e specs depend on them. If a testid changes, e2e breaks and that is the signal, not a nuisance.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConverterPage } from "@/design/templates/ConverterPage";

describe("ConverterPage", () => {
	it("frames the instrument without wrapping it in extra landmarks", () => {
		render(
			<ConverterPage eyebrow="Image" title="HEIC to JPG" lede="Convert locally.">
				<div data-testid="instrument" />
			</ConverterPage>,
		);
		expect(screen.getByTestId("instrument")).toBeDefined();
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"HEIC to JPG",
		);
	});

	it("renders the eyebrow in the mono voice", () => {
		const { container } = render(
			<ConverterPage eyebrow="Image" title="x" lede="y">
				<div />
			</ConverterPage>,
		);
		const eyebrow = container.querySelector("[data-eyebrow]") as HTMLElement;
		expect(eyebrow.textContent).toBe("Image");
		expect(eyebrow.className).toContain("meta");
	});

	it("omits the related slot when not given one", () => {
		const { container } = render(
			<ConverterPage eyebrow="x" title="y" lede="z">
				<div />
			</ConverterPage>,
		);
		expect(container.querySelector("[data-related]")).toBeNull();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/ConverterPage.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the template**

Create `src/design/templates/ConverterPage.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
	/** The tool's category, in the mono label voice. */
	eyebrow: string;
	title: string;
	lede: string;
	/** The instrument itself. */
	children: ReactNode;
	related?: ReactNode;
};

/**
 * The converter shape: the instrument, framed.
 *
 * This template deliberately does very little. `ToolClient` is the product and
 * is around 1100 lines of state machine, worker orchestration and fidelity
 * reporting; framing it means giving it a heading and a category label, not
 * rebuilding it. Every `data-testid` inside it is frozen — 42 Playwright specs
 * drive them — so the template adds no landmark that could change what those
 * selectors resolve against.
 */
export function ConverterPage({
	eyebrow,
	title,
	lede,
	children,
	related,
}: Props) {
	return (
		<div
			data-converter
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			<p data-eyebrow className="meta" style={{ color: "var(--ink-muted)" }}>
				{eyebrow}
			</p>

			<h1
				style={{
					fontSize: "var(--headline-size)",
					fontWeight: 400,
					letterSpacing: "var(--headline-tracking)",
					lineHeight: "var(--display-leading)",
					color: "var(--ink)",
				}}
			>
				{title}
			</h1>

			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: "var(--body-leading)",
				}}
			>
				{lede}
			</p>

			{children}

			{related ? <div data-related>{related}</div> : null}
		</div>
	);
}
```

Add to `src/design/templates/index.ts`:

```ts
export { ConverterPage } from "./ConverterPage";
```

- [ ] **Step 4: Rebuild the route**

Rewrite `src/app/[category]/[slug]/page.tsx` to resolve the tool and call `ConverterPage` once with `ToolClient` as children and `RelatedReading` as `related`. Keep `generateMetadata`, `generateStaticParams`, the JSON-LD and `notFound()` exactly as they are. **50 lines or fewer.**

- [ ] **Step 5: Run everything, including the end-to-end suite**

Run: `pnpm exec vitest run src/design/__tests__/ConverterPage.test.tsx && pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm exec playwright test`

**The Playwright run is not optional here.** It is the only thing that exercises the instrument end to end, and this task changes the element tree above it. Expected: **42 passed**. A failure means a selector now resolves differently — investigate the change, do not adjust the test.

- [ ] **Step 6: Verify the instrument still works**

Rebuild first, then serve `out/` and on a real converter page (`/image/heic-to-jpg`):

1. The drop field renders and its computed `border-radius` is `0px`.
2. `document.documentElement.scrollWidth` equals the viewport at 375 and 1280.
3. Tab through the page and report every stop's focus-ring contrast **against what is actually behind the ring** — at `outline-offset: 2px` that is usually not the element it surrounds.
4. The JSON-LD script is still present in the built HTML.
5. `wc -l` on the route file.

- [ ] **Step 7: Commit**

```bash
git add src/design/templates "src/app/[category]/[slug]/page.tsx" src/design/__tests__/ConverterPage.test.tsx
git commit -m "feat(templates): extract ConverterPage and rebuild the tool route on it

The template deliberately does very little: an eyebrow, a headline, a
lede, and the instrument. ToolClient is the product -- around 1100 lines
of state machine, worker orchestration and fidelity reporting -- and
framing it means giving it a heading, not rebuilding it.

No landmark was added around the instrument, because every data-testid
inside it is frozen and 42 Playwright specs resolve against them. The
e2e suite was run as part of this change rather than after it."
```

---

## Task 5: The route-purity guard, and the exit gate

**Files:**
- Create: `src/app/__tests__/route-purity.test.ts`
- Modify: `src/design/__tests__/primitives-contract.test.ts`

**Interfaces:**
- Consumes: every template and every rebuilt route.

Spec §6.3 states the DRY rule and names the mechanism: *"A `page.tsx` may not contain layout. It resolves data from a registry and hands it to a template."* Enforced by a test over `src/app/**/page.tsx` requiring an import from `@/design/templates` and a length at or under 50 lines.

**Prove the gap before closing it, and prove the guard bites after.** A guard that does not cover a directory passes vacuously, and this codebase has shipped that twice.

- [ ] **Step 1: Write the guard**

Create `src/app/__tests__/route-purity.test.ts`. It must walk `src/app` for every `page.tsx`, and for each assert both properties. Model the directory walk on `src/design/__tests__/primitives-contract.test.ts`, which walks rather than holding a hand-written list — a list would go stale the moment a route is added, which is exactly when the guard matters.

Write the rule's reasoning into the file: routes that contain layout are how a design system stops being one, and 40 lines is enough for metadata, data resolution and one template call but not enough to hide a composition in.

- [ ] **Step 2: Prove it bites, three ways**

Report each result, reverting after:

1. Add ten lines of inline JSX to any route so it exceeds 50 lines → must **FAIL**, naming the file and its length.
2. Remove the `@/design/templates` import from a route and inline the markup → must **FAIL**.
3. Add a new `src/app/scratch/page.tsx` containing raw JSX and no template import → must **FAIL**, which proves the walk finds new routes rather than a fixed list.

- [ ] **Step 3: Extend the contract guard to `templates/`**

`primitives-contract.test.ts` walks named directories. A whole new directory now exists outside it. Extend the barrel check and the `"use client"` sweep to `src/design/templates`, following the shape already there.

Prove the gap first: add `src/design/templates/Unexported.tsx` that the barrel does not export, run the contract test, and confirm it **PASSES** — that is the bug. Extend the guard, confirm it now **FAILS**, delete the throwaway file.

Every template in this plan is a server component. The `"use client"` allowlist should gain no entries, and the sweep must fail if one acquires the directive without being added.

- [ ] **Step 4: Confirm the sweeps reach the new directory**

The spacing and palette sweeps walk `src` wholesale, so they should. Prove it rather than assuming: add `padding: "17px"` to a template → `design-system.test.ts` must **FAIL**; add a literal `#ff0000` → `tokens.test.ts` must **FAIL**. Revert both and report.

- [ ] **Step 5: Run the exit gate**

Run: `pnpm run ci`
Expected: PASS — typecheck, lint, unit tests, static build, Playwright.

Known flakes, and only these two: `src/core/io/__tests__/zip.test.ts` (timeouts under parallel load) and `src/core/engines/audio/__tests__/loudness.test.ts` (ffmpeg-gated skips). If and only if one fails, re-run it alone. `scripts/__tests__/generate-sw.test.ts` has a pre-existing, unrelated regex flake — leave it. **Any other failure means a change is wrong, not the test.**

- [ ] **Step 6: Walk every route**

Rebuild, serve `out/`, and for each of `/`, `/tools`, `/image`, `/image/heic-to-jpg`, `/blog`, a blog post, and `/404`:

1. `document.documentElement.scrollWidth` equals the viewport at 375 and 1280.
2. The lowest text contrast on the page, **naming its ground** — the terminal panel sits on `--surface`, not the page ground.
3. Every tab stop has a visible focus ring, measured against what is behind the ring. Use real `Tab` keypresses: scripted `.focus()` does not reliably engage Chromium's `:focus-visible` and has produced a false measurement in this project before.
4. A screenshot at 1280.

Then report `wc -l` for all six route files in one table, and confirm every one is at or under 40.

- [ ] **Step 7: Commit**

```bash
git add src/app/__tests__/route-purity.test.ts src/design/__tests__/primitives-contract.test.ts
git commit -m "feat(design): make the DRY rule enforceable

Spec 6.3 states that a page.tsx may not contain layout -- it resolves
data and hands it to a template. Stated, that is a convention nobody
checks; as a test over every src/app/**/page.tsx it is a rule.

Fifty lines is enough for metadata, data resolution and one template
call, and not enough to hide a composition in. The guard walks the
directory rather than holding a list, because a list goes stale exactly
when the guard matters -- the moment someone adds a route.

The gap was proved before it was closed: a new route with raw JSX and no
template import passed nothing, and fails now. The contract guard is
extended to the templates directory for the same reason -- it named
directories by hand, so a whole new one sat outside it, passing
vacuously."
```

---

## Definition of done

- [ ] `pnpm run ci` passes end to end.
- [ ] All four templates exist in `src/design/templates/`, are exported from its barrel, and each has at least one real consumer.
- [ ] All six live routes are at or under 50 lines and import from `@/design/templates`.
- [ ] `route-purity.test.ts` fails on an over-long route, on a route with no template import, and on a newly added route with raw JSX — each proved by mutation.
- [ ] The contract guard covers `src/design/templates/`, proved by mutation.
- [ ] The spacing and palette sweeps reach the templates directory, proved by mutation.
- [ ] The home page's repeated claims and unframed tool grid are resolved.
- [ ] Playwright is 42/42 — the instrument still works, and no frozen `data-testid` changed.
- [ ] Body copy on a blog post lands at a 60–75 character measure.
- [ ] No route imports a family or a primitive directly; templates are the only layout surface.
