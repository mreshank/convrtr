# Design Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the nine DESIGN.md primitives plus the site chrome, so Plan 3's templates have a vocabulary to compose from — and ship the difference cursor, the one piece of DESIGN.md that Plan 1 deliberately withheld.

**Architecture:** Every component is authored complete and consumed by nothing, exactly as Plan 1 authored its token file — templates arrive in Plan 3. The single exception is `DifferenceCursor`, which mounts in the root layout and is this plan's only user-visible change. That isolation is deliberate: it means the whole plan can be reviewed as component contracts, and the one behavioural change gets its own scrutiny rather than hiding among nine others.

**Tech Stack:** Next.js 16.3 (App Router, `output: "export"`), React 19.2, Tailwind CSS v4, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 + happy-dom + Testing Library, Biome 2.5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-04-convrtr-editorial-overhaul-design.md`](../specs/2026-09-04-convrtr-editorial-overhaul-design.md) — §6.1 (primitives) and §6.2's shared chrome. §4.6's pointer and reduced-motion guardrails govern the cursor.

**Plan 2 of 5.** Plan 1 (merged) built the monochrome token layer. This plan builds the components. Plan 3 builds templates and rebuilds the existing routes onto them. Plan 4 adds samples, live demos, groups and collectives. Plan 5 adds marketing, legal and the sitemap.

**Carried from Plan 1's follow-ups** ([`2026-09-04-monochrome-foundation-followups.md`](./2026-09-04-monochrome-foundation-followups.md)): four items in that document are this plan's responsibility and are called out in the tasks that own them — `.meta` having no consumer, the `[data-marquee]` selector trap, `SiteFooter` needing `ErrorPanel`'s inversion pattern, and `--ink-faint`'s contrast ceiling.

## Global Constraints

- **The palette is closed.** `--ground`, `--ink`, `--ink-muted`, `--ink-faint`, `--rule`, `--rule-width`, `--terminal`, `--terminal-ink`, `--terminal-rule`. A repo-wide sweep fails on any hex, `rgb()`, `rgba()`, `hwb()` or named colour written into a component, and a second sweep fails on any `var(--x)` naming a property `tokens.css` does not declare.
- **`--ink-faint` is `#737373`, which is 4.43:1 on white — below WCAG AA for normal text.** Use it only at ≥18.66px or bold. If a primitive needs faint metadata at a small size, use `--ink-muted`.
- **Easing is closed:** `var(--ease)` (`cubic-bezier(0.16, 1, 0.3, 1)`) is the only easing in the system.
- **Durations come from tokens:** `--dur-reveal` (1s), `--dur-hover` (700ms), `--dur-marquee` (30s), `--dur-min` (500ms floor on hover states).
- **Radii are a closed set:** `--radius` (4px), `--radius-card` (40px), `--radius-card-lg` (100px), or a `%` pill. A literal 12px fails the sweep.
- **Borders never exceed 1px**, in CSS-property or Tailwind-utility syntax. No gradients, glows, `box-shadow`, `backdrop-filter`.
- **Colour may only ever come from photography** — `MediaFrame` is the sole element permitted to show it, and only by removing a grayscale filter.
- **Reduced motion is already handled globally** by `globals.css`: `animation-duration` and `transition-duration` collapse to `0.01ms` (not `0`, so `animationend` still fires), and `[data-marquee]` gets `animation-play-state: paused`. Primitives must not restate that. They *may* add rules for what the global collapse cannot express — see Task 5.
- **`data-testid` values already in the tree are frozen.** New primitives may add their own.
- **Formatting:** Biome — tabs, double quotes. `pnpm exec biome check --write .` fixes formatting.
- **Every primitive is a server component unless it genuinely needs client state.** Only `DifferenceCursor` and `SiteHeader` (which owns overlay state) carry `"use client"`.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/design/primitives/MonoMeta.tsx` | The metadata voice — the sole consumer of `.meta`. |
| `src/design/primitives/Hairline.tsx` | The 1px rule; the system's only elevation device. |
| `src/design/primitives/Reveal.tsx` | Staggered slide-up reveal, CSS-driven, accessible. |
| `src/design/primitives/DisplayHeadline.tsx` | 12vw display type, revealed per character. |
| `src/design/primitives/Marquee.tsx` | Full-bleed seamless scroll, pausing on hover. |
| `src/design/primitives/AsymCard.tsx` | DESIGN.md's A/B/C asymmetric radius rotation. |
| `src/design/primitives/MediaFrame.tsx` | Grayscale→colour reveal; the only colour on the site. |
| `src/design/primitives/ArrowUpRight.tsx` | Hover-revealed glyph for grid items. |
| `src/design/primitives/DifferenceCursor.tsx` | The custom cursor, and the owner of `cursor: none`. |
| `src/design/chrome/SiteHeader.tsx` | Fixed difference-blended header with overlay nav. |
| `src/design/chrome/SiteFooter.tsx` | The terminal band, inverted by local token redefinition. |
| `src/design/primitives/index.ts` | Barrel export; the import surface Plan 3 consumes. |
| `src/design/primitives/primitives.css` | Keyframes and hover rules the components share. |
| `src/design/__tests__/primitives-contract.test.ts` | Every primitive is exported and none is orphaned. |
| Per-component test files under `src/design/__tests__/` | One per primitive. |

**Modified**

| File | Change |
|---|---|
| `src/app/layout.tsx` | Mounts `DifferenceCursor` once (Task 7). |
| `src/app/globals.css` | Imports `primitives.css` (Task 1). |

---

## Task 1: The two atoms, and the stylesheet they live in

**Files:**
- Create: `src/design/primitives/MonoMeta.tsx`, `src/design/primitives/Hairline.tsx`, `src/design/primitives/primitives.css`
- Modify: `src/app/globals.css`
- Test: `src/design/__tests__/MonoMeta.test.tsx`, `src/design/__tests__/Hairline.test.tsx`

**Interfaces:**
- Consumes: tokens from `src/design/tokens.css`.
- Produces: `MonoMeta({ children, as? })` and `Hairline({ className? })`. Every later task and Plan 3 import these.

`.meta` was declared in Plan 1 and has had **zero consumers** since — Plan 1's own follow-up document flags it. `MonoMeta` is what gives it one, and it settles which of two competing metadata treatments wins: the codebase currently has four files hand-rolling `className="mono text-[11px] tracking-[0.08em]"`. Those migrate during Plan 3's route rebuild; from here on, new metadata goes through `MonoMeta`.

- [ ] **Step 1: Write the failing tests**

Create `src/design/__tests__/MonoMeta.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonoMeta } from "@/design/primitives/MonoMeta";

describe("MonoMeta", () => {
	it("renders its children", () => {
		render(<MonoMeta>image · lossless · 2026</MonoMeta>);
		expect(screen.getByText("image · lossless · 2026")).toBeDefined();
	});

	it("carries the .meta class, not an ad-hoc treatment", () => {
		// `.meta` is DESIGN.md's metadata voice — 14px, uppercase, 0.1em
		// tracking — declared in tokens.css. Hand-rolling those values in a
		// className is the drift this primitive exists to stop, and it is
		// why `.mono` deliberately does NOT uppercase: it renders filenames,
		// and uppercasing one would misreport the user's file.
		const { container } = render(<MonoMeta>lossless</MonoMeta>);
		const el = container.firstElementChild;
		expect(el?.className).toContain("meta");
		expect(el?.className).not.toMatch(/text-\[|tracking-\[|uppercase/);
	});

	it("renders a span by default and honours `as`", () => {
		const { container: span } = render(<MonoMeta>a</MonoMeta>);
		expect(span.firstElementChild?.tagName).toBe("SPAN");

		const { container: div } = render(<MonoMeta as="div">b</MonoMeta>);
		expect(div.firstElementChild?.tagName).toBe("DIV");
	});
});
```

Create `src/design/__tests__/Hairline.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hairline } from "@/design/primitives/Hairline";

describe("Hairline", () => {
	it("renders a presentational rule at the system's border width", () => {
		const { container } = render(<Hairline />);
		const el = container.firstElementChild as HTMLElement | null;
		expect(el?.tagName).toBe("HR");
		expect(el?.style.borderTopWidth).toBe("var(--rule-width)");
		expect(el?.style.borderTopColor).toBe("var(--rule)");
	});

	it("sets no other border, so it cannot become a box", () => {
		const { container } = render(<Hairline />);
		const el = container.firstElementChild as HTMLElement | null;
		expect(el?.style.borderBottomWidth).toBe("");
		expect(el?.style.borderLeftWidth).toBe("");
		expect(el?.style.borderRightWidth).toBe("");
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/design/__tests__/MonoMeta.test.tsx src/design/__tests__/Hairline.test.tsx`
Expected: FAIL — `Failed to resolve import "@/design/primitives/MonoMeta"`.

- [ ] **Step 3: Write the components**

Create `src/design/primitives/MonoMeta.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Element to render. Defaults to `span`; use `div` for a block row. */
	as?: "span" | "div" | "p";
};

/**
 * DESIGN.md's metadata voice: monospace, 14px, uppercase, 0.1em tracking.
 *
 * The single consumer of `.meta`, and deliberately so. The class exists
 * separately from `.mono` because `.mono` renders *data* — filenames, byte
 * counts, timestamps — and must never uppercase: doing so would display a
 * filename the user does not have. `.meta` renders *labels*, where
 * DESIGN.md's uppercase treatment belongs.
 *
 * Routing every label through here rather than hand-rolling the values in a
 * className is what keeps those two voices from blurring back together.
 */
export function MonoMeta({ children, as: Tag = "span" }: Props) {
	return <Tag className="meta">{children}</Tag>;
}
```

Create `src/design/primitives/Hairline.tsx`:

```tsx
type Props = {
	className?: string;
};

/**
 * The system's only elevation device.
 *
 * DESIGN.md caps borders at 1px and forbids shadows outright, so separation
 * is always a rule and never a raised surface. Rendering an `<hr>` rather
 * than a styled `<div>` keeps the semantics honest for anyone navigating by
 * structure; the default browser border is replaced entirely so only the
 * top edge draws.
 */
export function Hairline({ className }: Props) {
	return (
		<hr
			className={className}
			style={{
				border: "0",
				borderTopWidth: "var(--rule-width)",
				borderTopStyle: "solid",
				borderTopColor: "var(--rule)",
				margin: "0",
			}}
		/>
	);
}
```

Create `src/design/primitives/primitives.css` with only a header comment for now — later tasks add keyframes:

```css
/*
 * Keyframes and hover rules shared by the primitives in this directory.
 *
 * These live in a stylesheet rather than inline styles because keyframes
 * and `:hover` descendant rules cannot be expressed in a React `style`
 * object at all. Everything that *can* be inline stays inline, so the
 * component remains the single place to read a primitive's appearance.
 */
```

- [ ] **Step 4: Import the stylesheet**

In `src/app/globals.css`, add after the tokens import:

```css
@import "../design/primitives/primitives.css";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/MonoMeta.test.tsx src/design/__tests__/Hairline.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design/primitives src/design/__tests__ src/app/globals.css
git commit -m "feat(design): add the metadata and rule primitives

MonoMeta is the first consumer .meta has had since Plan 1 declared it,
and it settles which of two metadata treatments wins — four files
currently hand-roll the values in a className, and those migrate during
the route rebuild.

The split from .mono is load-bearing rather than cosmetic: .mono renders
filenames and must never uppercase, because uppercasing one would show
the user a file they do not have."
```

---

## Task 2: Reveal, and the accessibility problem it creates

**Files:**
- Create: `src/design/primitives/Reveal.tsx`
- Modify: `src/design/primitives/primitives.css`
- Test: `src/design/__tests__/Reveal.test.tsx`

**Interfaces:**
- Consumes: `--ease`, `--dur-reveal`.
- Produces: `Reveal({ text, by?, className? })` where `by` is `"char" | "word"`, default `"word"`. Task 3's `DisplayHeadline` consumes it with `by="char"`.

DESIGN.md's reveal slides each span from `translateY(100%)` to `0`, staggered, over 1s. Two things make it harder than it looks.

**It must work without JavaScript.** The markup is server-rendered and the animation is pure CSS — no `useEffect`, no measuring. A JS-driven reveal on a static export flashes unstyled content before hydration, which is worse than no animation.

**Splitting text into spans destroys screen-reader pronunciation.** A per-character split makes assistive technology announce a headline letter by letter. The fix is not optional: the container carries the complete string as `aria-label` and every span is `aria-hidden`. Get this wrong and the site's largest text becomes unreadable to the people most dependent on it.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/Reveal.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reveal } from "@/design/primitives/Reveal";

describe("Reveal", () => {
	it("splits into one span per word by default", () => {
		const { container } = render(<Reveal text="convert anything" />);
		const spans = container.querySelectorAll("[data-reveal-part]");
		expect(spans.length).toBe(2);
		expect(spans[0]?.textContent).toBe("convert");
	});

	it("splits into one span per character when asked", () => {
		const { container } = render(<Reveal text="abc" by="char" />);
		expect(container.querySelectorAll("[data-reveal-part]").length).toBe(3);
	});

	it("staggers via an index custom property rather than inline delays", () => {
		// The stagger is a CSS calc over --reveal-i, so the timing lives in
		// the stylesheet with the rest of the motion rather than being
		// recomputed in JS for every span.
		const { container } = render(<Reveal text="a b c" />);
		const spans = container.querySelectorAll<HTMLElement>("[data-reveal-part]");
		expect(spans[0]?.style.getPropertyValue("--reveal-i")).toBe("0");
		expect(spans[2]?.style.getPropertyValue("--reveal-i")).toBe("2");
	});

	it("exposes the whole string to assistive technology, not the fragments", () => {
		// Per-character spans make a screen reader announce a headline letter
		// by letter. The container carries the real text and the fragments
		// are hidden — without this the site's largest type is unusable for
		// anyone who cannot see it.
		render(<Reveal text="convert anything" by="char" />);
		const el = screen.getByLabelText("convert anything");
		expect(el).toBeDefined();
		for (const span of el.querySelectorAll("[data-reveal-part]")) {
			expect(span.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("preserves spacing between word fragments", () => {
		// Splitting on whitespace and rendering bare spans would run the
		// words together; the rendered text must still read normally when
		// copied or read aloud from the DOM.
		const { container } = render(<Reveal text="convert anything" />);
		expect(container.textContent?.replace(/\s+/g, " ").trim()).toBe(
			"convert anything",
		);
	});
});
```

> **Corrections, recorded during execution.** Three defects in this task's
> text were found by the implementer and confirmed by review:
>
> 1. **The test and the component contradicted each other.** The test asserts a
>    word-mode fragment's `textContent` is `"convert"`, while the component put
>    the inter-word space *inside* the span. The component was changed rather
>    than the test — the span is the animated unit, so a trailing space inside
>    it would animate too, and `[data-reveal-part]` should map 1:1 onto the
>    semantic unit.
> 2. **The JSX carried two Biome violations** and would not have linted: an
>    `aria-label` requiring `role="img"`, and an array-index key. Both were
>    fixed using patterns already established in `FidelityScore.tsx` and
>    `ComparisonTable.tsx`.
> 3. **The dangling-custom-property guard needed widening.** `--reveal-i` is set
>    per fragment by this component rather than declared in `tokens.css`, so the
>    sweep flagged it. Allowlisting is the right treatment here and does not
>    weaken the guard: the property is written by the same component that reads
>    it, and `var(--reveal-i, 0)` carries an explicit fallback, so the silent
>    evaporation the guard exists to catch cannot occur.
>
> **The authoritative version is the code**, in `src/design/primitives/Reveal.tsx`
> and its test — deliberately not duplicated here, so there is one source of
> truth rather than two that can drift.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/Reveal.test.tsx`
Expected: FAIL — `Failed to resolve import "@/design/primitives/Reveal"`.

- [ ] **Step 3: Write the component**

Create `src/design/primitives/Reveal.tsx`:

```tsx
type Props = {
	/** The complete string. Also becomes the accessible name. */
	text: string;
	/** Split granularity. Character split is for display type only. */
	by?: "char" | "word";
	className?: string;
};

/**
 * DESIGN.md's signature reveal: each fragment slides up from
 * translateY(100%) with `--ease` over `--dur-reveal`, staggered.
 *
 * Server-rendered markup driven by pure CSS, with no effect and no
 * measurement. On a static export a JS-driven reveal flashes unstyled
 * content before hydration, which is a worse outcome than no animation at
 * all — so the animation must be something the first paint already knows
 * how to do.
 *
 * The accessibility handling is not decoration. Splitting text into spans
 * makes assistive technology announce a headline fragment by fragment, so
 * the container carries the whole string as its accessible name and every
 * fragment is removed from the accessibility tree.
 *
 * Reduced motion needs nothing here: `globals.css` collapses
 * `animation-duration` to 0.01ms, which resolves each fragment to its
 * final position rather than skipping it, so no content is lost.
 */
export function Reveal({ text, by = "word", className }: Props) {
	const parts = by === "char" ? [...text] : text.split(" ");

	return (
		<span aria-label={text} className={className} data-reveal>
			{parts.map((part, index) => (
				<span
					// Fragments are not stable across renders and have no id of
					// their own; index is the honest key here.
					key={`${index}-${part}`}
					data-reveal-part
					aria-hidden="true"
					style={{ ["--reveal-i" as string]: String(index) }}
				>
					{part}
					{by === "word" && index < parts.length - 1 ? " " : ""}
				</span>
			))}
		</span>
	);
}
```

- [ ] **Step 4: Add the keyframes**

Append to `src/design/primitives/primitives.css`:

```css
/*
 * The reveal. Each fragment is clipped by its parent's overflow and slides
 * up into view, delayed by its own index so the line assembles left to
 * right.
 *
 * `--reveal-i` is set per fragment by the Reveal component; the 40ms step
 * lives here so the whole timing story stays in one file.
 */
[data-reveal] {
	display: inline-block;
	overflow: hidden;
	vertical-align: bottom;
}

[data-reveal-part] {
	display: inline-block;
	white-space: pre;
	animation: reveal-rise var(--dur-reveal) var(--ease) both;
	animation-delay: calc(var(--reveal-i, 0) * 40ms);
}

@keyframes reveal-rise {
	from {
		transform: translateY(100%);
	}
	to {
		transform: translateY(0);
	}
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/Reveal.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design/primitives src/design/__tests__
git commit -m "feat(design): add the staggered reveal

Server-rendered markup driven by pure CSS, with no effect and no
measurement — on a static export a JS-driven reveal flashes unstyled
content before hydration, which is worse than no animation.

The accessibility handling is the load-bearing part. Splitting text into
spans makes a screen reader announce a headline fragment by fragment, so
the container carries the whole string and the fragments leave the
accessibility tree. Without it the site's largest type is unusable for
anyone who cannot see it."
```

---

## Task 3: DisplayHeadline

**Files:**
- Create: `src/design/primitives/DisplayHeadline.tsx`
- Test: `src/design/__tests__/DisplayHeadline.test.tsx`

**Interfaces:**
- Consumes: `Reveal` from Task 2; `--display-size`, `--tracking-display`, `--leading-display`.
- Produces: `DisplayHeadline({ text, as? })` where `as` is `"h1" | "h2"`, default `"h1"`.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/DisplayHeadline.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisplayHeadline } from "@/design/primitives/DisplayHeadline";

describe("DisplayHeadline", () => {
	it("renders a real heading with the text as its accessible name", () => {
		render(<DisplayHeadline text="convert anything" />);
		expect(
			screen.getByRole("heading", { name: "convert anything", level: 1 }),
		).toBeDefined();
	});

	it("renders as h2 when asked", () => {
		render(<DisplayHeadline text="all tools" as="h2" />);
		expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
	});

	it("takes its size and metrics from tokens, not literals", () => {
		const { container } = render(<DisplayHeadline text="a" />);
		const heading = container.querySelector("h1") as HTMLElement | null;
		expect(heading?.style.fontSize).toBe("var(--display-size)");
		expect(heading?.style.letterSpacing).toBe("var(--tracking-display)");
		expect(heading?.style.lineHeight).toBe("var(--leading-display)");
	});

	it("reveals per character", () => {
		const { container } = render(<DisplayHeadline text="abc" />);
		expect(container.querySelectorAll("[data-reveal-part]").length).toBe(3);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/DisplayHeadline.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/design/primitives/DisplayHeadline.tsx`:

```tsx
import { Reveal } from "./Reveal";

type Props = {
	text: string;
	as?: "h1" | "h2";
};

/**
 * DESIGN.md's display type: 12vw, weight 700, -0.05em tracking, 0.9 line
 * height, assembled by a staggered per-character reveal.
 *
 * The heading element is real and carries the text as its accessible name
 * via Reveal, so the character split never reaches assistive technology.
 * Size and metrics come from tokens rather than literals so a change to
 * the display scale is one edit in one file.
 */
export function DisplayHeadline({ text, as: Tag = "h1" }: Props) {
	return (
		<Tag
			style={{
				fontSize: "var(--display-size)",
				fontWeight: 700,
				letterSpacing: "var(--tracking-display)",
				lineHeight: "var(--leading-display)",
			}}
		>
			<Reveal text={text} by="char" />
		</Tag>
	);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/DisplayHeadline.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design/primitives/DisplayHeadline.tsx src/design/__tests__/DisplayHeadline.test.tsx
git commit -m "feat(design): add the display headline

Composes Reveal rather than re-implementing the character split, so the
accessible-name handling that makes a split headline readable is
inherited rather than repeated — and cannot drift out of step with it."
```

---

## Task 4: Marquee, and a selector trap Plan 1 left behind

**Files:**
- Create: `src/design/primitives/Marquee.tsx`
- Modify: `src/design/primitives/primitives.css`
- Test: `src/design/__tests__/Marquee.test.tsx`

**Interfaces:**
- Consumes: `--dur-marquee`.
- Produces: `Marquee({ children, ariaLabel })`.

**Read this before writing the component.** Plan 1 added `[data-marquee] { animation-play-state: paused }` under `prefers-reduced-motion`, and its follow-up document flags the trap: that selector pauses only the element *carrying the attribute*. A marquee normally animates an inner track, so putting `data-marquee` on the outer container would make the rule match an element with no animation on it — silently doing nothing, for the users who most need it to work.

**The attribute goes on the animated track.** Not the container.

Two tracks are rendered so the loop is seamless: when the first has scrolled its full width the second is exactly where the first began. The duplicate is decorative repetition, so it is hidden from assistive technology and the container carries a real label.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/Marquee.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Marquee } from "@/design/primitives/Marquee";

describe("Marquee", () => {
	it("duplicates the track so the loop is seamless", () => {
		const { container } = render(
			<Marquee ariaLabel="Featured conversions">
				<span>item</span>
			</Marquee>,
		);
		expect(container.querySelectorAll("[data-marquee]").length).toBe(2);
	});

	it("puts data-marquee on the animated track, never the container", () => {
		// The reduced-motion rule in globals.css is
		// `[data-marquee] { animation-play-state: paused }`, which pauses only
		// the element it matches. If the attribute sat on the container the
		// rule would match an element carrying no animation, and would
		// silently do nothing for exactly the people who need it to work.
		const { container } = render(
			<Marquee ariaLabel="Featured">
				<span>item</span>
			</Marquee>,
		);
		const outer = container.firstElementChild as HTMLElement;
		expect(outer.hasAttribute("data-marquee")).toBe(false);
		for (const track of container.querySelectorAll<HTMLElement>(
			"[data-marquee]",
		)) {
			expect(track.style.animationName).toBe("marquee-scroll");
		}
	});

	it("names the region once and hides the duplicate track", () => {
		render(
			<Marquee ariaLabel="Featured conversions">
				<span>item</span>
			</Marquee>,
		);
		const region = screen.getByLabelText("Featured conversions");
		const tracks = region.querySelectorAll("[data-marquee]");
		expect(tracks[0]?.getAttribute("aria-hidden")).toBeNull();
		expect(tracks[1]?.getAttribute("aria-hidden")).toBe("true");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/Marquee.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/design/primitives/Marquee.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Names the region. The duplicated track is hidden, so this is said once. */
	ariaLabel: string;
};

/**
 * DESIGN.md's continuous scroll: full-bleed, 30s linear, pausing on hover.
 *
 * Two identical tracks run side by side. When the first has travelled its
 * own width the second sits exactly where the first began, so the loop has
 * no seam — one track would visibly snap back.
 *
 * `data-marquee` goes on the TRACKS, not the container, and that placement
 * is load-bearing. `globals.css` pauses reduced motion with
 * `[data-marquee] { animation-play-state: paused }`, and that rule affects
 * only the element it matches. On the container it would match an element
 * with no animation and quietly do nothing.
 *
 * The second track is decorative repetition, so it leaves the
 * accessibility tree and the region is named once.
 */
export function Marquee({ children, ariaLabel }: Props) {
	const track = (duplicate: boolean) => (
		<div
			data-marquee
			aria-hidden={duplicate ? "true" : undefined}
			style={{
				display: "flex",
				flexShrink: 0,
				animationName: "marquee-scroll",
				animationDuration: "var(--dur-marquee)",
				animationTimingFunction: "linear",
				animationIterationCount: "infinite",
			}}
		>
			{children}
		</div>
	);

	return (
		<section
			aria-label={ariaLabel}
			data-marquee-viewport
			style={{ display: "flex", overflow: "hidden", width: "100%" }}
		>
			{track(false)}
			{track(true)}
		</section>
	);
}
```

- [ ] **Step 4: Add the keyframes and the hover pause**

Append to `src/design/primitives/primitives.css`:

```css
/*
 * The marquee. Each track translates by exactly its own width, at which
 * point its duplicate occupies the position it started from — so the reset
 * to 0% is invisible.
 *
 * Hover pauses from the viewport, because the pointer is over the
 * container rather than over whichever track happens to be under it.
 */
@keyframes marquee-scroll {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(-100%);
	}
}

[data-marquee-viewport]:hover [data-marquee] {
	animation-play-state: paused;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/Marquee.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design/primitives src/design/__tests__
git commit -m "feat(design): add the infinite marquee

data-marquee goes on the tracks rather than the container, and the test
pins it there. Plan 1's reduced-motion rule pauses whatever that selector
matches; on the container it would have matched an element carrying no
animation and done nothing at all — silently, for the people who asked
for less movement."
```

---

## Task 5: AsymCard and MediaFrame

**Files:**
- Create: `src/design/primitives/AsymCard.tsx`, `src/design/primitives/MediaFrame.tsx`
- Modify: `src/design/primitives/primitives.css`
- Test: `src/design/__tests__/AsymCard.test.tsx`, `src/design/__tests__/MediaFrame.test.tsx`

**Interfaces:**
- Consumes: `--radius-card` (40px), `--radius-card-lg` (100px), `--dur-hover`, `--ease`.
- Produces: `AsymCard({ children, variant, aspect? })` where `variant` is `"a" | "b" | "c"` and `aspect` is `"5/7" | "4/3"` (default `"4/3"`); `MediaFrame({ children })`.

DESIGN.md's asymmetric radii, applied in rotation so the grid stops reading as a row of identical rectangles:

| Variant | Radii |
|---|---|
| A | `border-top-left-radius: 100px` |
| B | `border-top-right-radius: 100px`, `border-bottom-left-radius: 40px` |
| C | `border-radius: 40px` |

`MediaFrame` is the **only** element in the system permitted to show colour, and only by removing a grayscale filter on hover. One subtlety: Plan 1's global reduced-motion rule collapses `transition-duration`, which makes the grayscale removal *instant* — but the spec asks for image hovers to reduce to **opacity alone**, meaning the 1.05× scale should not happen at all. The global collapse cannot express that, so `MediaFrame` adds the one rule that can.

- [ ] **Step 1: Write the failing tests**

Create `src/design/__tests__/AsymCard.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AsymCard } from "@/design/primitives/AsymCard";

describe("AsymCard", () => {
	it("applies DESIGN.md's three radius patterns", () => {
		const radii = (variant: "a" | "b" | "c") => {
			const { container } = render(
				<AsymCard variant={variant}>
					<span>x</span>
				</AsymCard>,
			);
			return (container.firstElementChild as HTMLElement).style;
		};

		expect(radii("a").borderTopLeftRadius).toBe("var(--radius-card-lg)");
		expect(radii("b").borderTopRightRadius).toBe("var(--radius-card-lg)");
		expect(radii("b").borderBottomLeftRadius).toBe("var(--radius-card)");
		expect(radii("c").borderRadius).toBe("var(--radius-card)");
	});

	it("uses only radius tokens, never literal pixels", () => {
		// The design-system sweep allows {0,4,40,100}; writing them as
		// literals here would pass that sweep and still fork the source of
		// truth for the card system.
		const { container } = render(
			<AsymCard variant="a">
				<span>x</span>
			</AsymCard>,
		);
		const style = (container.firstElementChild as HTMLElement).getAttribute(
			"style",
		);
		expect(style).not.toMatch(/\d+px/);
	});

	it("carries the requested aspect ratio", () => {
		const { container } = render(
			<AsymCard variant="a" aspect="5/7">
				<span>x</span>
			</AsymCard>,
		);
		expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe(
			"5/7",
		);
	});
});
```

Create `src/design/__tests__/MediaFrame.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaFrame } from "@/design/primitives/MediaFrame";

describe("MediaFrame", () => {
	it("starts fully desaturated", () => {
		// DESIGN.md permits colour nowhere except photography, and only on
		// hover. At rest this frame is part of the monochrome system.
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.filter).toBe("grayscale(100%)");
	});

	it("transitions over the hover duration with the system easing", () => {
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transitionDuration).toBe("var(--dur-hover)");
		expect(el.style.transitionTimingFunction).toBe("var(--ease)");
	});

	it("is marked so the stylesheet can reach it on hover", () => {
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		expect(
			(container.firstElementChild as HTMLElement).hasAttribute("data-media"),
		).toBe(true);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/design/__tests__/AsymCard.test.tsx src/design/__tests__/MediaFrame.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the components**

Create `src/design/primitives/AsymCard.tsx`:

```tsx
import type { CSSProperties, ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Which of DESIGN.md's three radius patterns to use. */
	variant: "a" | "b" | "c";
	aspect?: "5/7" | "4/3";
};

/**
 * DESIGN.md's asymmetric card radii, applied in rotation so a grid stops
 * reading as a row of identical rectangles — its Special Components section
 * calls this out explicitly as breaking the grid's monotony.
 *
 * Radii are tokens rather than literals. The design-system sweep permits
 * the literal values 40 and 100, so writing them here would pass review and
 * still leave two sources of truth for the card system.
 */
const RADII: Record<Props["variant"], CSSProperties> = {
	a: { borderTopLeftRadius: "var(--radius-card-lg)" },
	b: {
		borderTopRightRadius: "var(--radius-card-lg)",
		borderBottomLeftRadius: "var(--radius-card)",
	},
	c: { borderRadius: "var(--radius-card)" },
};

export function AsymCard({ children, variant, aspect = "4/3" }: Props) {
	return (
		<div style={{ ...RADII[variant], aspectRatio: aspect, overflow: "hidden" }}>
			{children}
		</div>
	);
}
```

Create `src/design/primitives/MediaFrame.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

/**
 * The only element in the system permitted to show colour.
 *
 * DESIGN.md's Special Notes are absolute: "any colour should only come from
 * project photography." This frame holds that line by desaturating its
 * contents completely at rest and restoring them on hover — so colour is
 * never a design decision, only an image being seen properly.
 *
 * The hover rule and the reduced-motion exception both live in
 * `primitives.css`, because neither a descendant `:hover` nor a media query
 * can be expressed in a React style object.
 */
export function MediaFrame({ children }: Props) {
	return (
		<div
			data-media
			style={{
				filter: "grayscale(100%)",
				transitionProperty: "filter, transform",
				transitionDuration: "var(--dur-hover)",
				transitionTimingFunction: "var(--ease)",
				willChange: "filter, transform",
			}}
		>
			{children}
		</div>
	);
}
```

- [ ] **Step 4: Add the hover and reduced-motion rules**

Append to `src/design/primitives/primitives.css`:

```css
/*
 * The image reveal: grayscale to full colour with a 1.05x scale, over
 * --dur-hover. `:focus-within` is included so the reveal is reachable by
 * keyboard, since a card's link can be focused without any pointer.
 */
[data-media]:hover,
[data-media]:focus-within {
	filter: grayscale(0%);
	transform: scale(1.05);
}

/*
 * Spec §4.6 asks image hovers to reduce to opacity alone under reduced
 * motion. The global rule in globals.css collapses transition-duration,
 * which makes the colour change instant — but an instant 1.05x scale is
 * still a jump in size, which is movement. Suppressing the transform is
 * the part the global collapse cannot express.
 */
@media (prefers-reduced-motion: reduce) {
	[data-media]:hover,
	[data-media]:focus-within {
		transform: none;
	}
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/AsymCard.test.tsx src/design/__tests__/MediaFrame.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design/primitives src/design/__tests__
git commit -m "feat(design): add the asymmetric card and the media frame

MediaFrame is the one element allowed to show colour, and only by
un-desaturating a photograph — so colour is never a design decision.

Its reduced-motion rule suppresses the scale rather than relying on the
global duration collapse. Collapsing the duration makes an instant 1.05x
jump, and an instant jump in size is still movement."
```

---

## Task 6: ArrowUpRight

**Files:**
- Create: `src/design/primitives/ArrowUpRight.tsx`
- Modify: `src/design/primitives/primitives.css`
- Test: `src/design/__tests__/ArrowUpRight.test.tsx`

**Interfaces:**
- Consumes: `--dur-min`, `--ease`.
- Produces: `ArrowUpRight({ size? })`, default 24.

DESIGN.md puts this glyph top-right of grid items, revealed on hover. It is decoration next to a link that already says where it goes, so it is hidden from assistive technology — announcing "arrow" after a link's own name is noise.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/ArrowUpRight.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

describe("ArrowUpRight", () => {
	it("is hidden from assistive technology", () => {
		// It sits beside a link that already names its destination; announcing
		// "arrow" after that is noise, not information.
		const { container } = render(<ArrowUpRight />);
		expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("draws in currentColor so it inherits whatever ground it sits on", () => {
		// Including an inverted one — the footer redefines --ink locally, and
		// a hardcoded token would not follow.
		const { container } = render(<ArrowUpRight />);
		expect(container.querySelector("path")?.getAttribute("stroke")).toBe(
			"currentColor",
		);
	});

	it("is marked so the stylesheet can reveal it on parent hover", () => {
		const { container } = render(<ArrowUpRight />);
		expect(container.querySelector("[data-arrow]")).not.toBeNull();
	});

	it("honours a custom size", () => {
		const { container } = render(<ArrowUpRight size={32} />);
		expect(container.querySelector("svg")?.getAttribute("width")).toBe("32");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/ArrowUpRight.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/design/primitives/ArrowUpRight.tsx`:

```tsx
type Props = {
	size?: number;
};

/**
 * The hover-revealed glyph DESIGN.md places top-right of a grid item.
 *
 * Drawn in `currentColor` rather than a token so it follows whatever ground
 * it is placed on — including an inverted one, where the footer redefines
 * `--ink` locally and a hardcoded token would point at the wrong value.
 *
 * Decorative: the item's own link already names its destination.
 */
export function ArrowUpRight({ size = 24 }: Props) {
	return (
		<svg
			data-arrow
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M7 17 L17 7 M17 7 H8 M17 7 V16"
				stroke="currentColor"
				strokeWidth="1"
			/>
		</svg>
	);
}
```

- [ ] **Step 4: Add the reveal rule**

Append to `src/design/primitives/primitives.css`:

```css
/*
 * The arrow fades in when its item is hovered or holds focus. Opacity
 * rather than display, so the layout never shifts as it appears — and
 * `--dur-min` is DESIGN.md's 500ms floor for hover states.
 */
[data-arrow] {
	opacity: 0;
	transition: opacity var(--dur-min) var(--ease);
}

[data-arrow-host]:hover [data-arrow],
[data-arrow-host]:focus-within [data-arrow] {
	opacity: 1;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/ArrowUpRight.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design/primitives src/design/__tests__
git commit -m "feat(design): add the hover-revealed arrow glyph

Drawn in currentColor so it follows an inverted ground, and hidden from
assistive technology because the link beside it already says where it
goes."
```

---

## Task 7: The difference cursor, and the `cursor: none` it finally earns

**Files:**
- Create: `src/design/primitives/DifferenceCursor.tsx`
- Modify: `src/app/layout.tsx`, `src/design/primitives/primitives.css`
- Test: `src/design/__tests__/DifferenceCursor.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `DifferenceCursor()` — no props. Mounted once in the root layout.

**This is the only user-visible change in the plan, and the only place it can go badly wrong.**

Plan 1 refused to ship `cursor: none`, and its reasoning governs this task: a visitor with no cursor and nothing replacing it is far worse off than one with an ordinary arrow. That risk is not hypothetical here.

**`cursor: none` must be applied by this component at runtime, never written statically into `globals.css`.** A static rule hides the system cursor for everyone — including visitors whose JavaScript failed, was blocked, or has not hydrated yet. They would be left with no pointer at all and no way to get one back. Applying it from inside the component means it can only ever take effect when a replacement is actually on screen.

Three further guardrails, all from spec §4.6:

- **Coarse pointers render nothing.** The component returns `null` unless `(pointer: fine)` matches. A touch user has no cursor to replace, and `cursor: none` there is meaningless at best.
- **Reduced motion drops the interpolation.** The lag *is* the motion; under `prefers-reduced-motion` the element tracks the pointer exactly.
- **The element never intercepts input.** `pointer-events: none`, always.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/DifferenceCursor.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DifferenceCursor } from "@/design/primitives/DifferenceCursor";

function mockPointer(fine: boolean, reducedMotion = false) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: query.includes("pointer: fine")
				? fine
				: query.includes("prefers-reduced-motion")
					? reducedMotion
					: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.classList.remove("has-custom-cursor");
});

describe("DifferenceCursor", () => {
	it("renders nothing on a coarse pointer", () => {
		// A touch user has no cursor to replace. Rendering one would put a
		// circle on screen that never moves.
		mockPointer(false);
		const { container } = render(<DifferenceCursor />);
		expect(container.firstElementChild).toBeNull();
	});

	it("never hides the system cursor on a coarse pointer", () => {
		mockPointer(false);
		render(<DifferenceCursor />);
		expect(document.body.classList.contains("has-custom-cursor")).toBe(false);
	});

	it("hides the system cursor only while it is mounted on a fine pointer", () => {
		// The class is added from the component rather than written into
		// globals.css. A static `cursor: none` would hide the pointer for
		// visitors whose JavaScript failed or has not hydrated, leaving them
		// with nothing at all and no way to recover it.
		mockPointer(true);
		const { unmount } = render(<DifferenceCursor />);
		expect(document.body.classList.contains("has-custom-cursor")).toBe(true);
		unmount();
		expect(document.body.classList.contains("has-custom-cursor")).toBe(false);
	});

	it("renders a non-interactive difference-blended circle", () => {
		mockPointer(true);
		const { container } = render(<DifferenceCursor />);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.position).toBe("fixed");
		expect(el.style.pointerEvents).toBe("none");
		expect(el.style.mixBlendMode).toBe("difference");
		expect(el.style.zIndex).toBe("9999");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/DifferenceCursor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/design/primitives/DifferenceCursor.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const SIZE = 32;

/**
 * DESIGN.md's custom cursor: a 32px circle blended with `difference`, so it
 * inverts whatever it passes over and stays visible on any ground.
 *
 * Three rules keep it from making the site worse than it was.
 *
 * `cursor: none` is applied from HERE, by adding a class to <body> on
 * mount, and never written statically into globals.css. A static rule
 * hides the system cursor for everyone — including anyone whose
 * JavaScript failed, was blocked, or has not hydrated yet — and leaves
 * them with no pointer and no way to get one back. Tying it to this
 * component means the system cursor can only disappear when a replacement
 * is genuinely on screen.
 *
 * Coarse pointers render nothing at all. There is no cursor to replace on
 * a touch screen.
 *
 * Reduced motion drops the interpolation. The lag IS the motion here, so
 * under `prefers-reduced-motion` the circle tracks the pointer exactly
 * rather than easing toward it.
 */
export function DifferenceCursor() {
	const [enabled, setEnabled] = useState(false);
	const dotRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!window.matchMedia("(pointer: fine)").matches) return;
		setEnabled(true);
		document.body.classList.add("has-custom-cursor");
		return () => {
			document.body.classList.remove("has-custom-cursor");
		};
	}, []);

	useEffect(() => {
		if (!enabled) return;

		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		// Target is where the pointer is; current is where the circle is.
		// Interpolating between them each frame is what produces the lag.
		let targetX = 0;
		let targetY = 0;
		let currentX = 0;
		let currentY = 0;
		let frame = 0;

		const onMove = (event: PointerEvent) => {
			targetX = event.clientX;
			targetY = event.clientY;
			if (reduced) {
				currentX = targetX;
				currentY = targetY;
				paint();
			}
		};

		const paint = () => {
			const dot = dotRef.current;
			if (!dot) return;
			dot.style.transform = `translate3d(${currentX - SIZE / 2}px, ${
				currentY - SIZE / 2
			}px, 0)`;
		};

		const tick = () => {
			// 0.18 is slow enough to read as lag and fast enough that the
			// circle never feels detached from the pointer.
			currentX += (targetX - currentX) * 0.18;
			currentY += (targetY - currentY) * 0.18;
			paint();
			frame = requestAnimationFrame(tick);
		};

		window.addEventListener("pointermove", onMove, { passive: true });
		if (!reduced) frame = requestAnimationFrame(tick);

		return () => {
			window.removeEventListener("pointermove", onMove);
			if (frame) cancelAnimationFrame(frame);
		};
	}, [enabled]);

	if (!enabled) return null;

	return (
		<div
			ref={dotRef}
			data-cursor
			aria-hidden="true"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: SIZE,
				height: SIZE,
				borderRadius: "50%",
				background: "#ffffff",
				mixBlendMode: "difference",
				pointerEvents: "none",
				zIndex: 9999,
				transition: "transform var(--dur-min) var(--ease)",
			}}
		/>
	);
}
```

**Note on the `#ffffff` literal:** the palette sweep forbids hex in components. White here is not a palette choice — `mix-blend-mode: difference` against white is what performs the inversion, and it must stay white in both themes. Extend the allowlist at `src/design/__tests__/tokens.test.ts:118`, which is currently:

```ts
const LITERAL_HEX_ALLOWED = new Set([join("src", "app", "manifest.ts")]);
```

to:

```ts
const LITERAL_HEX_ALLOWED = new Set([
	join("src", "app", "manifest.ts"),
	// `mix-blend-mode: difference` inverts against white specifically —
	// this is the blend operand, not a palette choice, and a token would
	// change with the theme and break the inversion.
	join("src", "design", "primitives", "DifferenceCursor.tsx"),
	join("src", "design", "chrome", "SiteHeader.tsx"),
]);
```

- [ ] **Step 4: Add the cursor-hiding rule and the hover scale**

Append to `src/design/primitives/primitives.css`:

```css
/*
 * The system cursor is hidden only while DifferenceCursor is mounted — it
 * adds this class itself. Writing `cursor: none` straight into the
 * stylesheet would hide the pointer for anyone whose JavaScript never ran,
 * leaving them nothing to point with.
 *
 * `(pointer: fine)` is belt and braces: the component already refuses to
 * mount on a coarse pointer.
 */
@media (pointer: fine) {
	body.has-custom-cursor,
	body.has-custom-cursor * {
		cursor: none;
	}
}

/*
 * DESIGN.md scales the cursor 2.5x over anything interactive. The selector
 * lives here rather than in the component because it depends on what the
 * pointer is over, which the component never knows.
 */
body.has-custom-cursor:has(a:hover, button:hover) [data-cursor] {
	transform-origin: center;
	scale: 2.5;
}
```

- [ ] **Step 5: Mount it in the root layout**

In `src/app/layout.tsx`, import the component and render it inside `<body>`, immediately after `<ServiceWorkerRegistration />`:

```tsx
import { DifferenceCursor } from "@/design/primitives/DifferenceCursor";
```

```tsx
				<ServiceWorkerRegistration />
				<DifferenceCursor />
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/DifferenceCursor.test.tsx && pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Verify the failure mode by hand**

This is the one behaviour in the plan a unit test cannot prove. Run `pnpm build`, then:

```bash
grep -rn "cursor: none" out/_next/static/css/*.css | head
```

Expected: the rule appears **only** under `body.has-custom-cursor`. If any bare `cursor: none` on `body` or `*` reaches the build output, stop and report — that is the exact failure this task is designed to prevent.

- [ ] **Step 8: Commit**

```bash
git add src/design/primitives src/design/__tests__ src/app/layout.tsx
git commit -m "feat(design): add the difference cursor, and hide the system one safely

Plan 1 deliberately withheld cursor: none because shipping it without a
replacement leaves a visitor with no pointer at all. That risk is real
here, so the rule is applied by the component at runtime rather than
written into the stylesheet: anyone whose JavaScript failed, was blocked,
or has not hydrated keeps their ordinary cursor.

Coarse pointers render nothing — there is no cursor to replace on a touch
screen — and reduced motion drops the interpolation, since the lag is the
motion."
```

---

## Task 8: SiteHeader

**Files:**
- Create: `src/design/chrome/SiteHeader.tsx`
- Test: `src/design/__tests__/SiteHeader.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `SiteHeader({ links })` where `links` is `{ href: string; label: string }[]`. Plan 3's templates mount it.

DESIGN.md: fixed, `mix-blend-mode: difference` so it stays legible over any ground, lowercase wordmark at 24px/700/tight, a plus-icon toggle opening a full overlay nav, 24px padding.

The overlay is real UI and needs real keyboard behaviour: the toggle is a `button` with `aria-expanded`, Escape closes it, and focus returns to the toggle when it does. Without that, opening the nav strands a keyboard user inside it.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/SiteHeader.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/design/chrome/SiteHeader";

const LINKS = [
	{ href: "/tools", label: "Tools" },
	{ href: "/blog", label: "Blog" },
];

describe("SiteHeader", () => {
	it("renders the wordmark as a link home", () => {
		render(<SiteHeader links={LINKS} />);
		expect(
			screen.getByRole("link", { name: "convrtr" }).getAttribute("href"),
		).toBe("/");
	});

	it("keeps the nav closed until asked", () => {
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("link", { name: "Tools" })).toBeNull();
	});

	it("opens and closes the overlay", () => {
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByRole("link", { name: "Tools" })).toBeDefined();
		fireEvent.click(toggle);
		expect(screen.queryByRole("link", { name: "Tools" })).toBeNull();
	});

	it("closes on Escape and returns focus to the toggle", () => {
		// Without this a keyboard user who opens the nav is stranded in it.
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(toggle);
	});

	it("blends with difference so it stays legible over any ground", () => {
		const { container } = render(<SiteHeader links={LINKS} />);
		const header = container.querySelector("header") as HTMLElement;
		expect(header.style.mixBlendMode).toBe("difference");
		expect(header.style.position).toBe("fixed");
	});

	it("renders the overlay outside the blended header, not inside it", () => {
		// mix-blend-mode blends an element and its whole subtree as one group
		// against the page backdrop, and a descendant cannot opt out. Nested
		// inside, the overlay's var(--ground) would paint as its inverse —
		// and no unit test would catch it, because happy-dom composites
		// nothing. This assertion is the only thing standing in the way.
		const { container } = render(<SiteHeader links={LINKS} />);
		fireEvent.click(screen.getByRole("button", { name: /menu/i }));
		const nav = screen.getByRole("navigation", { name: "Main" });
		expect(container.querySelector("header")?.contains(nav)).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/SiteHeader.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/design/chrome/SiteHeader.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
	links: { href: string; label: string }[];
};

/**
 * DESIGN.md's fixed header.
 *
 * `mix-blend-mode: difference` is what lets one header sit over a white
 * page, a photograph and the terminal footer band without ever restating
 * its colour — it inverts whatever is behind it.
 *
 * The overlay nav is real UI, so it behaves like one: the toggle is a
 * button carrying `aria-expanded`, Escape closes the overlay, and focus
 * returns to the toggle when it does. Skipping that would strand a
 * keyboard user inside an overlay they cannot leave.
 */
export function SiteHeader({ links }: Props) {
	const [open, setOpen] = useState(false);
	const toggleRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
			toggleRef.current?.focus();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open]);

	// The overlay is a SIBLING of the blended bar, never a child of it.
	// `mix-blend-mode` blends an element and its entire subtree as one group
	// against the page backdrop, and a descendant cannot opt out —
	// `mix-blend-mode: normal` on a child only governs how that child blends
	// with its parent's own content. Nested inside, the overlay's
	// `var(--ground)` would paint as its inverse, and no unit test would
	// notice because happy-dom composites nothing.
	return (
		<>
		<header
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				zIndex: 100,
				mixBlendMode: "difference",
				color: "#ffffff",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "24px",
			}}
		>
			<Link
				href="/"
				style={{
					fontSize: "24px",
					fontWeight: 700,
					letterSpacing: "var(--tracking-display)",
				}}
			>
				convrtr
			</Link>

			<button
				ref={toggleRef}
				type="button"
				aria-expanded={open}
				aria-label={open ? "Close menu" : "Open menu"}
				onClick={() => setOpen((wasOpen) => !wasOpen)}
				style={{ background: "transparent", border: "0", padding: "0" }}
			>
				<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d={open ? "M5 5 L19 19 M19 5 L5 19" : "M12 5 V19 M5 12 H19"}
						stroke="currentColor"
						strokeWidth="1"
					/>
				</svg>
			</button>

		</header>

		{open && (
			<nav
				aria-label="Main"
				style={{
					position: "fixed",
					inset: 0,
					zIndex: 99,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: "24px",
					background: "var(--ground)",
				}}
			>
				{links.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						onClick={() => setOpen(false)}
						style={{
							color: "var(--ink)",
							fontSize: "clamp(32px, 8vw, 96px)",
							fontWeight: 700,
							letterSpacing: "var(--tracking-display)",
							lineHeight: "var(--leading-display)",
						}}
					>
						{link.label}
					</Link>
				))}
			</nav>
		)}
		</>
	);
}
```

**The `#ffffff` here is the same difference-blend case as the cursor** — white is the blend operand rather than a palette choice. Task 7 already added this file to `LITERAL_HEX_ALLOWED`; confirm it is there rather than adding it twice.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/SiteHeader.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design/chrome src/design/__tests__
git commit -m "feat(design): add the fixed difference-blended header

One header sits over a white page, a photograph and the dark footer band
without restating its colour anywhere, because difference blending
inverts whatever is behind it.

The overlay nav closes on Escape and hands focus back to the toggle.
Without that, opening it strands a keyboard user inside it."
```

---

## Task 9: SiteFooter, inverted the way the error panel taught us

**Files:**
- Create: `src/design/chrome/SiteFooter.tsx`
- Test: `src/design/__tests__/SiteFooter.test.tsx`

**Interfaces:**
- Consumes: `--terminal`, `--terminal-ink`, `--terminal-rule`.
- Produces: `SiteFooter({ bio, socials, contact, credit })`.

**Plan 1's follow-up document names this task specifically.** `ErrorPanel` originally inverted itself by overriding `color` on every child, and that caused two separate defects: the page's `--ink` stayed behind the panel, so the global `:focus-visible { outline: 1px solid var(--ink) }` drew black on black; and `--rule` was out of reach, so its divider was drawn at full opacity — the heaviest hairline on the site.

The fix was to **redefine the tokens locally on the root** so descendants inherit the inversion. This footer must use the same pattern. Hand-inverting it would reproduce both defects on a band containing several links.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/SiteFooter.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/design/chrome/SiteFooter";

const PROPS = {
	bio: "Every conversion runs in your browser.",
	socials: [{ href: "https://example.com", label: "GitHub" }],
	contact: [{ href: "mailto:a@b.c", label: "Email" }],
	credit: "2026",
};

describe("SiteFooter", () => {
	it("inverts by redefining tokens locally, not by overriding children", () => {
		// ErrorPanel's hand-inversion caused two defects: the global
		// focus-visible outline resolved to the page's --ink and drew black
		// on black, and --rule was unreachable so its divider rendered at
		// full opacity. Redefining the tokens on the root fixes both for
		// every descendant at once.
		const { container } = render(<SiteFooter {...PROPS} />);
		const footer = container.querySelector("footer") as HTMLElement;
		expect(footer.style.getPropertyValue("--ground")).toBe("var(--terminal)");
		expect(footer.style.getPropertyValue("--ink")).toBe("var(--terminal-ink)");
		expect(footer.style.getPropertyValue("--rule")).toBe(
			"var(--terminal-rule)",
		);
	});

	it("paints itself from the redefined tokens", () => {
		const { container } = render(<SiteFooter {...PROPS} />);
		const footer = container.querySelector("footer") as HTMLElement;
		expect(footer.style.background).toBe("var(--ground)");
		expect(footer.style.color).toBe("var(--ink)");
	});

	it("overrides no descendant colour", () => {
		// Any hardcoded child colour is the bug this pattern exists to stop.
		const { container } = render(<SiteFooter {...PROPS} />);
		for (const el of container.querySelectorAll<HTMLElement>("footer *")) {
			expect(el.style.color).toBe("");
		}
	});

	it("renders the brand, bio, socials and contact", () => {
		render(<SiteFooter {...PROPS} />);
		expect(screen.getByText(PROPS.bio)).toBeDefined();
		expect(screen.getByRole("link", { name: "GitHub" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Email" })).toBeDefined();
	});

	it("names its two link groups so they are distinguishable", () => {
		render(<SiteFooter {...PROPS} />);
		expect(screen.getByRole("navigation", { name: /socials/i })).toBeDefined();
		expect(screen.getByRole("navigation", { name: /contact/i })).toBeDefined();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/SiteFooter.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/design/chrome/SiteFooter.tsx`:

```tsx
import Link from "next/link";
import { Hairline } from "@/design/primitives/Hairline";
import { MonoMeta } from "@/design/primitives/MonoMeta";

type LinkItem = { href: string; label: string };

type Props = {
	bio: string;
	socials: LinkItem[];
	contact: LinkItem[];
	credit: string;
};

/**
 * DESIGN.md's terminal band: four columns, a thin top rule, 14px credits.
 *
 * Inverted by redefining the system's own tokens on this root, exactly as
 * ErrorPanel does — and for the reasons ErrorPanel learned the hard way.
 * Overriding colour on each child instead leaves the page's `--ink` behind
 * the band, so the global `:focus-visible { outline: 1px solid var(--ink) }`
 * draws black on black over every link here; and it puts `--rule` out of
 * reach, so any divider renders at full opacity instead of 10%.
 *
 * Redefining the tokens fixes both for every descendant at once, and means
 * nothing inside this file needs to know it is inverted.
 */
export function SiteFooter({ bio, socials, contact, credit }: Props) {
	return (
		<footer
			style={{
				["--ground" as string]: "var(--terminal)",
				["--ink" as string]: "var(--terminal-ink)",
				["--rule" as string]: "var(--terminal-rule)",
				["--ink-muted" as string]: "var(--terminal-ink)",
				background: "var(--ground)",
				color: "var(--ink)",
				padding: "24px",
			}}
		>
			<div
				style={{
					display: "grid",
					gap: "24px",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				}}
			>
				<div style={{ gridColumn: "span 2" }}>
					<p
						style={{
							fontSize: "32px",
							fontWeight: 700,
							letterSpacing: "var(--tracking-display)",
						}}
					>
						convrtr
					</p>
					<p style={{ maxWidth: "32ch" }}>{bio}</p>
				</div>

				<nav aria-label="Socials">
					<MonoMeta as="div">Socials</MonoMeta>
					{socials.map((item) => (
						<Link key={item.href} href={item.href} style={{ display: "block" }}>
							{item.label}
						</Link>
					))}
				</nav>

				<nav aria-label="Contact">
					<MonoMeta as="div">Contact</MonoMeta>
					{contact.map((item) => (
						<Link key={item.href} href={item.href} style={{ display: "block" }}>
							{item.label}
						</Link>
					))}
				</nav>
			</div>

			<Hairline />

			<p style={{ fontSize: "14px" }}>{credit}</p>
		</footer>
	);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/SiteFooter.test.tsx && pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design/chrome src/design/__tests__
git commit -m "feat(design): add the terminal footer band

Inverted by redefining the system's tokens on the root, the way
ErrorPanel does — and for the reasons ErrorPanel learned the hard way.
Overriding colour child by child leaves the page's --ink behind the band,
so the global focus outline draws black on black over every link in it,
and puts --rule out of reach so dividers render at full opacity.

Nothing inside this file needs to know it is inverted."
```

---

## Task 10: The barrel, and a guard against orphans

**Files:**
- Create: `src/design/primitives/index.ts`, `src/design/__tests__/primitives-contract.test.ts`

**Interfaces:**
- Consumes: every primitive and chrome component from Tasks 1–9.
- Produces: `@/design/primitives` as the single import surface Plan 3's templates use.

A primitive that exists but is not exported is invisible to the templates that need it, and nothing would say so. This test walks the directory and asserts the barrel covers it.

- [ ] **Step 1: Write the failing test**

Create `src/design/__tests__/primitives-contract.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BARREL = "src/design/primitives/index.ts";

/**
 * A primitive that exists but is not exported is invisible to the templates
 * that need it, and nothing else in the suite would notice. This walks the
 * directory rather than checking a hand-written list, so adding a file is
 * enough to be covered.
 */
function componentFiles(dir: string): string[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith(".tsx"))
		.map((name) => name.replace(/\.tsx$/, ""));
}

describe("primitives barrel", () => {
	const barrel = readFileSync(BARREL, "utf8");

	it.each(componentFiles("src/design/primitives"))(
		"exports %s",
		(component) => {
			expect(barrel).toContain(`from "./${component}"`);
		},
	);

	it.each(componentFiles("src/design/chrome"))(
		"exports %s from chrome",
		(component) => {
			expect(barrel).toContain(`from "../chrome/${component}"`);
		},
	);

	it("exports at least the nine primitives the spec names", () => {
		// A guard against the barrel being emptied or the directory being
		// moved without this test noticing it now covers nothing.
		expect(componentFiles("src/design/primitives").length).toBeGreaterThanOrEqual(9);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/primitives-contract.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open 'src/design/primitives/index.ts'`.

- [ ] **Step 3: Write the barrel**

Create `src/design/primitives/index.ts`:

```ts
/**
 * The single import surface for the design system's components.
 *
 * Plan 3's templates import from here rather than reaching for individual
 * files, so the set of things a template may compose from is one list in
 * one place — and `primitives-contract.test.ts` fails if a component is
 * added to the directory without joining it.
 */
export { ArrowUpRight } from "./ArrowUpRight";
export { AsymCard } from "./AsymCard";
export { DifferenceCursor } from "./DifferenceCursor";
export { DisplayHeadline } from "./DisplayHeadline";
export { Hairline } from "./Hairline";
export { Marquee } from "./Marquee";
export { MediaFrame } from "./MediaFrame";
export { MonoMeta } from "./MonoMeta";
export { Reveal } from "./Reveal";

export { SiteFooter } from "../chrome/SiteFooter";
export { SiteHeader } from "../chrome/SiteHeader";
```

- [ ] **Step 4: Run the whole gate**

Run: `pnpm run ci`
Expected: PASS — typecheck, lint, unit tests, static build, Playwright.

This is the plan's exit gate. A behavioural e2e failure means a change is wrong, not the test. (Known flake: `src/core/io/__tests__/zip.test.ts` has been seen timing out under parallel load and passing alone — re-run it in isolation before concluding anything about that specific test.)

- [ ] **Step 5: Commit**

```bash
git add src/design/primitives/index.ts src/design/__tests__/primitives-contract.test.ts
git commit -m "feat(design): add the primitives barrel and an orphan guard

The barrel is the set of things a template may compose from, in one
place. The guard walks the directory rather than checking a hand-written
list, so a primitive that exists but was never exported fails the suite
instead of being quietly invisible to the templates that need it."
```

---

## Definition of done

- [ ] `pnpm run ci` passes end to end.
- [ ] All nine primitives plus both chrome components exist, are tested, and are exported from the barrel.
- [ ] `cursor: none` reaches the build output **only** under `body.has-custom-cursor` — never bare on `body` or `*`.
- [ ] `DifferenceCursor` renders nothing on a coarse pointer and adds no class there.
- [ ] `data-marquee` is on the animated tracks, not the container.
- [ ] `SiteFooter` inverts by redefining tokens and overrides no descendant colour.
- [ ] `MonoMeta` is the only consumer of `.meta`, and adds no ad-hoc metadata values.
- [ ] `Reveal` exposes the whole string to assistive technology and hides every fragment.
- [ ] The only hex literals in `src/design` are the two documented difference-blend whites, both allowlisted with their reason.
