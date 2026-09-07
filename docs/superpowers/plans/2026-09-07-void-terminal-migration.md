# Void Terminal Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune the merged design layer from DESIGN.md's monochrome editorial system to DESIGN.v2.md's void terminal glass, so the eleven existing components render the new system without being rebuilt.

**Architecture:** The migration is affordable because every component references tokens rather than literals — 28 files use `--ink` and none of them need editing. So most of this plan is one file changing values, with the guards updated to match. New tokens land first while the old ones still work, the canvas flips in a single deliberate commit, and only then are the retired tokens removed. Two components genuinely conflict with v2 and are rewritten; one is re-anchored; the theme machinery is deleted.

**Tech Stack:** Next.js 16.3 (App Router, `output: "export"`), React 19.2, Tailwind CSS v4, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 + happy-dom + Testing Library, Biome 2.5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-07-void-terminal-glass-design.md`](../specs/2026-09-07-void-terminal-glass-design.md) — §3 (token layer) and §4 (component migration).

**Plan 1 of 5** in the revised sequence. Then: v2's new component families; templates and the route rebuild; samples and live demos; marketing and legal.

**Working directly on `main`** at the user's instruction — no worktree. Commit in small, coherent steps so anything wrong is easy to unpick.

## Global Constraints

- **The palette is closed.** Only these values may appear in `src/design/tokens.css`: `#000000`, `#111315`, `#E4F1EB`, `#FFFFFF`, `#94979E`, `#131415`, `#303236`, `#18191B`, `#34D59A`, `#47D18C`. Nothing else.
- **Mint is rationed.** `--accent` belongs to CTA fills, icon glyphs, code tokens, and the lossless fidelity tint. Never a large fill, never a section background.
- **Mint means two things and shape keeps them apart.** A CTA is a mint **pill fill**; the lossless ring is a mint **stroke tint** on an otherwise ink ring. Filling the ring, or outlining a CTA, collapses the distinction and is a defect.
- **Radius is a closed set:** `0` for everything structural, `4px` for nav-utility controls only, `9999px` for pills and status dots, and `40px`/`100px` for **marquee cards only**.
- **Easing is closed:** `cubic-bezier(0.4, 0, 0.2, 1)`. Durations: `150ms` fades, `200ms` colour, `300ms` compound state, `30s` marquee.
- **Display and headline are weight 400**, not 700. This is a real departure from the old system.
- **Red and amber are not tokens.** v2 admits them only as semantic chart states. A component needing one declares it locally with a comment.
- **One canvas.** No theme toggle, no dual-theme blocks, no `prefers-color-scheme` fallback.
- **`data-testid` values are frozen.** The Playwright suite drives them.
- **The reduced-motion handling survives unchanged**, including `0.01ms` rather than `0` so `animationend` still fires, and the `animation-delay` collapse.
- **Formatting:** Biome — tabs, double quotes. `pnpm exec biome check --write .` fixes formatting.

---

## File Structure

**Modified**

| File | Change |
|---|---|
| `src/design/tokens.css` | The whole migration's centre. Values, new tokens, retired tokens, single canvas. |
| `src/design/__tests__/tokens.test.ts` | Palette allowlist, required-token list, dark-parity tests deleted. |
| `src/design/__tests__/design-system.test.ts` | Radius set, plus a new spacing sweep. |
| `src/components/instrument/ErrorPanel.tsx` | Re-anchored off `--terminal*`. |
| `src/design/chrome/SiteFooter.tsx` | Re-anchored off `--terminal*`. |
| `src/design/primitives/MediaFrame.tsx` | Rewritten — angled fade replaces grayscale hover. |
| `src/design/chrome/SiteHeader.tsx` | Rewritten — v2 navbar. |
| `src/components/instrument/FidelityScore.tsx` | Mint tint on the lossless ring. It already takes a `fidelity: FidelityState` prop, added when the ring was moved off a numeric threshold — the tint keys off that, not off the score. |
| `src/app/layout.tsx` | Theme machinery removed; Geist Mono. |

**Deleted**

`src/lib/theme.ts` · `src/components/ThemeScript.tsx` · `src/components/instrument/ThemeToggle.tsx` · `src/components/instrument/__tests__/ThemeToggle.test.tsx` · `src/lib/__tests__/theme.test.ts`

---

## Task 1: Add v2's new tokens alongside the old ones

**Files:**
- Modify: `src/design/tokens.css`
- Test: `src/design/__tests__/tokens.test.ts`

**Interfaces:**
- Produces: `--surface`, `--surface-alt`, `--ink-inverse`, `--rule-subtle`, `--accent`, `--accent-hover`, `--space-base`, `--gap-sm`, `--gap-md`, `--gap-lg`, `--section-pad`, `--max-width`, `--grid-gap`, `--navbar-height`. Every later task and later plan reads these.

Additive only. The old tokens keep their current values, so nothing renders differently and nothing breaks. This is the same strangler shape the monochrome foundation used: author the new layer complete before flipping anything onto it.

- [ ] **Step 1: Widen the palette allowlist**

`src/design/__tests__/tokens.test.ts:86` currently holds the monochrome set. Replace it with v2's:

```ts
const ALLOWED_COLOURS = new Set([
	"#000000", // ground — v2 puts it at ~63% of the page
	"#111315", // surface, raised panels
	"#e4f1eb", // surface-alt, the one pale band
	"#ffffff", // ink
	"#94979e", // ink-muted, the gray continuation clause
	"#131415", // ink-inverse, text on the pale band
	"#303236", // rule
	"#18191b", // rule-subtle
	"#34d59a", // accent, rationed
	"#47d18c", // accent-hover
]);
```

- [ ] **Step 2: Add the required-token assertions**

In the same file, extend the `required` array at `:268` with the new names — leave the existing entries alone for now, they are removed in later tasks:

```ts
		"--surface",
		"--surface-alt",
		"--ink-inverse",
		"--rule-subtle",
		"--accent",
		"--accent-hover",
		"--space-base",
		"--gap-sm",
		"--gap-md",
		"--gap-lg",
		"--section-pad",
		"--max-width",
		"--grid-gap",
		"--navbar-height",
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts`
Expected: FAIL — fourteen `declares %s` cases fail because none of those properties exist yet. The palette-closure test still passes, because widening an allowlist cannot fail a corpus that was already inside the narrower one.

- [ ] **Step 4: Add the tokens**

In `src/design/tokens.css`, inside the `:root` block, after the existing colour tokens:

```css
	/*
	 * DESIGN.v2.md's palette, added alongside the outgoing monochrome set.
	 * Nothing consumes these yet — the canvas flips in a later task, once
	 * the whole layer is present and testable. This is the same shape the
	 * monochrome token layer was built in: author it complete, wire it up
	 * once.
	 */
	--surface: #111315;
	--surface-alt: #e4f1eb;
	--ink-inverse: #131415;
	--rule-subtle: #18191b;
	--accent: #34d59a;
	--accent-hover: #47d18c;

	/*
	 * The spacing and layout scale the monochrome system never had — its
	 * absence was the top item in that plan's follow-ups, on the grounds
	 * that six templates written against literals would not be
	 * recoverable. v2 supplies it outright.
	 */
	--space-base: 8px;
	--gap-sm: 12px;
	--gap-md: 24px;
	--gap-lg: 80px;
	--section-pad: 240px;
	--max-width: 1600px;
	--grid-gap: 128px;
	--navbar-height: 64px;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts && pnpm test && pnpm lint`
Expected: PASS. The running site is unchanged — nothing references the new tokens yet.

- [ ] **Step 6: Commit**

```bash
git add src/design/tokens.css src/design/__tests__/tokens.test.ts
git commit -m "feat(design): add v2's palette and scale alongside the old tokens

Additive, so nothing renders differently and nothing breaks. The canvas
flips in one deliberate commit later, once the whole layer is present
and testable — the same shape the monochrome layer was built in.

Includes the spacing and layout scale the previous system never had.
Its absence was the top item in that plan's follow-ups: colour, radius,
easing and duration were closed sets with sweeps behind them, and
spacing was not, so two chrome components had already produced three
ad-hoc scales."
```

---

## Task 2: Flip the canvas

**Files:**
- Modify: `src/design/tokens.css`
- Test: `src/design/__tests__/tokens.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `--ground`, `--ink`, `--ink-muted`, `--rule` at v2's values, in a single mode.

**This is the visible moment.** Twenty-eight files reference `--ink` and none of them change — the canvas inverts underneath them because they reference the name. That is the whole argument for token discipline, cashed in.

The dual-theme blocks go with it. v2 describes one canvas; its pale band is a section treatment its own guardrail calls *"a rare inversion, not a default alternate background"*, not a mode.

- [ ] **Step 1: Delete the dark-parity tests**

`src/design/__tests__/tokens.test.ts` opens with a `describe("dark-theme parity")` block asserting the two dark declarations stay in step. There will be no dark blocks. Delete that entire `describe`, plus the `declarations()` and `block()` helpers and the `attributeDark`/`mediaDark` constants that only it uses.

Keep everything else in the file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts`
Expected: PASS, with three fewer tests. Deleting a test cannot fail — the RED here is Step 4's, when the values change.

- [ ] **Step 3: Flip the values and delete the theme blocks**

In `src/design/tokens.css`:

```css
	--ground: #000000;
	--ink: #ffffff;
	--ink-muted: #94979e;
	--rule: #303236;
```

Delete `--ink-faint` — v2 has no third text tier, and it had zero consumers and an unresolved contrast ceiling (4.43:1 on white, below AA) that the previous plan never discharged. Remove it from the `required` array too.

Then delete both dark blocks entirely: the `:root[data-theme="dark"]` rule and the `@media (prefers-color-scheme: dark)` fallback. Replace the comment above them with one explaining there is one canvas now.

Leave `color-scheme: light` — change it to `color-scheme: dark`, so form controls and scrollbars the browser paints match the canvas.

- [ ] **Step 4: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

Then look at it. Run `pnpm dev`, open `http://localhost:3000`, and confirm the site is genuinely black with white text — every component inverting for free. This is the one step where a screenshot is worth more than an assertion.

- [ ] **Step 5: Commit**

```bash
git add src/design/tokens.css src/design/__tests__/tokens.test.ts
git commit -m "feat(design): flip the canvas to v2's black

Twenty-eight files reference --ink and not one of them changes. The
canvas inverts underneath them because they reference the name rather
than the value — which is the entire argument for the token discipline
the previous two plans held to, cashed in here in one commit.

The dual-theme blocks go with it. v2 describes one canvas, and its pale
band is a section treatment its own guardrail calls a rare inversion
rather than a default alternate background.

--ink-faint is deleted rather than retuned: v2 has no third text tier,
it had zero consumers, and its 4.43:1 on white was below AA with the
contrast ceiling never discharged."
```

---

## Task 3: Retire `--terminal*` and re-anchor the two inverted blocks

**Files:**
- Modify: `src/design/tokens.css`, `src/components/instrument/ErrorPanel.tsx`, `src/design/chrome/SiteFooter.tsx`
- Test: `src/design/__tests__/tokens.test.ts`, `src/design/__tests__/SiteFooter.test.tsx`, `src/components/instrument/__tests__/ErrorPanel.test.tsx`

**Interfaces:**
- Consumes: `--surface-alt`, `--ink-inverse`, `--rule-subtle` from Task 1.
- Produces: the inversion pattern re-pointed. Later plans copy `SiteFooter`, not `ErrorPanel` — see the note below.

The local-token-redefinition pattern survives intact and is the right pattern. It was chosen because hand-inverting left the page's `--ink` in scope, so the global `:focus-visible { outline: 1px solid var(--ink) }` drew black on black over three focusable controls. Only the *direction* flips: the site is black now, so the inverted block is the light one.

**Copy `SiteFooter`, not `ErrorPanel`.** The previous plan's whole-branch review established that `ErrorPanel` carries dead code — it restates `color` on each button, justified by a comment claiming a `<button>` does not inherit colour. That is false in this project: Tailwind preflight sets `color: inherit` on `button`. Delete those restatements while you are in the file.

- [ ] **Step 1: Update the tests**

In `SiteFooter.test.tsx`, the token-redefinition assertions currently expect `var(--terminal)` / `var(--terminal-ink)` / `var(--terminal-rule)`. Change them to `var(--surface-alt)` / `var(--ink-inverse)` / `var(--rule-subtle)`.

In `ErrorPanel.test.tsx`, do the same, and note that the "no descendant colour" sweep should now pass for the buttons too, once their restatements are removed.

Remove `--terminal`, `--terminal-ink` and `--terminal-rule` from the `required` array in `tokens.test.ts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/design/__tests__/SiteFooter.test.tsx src/components/instrument/__tests__/ErrorPanel.test.tsx`
Expected: FAIL — both components still write `var(--terminal)`.

- [ ] **Step 3: Re-anchor both components**

In both `SiteFooter.tsx` and `ErrorPanel.tsx`, change the root's redefinition block:

```tsx
				["--ground" as string]: "var(--surface-alt)",
				["--ink" as string]: "var(--ink-inverse)",
				["--rule" as string]: "var(--rule-subtle)",
				["--ink-muted" as string]: "var(--ink-inverse)",
```

In `ErrorPanel.tsx` only, delete the `color: "var(--ink)"` restatements on each button and the comment justifying them. Replace the comment with one recording why they were wrong — Tailwind preflight sets `color: inherit` on `button`, so the restatement was always redundant.

Delete `--terminal`, `--terminal-ink` and `--terminal-rule` from `tokens.css`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design/tokens.css src/components/instrument/ErrorPanel.tsx src/design/chrome/SiteFooter.tsx src/design/__tests__ src/components/instrument/__tests__
git commit -m "feat(design): re-anchor the inverted blocks to the pale band

The pattern survives; only its direction flips. The site is black now,
so the inverted block is the light one — surface-alt over ink-inverse
rather than terminal over terminal-ink.

Also removes ErrorPanel's per-button colour restatements. The comment
justifying them claimed a button does not inherit colour from its
parent, which is false in this project: Tailwind preflight sets
color: inherit on button. SiteFooter's stricter no-descendant-colour
form was always the correct expression of the pattern, and is now the
one to copy."
```

---

## Task 4: The radius set

**Files:**
- Modify: `src/design/tokens.css`, `src/design/__tests__/design-system.test.ts`

**Interfaces:**
- Produces: `--radius: 0`, `--radius-control: 4px`, `--radius-pill: 9999px`; `--radius-card`/`--radius-card-lg` unchanged but scoped to the marquee.

v2 is emphatic and its own frontmatter disagrees with it. Prose: *"All corners in this system are 0px except pills and the tiny status dots."* Guardrail: *"Never round the feature-grid or panel cards — 0px radius is structural."* All six of its card and button components: `radius: 0px`. One frontmatter key says `card: 4px`. **The spec ruled 0px on weight of evidence.**

Every current `--radius` consumer becomes square, which is correct: they are panels, tables and drop fields, all structural.

- [ ] **Step 1: Update the radius sweep**

`src/design/__tests__/design-system.test.ts:35` reads `const ALLOWED_RADII = new Set([0, 4, 40, 100]);`. That stays — the set is unchanged, because 4 is still legal for nav-utility controls and 40/100 for marquee cards. Add a comment recording what each value is now for, since the meanings have changed:

```ts
/**
 * v2's radius set, and what each value is permitted for.
 *
 *   0    everything structural — cards, panels, grids, media. v2's
 *        guardrail calls this structural, and its prose says all corners
 *        are 0px except pills and status dots.
 *   4    nav-utility controls only (v2 gives them 23px height, 0/14px
 *        padding). Not cards — v2's frontmatter says `card: 4px`, but its
 *        prose, its guardrail and all six of its card components say 0px.
 *   40   marquee cards only, from v2's own Special Components.
 *   100  marquee cards only, likewise.
 *
 * The pill (9999px) is expressed as a `%` or as `--radius-pill` and is
 * exempted by the `%` branch below.
 */
```

- [ ] **Step 2: Add a test pinning the new meanings**

Append to the `radius system` describe:

```ts
	it("makes structural radius zero, not four", () => {
		// v2's frontmatter and its prose disagree; the spec ruled for the
		// prose, the guardrail, and all six of its card components. This
		// pins that ruling so a future reader following the frontmatter
		// fails rather than quietly re-rounding every panel.
		expect(tokens).toMatch(/--radius:\s*0\s*;/);
		expect(tokens).toMatch(/--radius-control:\s*4px/);
		expect(tokens).toMatch(/--radius-pill:\s*9999px/);
	});
```

Add `const tokens = readFileSync("src/design/tokens.css", "utf8");` at the top of the file if it is not already present.

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/design-system.test.ts`
Expected: FAIL — `--radius` is still `4px` and neither new token exists.

- [ ] **Step 4: Change the tokens**

```css
	--radius: 0;
	--radius-control: 4px;
	--radius-pill: 9999px;
	--radius-card: 40px;
	--radius-card-lg: 100px;
```

Update the comment above them: `--radius-card*` are for marquee cards only, per v2's Special Components, and the guardrail forbidding rounded cards is specifically about feature-grid and panel cards.

- [ ] **Step 5: Run everything and look at it**

Run: `pnpm test && pnpm lint`
Expected: PASS.

Then `pnpm dev` and confirm the panels, tables and drop fields are square. Every `--radius` consumer just changed shape.

- [ ] **Step 6: Commit**

```bash
git add src/design/tokens.css src/design/__tests__/design-system.test.ts
git commit -m "feat(design): make structural radius zero

v2's frontmatter says cards are 4px. Its prose says all corners are 0px
except pills and status dots, its guardrail calls 0px structural, and
all six of its card and button components specify 0px. One key against
prose, a guardrail and six components — the spec ruled for the majority
and this pins that ruling, so a future reader following the frontmatter
fails rather than quietly re-rounding every panel.

The marquee cards keep 100px and 40px. v2's Special Components mandate
them verbatim, and its guardrail is specifically about feature-grid and
panel cards, which marquee cards are not."
```

---

## Task 5: Motion

**Files:**
- Modify: `src/design/tokens.css`, `src/design/primitives/DifferenceCursor.tsx`, `src/design/primitives/primitives.css`
- Test: `src/design/__tests__/tokens.test.ts`

**Interfaces:**
- Produces: `--ease` at v2's curve; `--dur-fade`, `--dur-hover`, `--dur-state`, `--dur-marquee`. `--dur-min` and `--dur-reveal` are retired.

v2 inverts the old system's motion entirely: fast and diagrammatic rather than long and editorial. The old 500ms hover floor was `DESIGN.md`'s rule and v2 contradicts it directly.

**The reduced-motion handling does not change**, including the two details it cost two review rounds to get right: `0.01ms` rather than `0` so `animationend` still fires, and the `animation-delay` collapse without which staggered reveals still play out in full.

- [ ] **Step 1: Update the required-token list and the easing assertion**

In `tokens.test.ts`, replace `--dur-min` and `--dur-reveal` in the `required` array with `--dur-fade` and `--dur-state`. Update the single-easing assertion to expect v2's curve:

```ts
	it("declares exactly one easing, and it is v2's", () => {
		expect(css).toMatch(/--ease:\s*cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
		const easings = [...css.matchAll(/cubic-bezier\([^)]*\)/g)].map((m) => m[0]);
		expect(new Set(easings).size).toBe(1);
	});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts`
Expected: FAIL — the easing is still `cubic-bezier(0.16, 1, 0.3, 1)` and the two new duration tokens do not exist.

- [ ] **Step 3: Change the tokens**

```css
	--ease: cubic-bezier(0.4, 0, 0.2, 1);
	--dur-fade: 150ms;
	--dur-hover: 200ms;
	--dur-state: 300ms;
	--dur-marquee: 30s;
```

Update the comment: v2's motion is functional and diagrammatic, reinforcing the terminal character rather than decorating it — the opposite of the previous system's premium-feel easing.

- [ ] **Step 4: Repoint the two consumers of the retired tokens**

`DifferenceCursor.tsx` transitions `scale` over `var(--dur-min)`. Change to `var(--dur-state)` — v2's compound-state duration, which a hover scale is.

`primitives.css` uses `--dur-reveal` for the reveal animation and `--dur-min` for the arrow fade. Change the reveal to `var(--dur-state)` and the arrow to `var(--dur-fade)` — v2 puts opacity fades at 150ms.

- [ ] **Step 5: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS. The `DifferenceCursor` test asserting the transition string will need its expectation updated to `scale var(--dur-state) var(--ease)`.

- [ ] **Step 6: Commit**

```bash
git add src/design/tokens.css src/design/primitives src/design/__tests__
git commit -m "feat(design): retune motion to v2's fast, diagrammatic curve

v2 inverts the previous system entirely — 150ms fades, 200ms colour,
300ms compound state, on cubic-bezier(0.4, 0, 0.2, 1). The 500ms hover
floor was DESIGN.md's rule and v2 contradicts it directly, so --dur-min
is retired rather than retuned.

The reduced-motion handling is untouched, including the two details it
cost two review rounds to establish: 0.01ms rather than 0 so
animationend still fires, and the animation-delay collapse without
which a staggered reveal still plays out in full for someone who asked
for less movement."
```

---

## Task 6: Type

**Files:**
- Modify: `src/design/tokens.css`, `src/design/primitives/DisplayHeadline.tsx`
- Test: `src/design/__tests__/tokens.test.ts`, `src/design/__tests__/DisplayHeadline.test.tsx`

**Interfaces:**
- Produces: `--display-size`, `--display-tracking`, `--display-leading`, `--headline-size`, `--headline-tracking`, `--body-size`, `--body-leading`, `--label-size`, `--label-tracking`, `--label-weight`, `--mono-size`.

Two real changes hide in here, and neither is a bare value swap.

**Weight goes from 700 to 400.** v2 specifies weight 400 for both display sizes. The previous system's display type was 700. This is the single most visible typographic difference.

**Size goes from fluid to fixed.** `12vw` becomes `68px`. At 375px wide, `12vw` was 45px; a fixed 68px will overflow. **A fluid-to-fixed swap without a responsive answer is a regression**, so this task owes one: `clamp(40px, 8vw, 68px)`, which reaches v2's 68px at and above ~850px and degrades gracefully below. Record that the clamp is an extension — v2 states the desktop value and is silent on smaller viewports.

- [ ] **Step 1: Update the tests**

In `tokens.test.ts`, replace the type tokens in `required` with the eleven names above (dropping `--mono-tracking`, which was `DESIGN.md`'s 0.1em uppercase treatment and has no v2 equivalent).

In `DisplayHeadline.test.tsx`, the metrics test currently expects `var(--display-size)` etc. Those names survive; add an assertion for the weight:

```ts
	it("renders display type at weight 400, not 700", () => {
		// v2 specifies 400 for both display sizes. The previous system used
		// 700, and this is the most visible typographic difference between
		// them — worth pinning rather than leaving to a token nobody reads.
		const { container } = render(<DisplayHeadline text="a" />);
		expect((container.querySelector("h1") as HTMLElement).style.fontWeight).toBe(
			"400",
		);
	});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/design/__tests__/tokens.test.ts src/design/__tests__/DisplayHeadline.test.tsx`
Expected: FAIL — the new token names do not exist, and `DisplayHeadline` still sets `fontWeight: 700`.

- [ ] **Step 3: Change the tokens**

```css
	/*
	 * v2's type. Display and headline are weight 400 — the previous system
	 * used 700, and this is the most visible typographic difference.
	 *
	 * The display size is a clamp rather than v2's bare 68px. v2 states a
	 * desktop value and is silent on smaller viewports; a fixed 68px
	 * overflows a 375px screen. The clamp reaches 68px at roughly 850px and
	 * degrades below it. Recorded as an extension, not a restatement.
	 */
	--display-size: clamp(40px, 8vw, 68px);
	--display-tracking: -2.7px;
	--display-leading: 1.13;
	--headline-size: clamp(32px, 6vw, 48px);
	--headline-tracking: -1.9px;
	--body-size: 16px;
	--body-leading: 1.5;
	--label-size: 16px;
	--label-tracking: -0.4px;
	--label-weight: 500;
	--mono-size: 13px;
```

Remove `--tracking-display`, `--leading-display`, `--tracking-body`, `--leading-body` and `--mono-tracking`, updating their consumers to the new names. `grep -rn -- "--tracking-display\|--leading-display\|--tracking-body\|--leading-body\|--mono-tracking" src` finds them all.

- [ ] **Step 4: Change `DisplayHeadline`'s weight**

`fontWeight: 700` becomes `fontWeight: 400`, and its size/tracking/leading references move to the new token names.

- [ ] **Step 5: Run everything and look at it**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

Then `pnpm dev`, and check a headline at a narrow viewport as well as a wide one. The clamp is the part a test cannot judge.

- [ ] **Step 6: Commit**

```bash
git add src/design/tokens.css src/design/primitives/DisplayHeadline.tsx src/design/__tests__
git commit -m "feat(design): retune type to v2's scale

Weight drops from 700 to 400 for both display sizes — v2 is explicit,
and it is the most visible typographic difference between the two
systems.

The display size is a clamp rather than v2's bare 68px. v2 states a
desktop value and says nothing about smaller viewports, and a fixed
68px overflows a 375px screen, so a fluid-to-fixed swap without a
responsive answer would have been a regression. The clamp reaches 68px
around 850px and degrades below it; recorded in the token comment as an
extension rather than a restatement of v2."
```

---

## Task 7: Delete the theme machinery

**Files:**
- Delete: `src/lib/theme.ts`, `src/lib/__tests__/theme.test.ts`, `src/components/ThemeScript.tsx`, `src/components/instrument/ThemeToggle.tsx`, `src/components/instrument/__tests__/ThemeToggle.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. This removes.

v2 describes one canvas. The toggle, its pre-hydration script and its storage helper have nothing left to switch between.

**This removes shipped, user-facing functionality.** The spec records it at §2.2 along with v2's own derivation for restoring a light mode later — `#E4F1EB` ground with `#131415` ink — should that ever be wanted.

- [ ] **Step 1: Find every reference**

Run: `grep -rn "ThemeToggle\|ThemeScript\|lib/theme\|THEME_STORAGE_KEY\|data-theme" src e2e`

Expected: `layout.tsx` renders `<ThemeScript />` and the header block renders `<ThemeToggle />`; `tokens.css` may still carry a `[data-theme]` selector; `globals.css` has a `@custom-variant dark` declaration keyed on `[data-theme="dark"]`.

- [ ] **Step 2: Delete the files and their references**

Delete the five files listed above. In `layout.tsx`, remove both imports, the `<ThemeScript />` element, the `<ThemeToggle />` element, and `suppressHydrationWarning` from `<html>` — it existed only because the theme script mutated the attribute before hydration.

In `globals.css`, delete the `@custom-variant dark` block. It redefined Tailwind's `dark:` variant to agree with `[data-theme]`; with one canvas there is no variant to redefine, and leaving it would silently make every `dark:` utility dead.

- [ ] **Step 3: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS. Test count drops — `ThemeToggle.test.tsx` and `theme.test.ts` are gone.

- [ ] **Step 4: Confirm nothing dangles**

Run: `grep -rn "data-theme\|prefers-color-scheme" src`
Expected: only the `prefers-reduced-motion` block, which is unrelated. Any `data-theme` hit is a leftover.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(design): remove the theme machinery

v2 describes one canvas, so the toggle, its pre-hydration script and its
storage helper have nothing left to switch between. Its one pale band is
a section treatment its own guardrail calls a rare inversion, not a mode.

This removes shipped, user-facing functionality, which is recorded in
the spec rather than buried — along with v2's own derivation if a light
mode is ever wanted again.

Also drops globals.css's @custom-variant dark. It redefined Tailwind's
dark: variant to agree with [data-theme]; with one canvas there is no
variant to redefine, and leaving it would make every dark: utility
silently dead."
```

---

## Task 8: Geist Mono

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `src/design/__tests__/design-system.test.ts`

**Interfaces:**
- Produces: `--font-mono` resolving to Geist Mono.

v2 names GeistMono as the system's accent face — the one that signals "developer tool" wherever it appears, in code panels, terminal timestamps and shell-command CTAs.

**Verify before you swap, and be willing to stop.** Two things must hold. Geist Mono must be reachable through `next/font/google`, because an external stylesheet link would put a third-party request on every page of a product whose entire claim is that nothing leaves your device. And a counting readout must render without shifting — Geist Mono is a true monospace so its digits are fixed-width by construction, but that should be seen rather than assumed.

**If either fails, keep IBM Plex Mono and report it.** A deviation recorded is better than a privacy guarantee quietly broken.

- [ ] **Step 1: Update the typeface test**

`design-system.test.ts` has a `typeface` describe asserting Inter for sans and IBM Plex Mono for mono. Change the mono assertions:

```ts
	it("uses Geist Mono for the mono face", () => {
		// v2 names GeistMono as the system's accent face — the one that
		// signals "developer tool" in code panels, terminal timestamps and
		// shell-command CTAs.
		expect(layout).toMatch(/Geist_Mono/);
		expect(layout).not.toMatch(/IBM_Plex_Mono/);
	});
```

Leave the self-hosting assertion (`not.toMatch(/fonts\.googleapis\.com/)`) exactly as it is — it applies to both faces.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/design-system.test.ts`
Expected: FAIL — `layout.tsx` still imports `IBM_Plex_Mono`.

- [ ] **Step 3: Swap the face**

In `src/app/layout.tsx`:

```tsx
import { Geist_Mono, Inter } from "next/font/google";
```

```tsx
const geistMono = Geist_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	display: "swap",
});
```

Update the `<html>` className to use `geistMono.variable`.

- [ ] **Step 4: Verify self-hosting against the real build**

Run: `pnpm build`, then:

```bash
grep -rl "fonts.googleapis.com\|fonts.gstatic.com" out/ || echo "no font CDN references in the build output"
```

Expected: `no font CDN references in the build output`. **If any appear, stop and report BLOCKED** — the font is being linked rather than inlined and the privacy claim is broken.

- [ ] **Step 5: Verify the digits do not shift**

Run `pnpm dev`, open any converter page, drop a file and watch the byte and elapsed readouts count. The digits must not jitter. Geist Mono is a true monospace so they should not, but this is the property the previous face was kept for.

- [ ] **Step 6: Run everything and commit**

Run: `pnpm test && pnpm lint && pnpm typecheck`

```bash
git add src/app/layout.tsx src/design/__tests__/design-system.test.ts
git commit -m "feat(design): set the mono face to Geist Mono

v2 names it as the system's accent face — the one that signals
'developer tool' in code panels, terminal timestamps and shell-command
CTAs.

Verified against the real build output rather than assumed: no
fonts.googleapis.com or fonts.gstatic.com reference reaches out/, so
next/font inlined the face and the zero-third-party-request guarantee
holds. Counting readouts checked by eye for digit shift, which is the
property the previous face was kept for."
```

---

## Task 9: Rewrite `MediaFrame`

**Files:**
- Modify: `src/design/primitives/MediaFrame.tsx`, `src/design/primitives/primitives.css`
- Test: `src/design/__tests__/MediaFrame.test.tsx`

**Interfaces:**
- Consumes: `--ground`, `--ease`, `--dur-hover`.
- Produces: `MediaFrame({ children })` — same signature, different behaviour.

v2 replaces the grayscale→colour hover with *"Images within should be fading to theme on an angle by default."* That is a different mechanism: a directional mask blending the image into the canvas, not a filter removed on interaction.

The old component's reduced-motion exception — suppress the transform, not just the duration — was written for a scale that no longer exists. It retires with it.

**The framing changes too.** Under the old system this was *the only element permitted to show colour*, and colour appeared on hover. Under v2 the image is simply present, fading into the ground at its edge. Colour is no longer rationed to a hover state.

- [ ] **Step 1: Rewrite the tests**

Replace the contents of `MediaFrame.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaFrame } from "@/design/primitives/MediaFrame";

describe("MediaFrame", () => {
	it("fades into the canvas on an angle by default", () => {
		// v2: "Images within should be fading to theme on an angle by
		// default." The fade is the resting state, not a hover reveal — the
		// previous system's grayscale-until-hover belonged to a brief that
		// rationed colour, and v2 does not.
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.getPropertyValue("mask-image")).toContain("linear-gradient");
		expect(el.style.getPropertyValue("mask-image")).toMatch(/\d+deg/);
	});

	it("applies no grayscale filter", () => {
		// The old mechanism, explicitly gone.
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		expect((container.firstElementChild as HTMLElement).style.filter).toBe("");
	});

	it("is marked so the stylesheet can reach it", () => {
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

Run: `pnpm exec vitest run src/design/__tests__/MediaFrame.test.tsx`
Expected: FAIL — the component sets `filter: grayscale(100%)` and no mask.

- [ ] **Step 3: Rewrite the component**

```tsx
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

/**
 * v2's media treatment: the image fades into the canvas on an angle, as a
 * resting state rather than a hover reveal.
 *
 * This replaces the previous system's grayscale-until-hover entirely. That
 * mechanism existed because DESIGN.md rationed colour to a single
 * interaction — v2 does not ration it that way, so the image is simply
 * present, dissolving into the ground at its trailing edge instead of
 * ending on a hard rectangle.
 *
 * The mask is declared here rather than in the stylesheet because the angle
 * is the component's defining property and belongs where a reader looks
 * first. `-webkit-mask-image` rides alongside for Safari, which still
 * requires the prefix for mask shorthand.
 */
export function MediaFrame({ children }: Props) {
	const mask = "linear-gradient(160deg, #000 55%, transparent 100%)";

	return (
		<div
			data-media
			style={{
				maskImage: mask,
				WebkitMaskImage: mask,
			}}
		>
			{children}
		</div>
	);
}
```

**On the `#000` inside the mask:** a mask gradient's colour is an alpha channel, not a paint — black means opaque, transparent means cut away. It is not a palette value and must not become a token, because a token would change with the design and silently alter the mask's opacity. Add `src/design/primitives/MediaFrame.tsx` to `LITERAL_HEX_ALLOWED` in `tokens.test.ts` with exactly that reason.

- [ ] **Step 4: Remove the old rules**

In `primitives.css`, delete the `[data-media]:hover` / `:focus-within` rules and the `prefers-reduced-motion` block that suppressed their transform. Both governed a mechanism that no longer exists.

- [ ] **Step 5: Run everything and look at it**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

Then `pnpm dev` and confirm an image dissolves into the black rather than ending on a hard edge.

- [ ] **Step 6: Commit**

```bash
git add src/design/primitives src/design/__tests__
git commit -m "feat(design): fade media into the canvas on an angle

v2 replaces grayscale-until-hover with an image that fades to theme on
an angle by default. That is a different mechanism, not a retuning: a
directional mask dissolving the image into the ground, with no hover
state at all.

The old reduced-motion exception goes with it. It suppressed a 1.05x
scale under prefers-reduced-motion because an instant jump in size is
still movement — correct reasoning about a transform that no longer
exists."
```

---

## Task 10: Rewrite `SiteHeader`

**Files:**
- Modify: `src/design/chrome/SiteHeader.tsx`
- Test: `src/design/__tests__/SiteHeader.test.tsx`

**Interfaces:**
- Consumes: `--ground`, `--ink`, `--rule`, `--radius-control`, `--radius-pill`, `--navbar-height`.
- Produces: `SiteHeader({ links, cta })` where `cta` is `{ href: string; label: string }`.

v2 specifies a 64px sticky edge-to-edge navbar at `#000000` with 0px corners, a logo, nav-utility controls as transparent 4px-radius 23px-tall buttons, a text log-in link, and a `#FFFFFF` pill CTA at 36px. That is not a difference-blended bar with a full-screen overlay.

**Two things must survive the rewrite, and both were expensive to establish.**

The **focus containment**: the previous overlay was given a trap across `[wordmark, toggle, ...links]` plus a body-scroll lock, because a full-viewport opaque overlay otherwise lands focus on content the user cannot see. If v2's navbar keeps any overlay or dropdown that covers content, it inherits that requirement. If it does not — if the links sit inline in a 64px bar — the trap is not needed and should be removed rather than carried along dead.

The **empty-links closure**: the trap's guard must not silently stop intercepting when `links` is empty.

**Decide which shape v2 actually asks for and say so in your report.** v2 describes ~36 interactive items grouped into dropdowns, which implies inline nav with dropdown panels rather than a full-screen overlay. A dropdown that covers content still needs containment; one that does not, does not.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/design/chrome/SiteHeader";

const LINKS = [
	{ href: "/tools", label: "Tools" },
	{ href: "/blog", label: "Blog" },
];
const CTA = { href: "/tools", label: "Start converting" };

describe("SiteHeader", () => {
	it("is a sticky edge-to-edge bar at v2's height", () => {
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		const header = container.querySelector("header") as HTMLElement;
		expect(header.style.position).toBe("sticky");
		expect(header.style.height).toBe("var(--navbar-height)");
		expect(header.style.background).toBe("var(--ground)");
	});

	it("has square corners, per v2's structural zero radius", () => {
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		const header = container.querySelector("header") as HTMLElement;
		expect(header.style.borderRadius).toBe("");
	});

	it("does not blend — v2's bar states its own colour", () => {
		// The previous system used mix-blend-mode: difference so one header
		// could sit over a white page and a dark footer. v2 has one black
		// canvas, so the bar simply is black.
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		expect(
			(container.querySelector("header") as HTMLElement).style.mixBlendMode,
		).toBe("");
	});

	it("renders the CTA as a pill", () => {
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const cta = screen.getByRole("link", { name: CTA.label });
		expect(cta.style.borderRadius).toBe("var(--radius-pill)");
	});

	it("renders the wordmark as a link home", () => {
		render(<SiteHeader links={LINKS} cta={CTA} />);
		expect(
			screen.getByRole("link", { name: "convrtr" }).getAttribute("href"),
		).toBe("/");
	});

	it("renders every nav link", () => {
		render(<SiteHeader links={LINKS} cta={CTA} />);
		for (const link of LINKS) {
			expect(screen.getByRole("link", { name: link.label })).toBeDefined();
		}
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/design/__tests__/SiteHeader.test.tsx`
Expected: FAIL — the current header is `position: fixed` with `mixBlendMode: difference` and takes no `cta` prop.

- [ ] **Step 3: Write the component**

Build v2's bar: `<header>` at `position: sticky`, `top: 0`, `height: var(--navbar-height)`, `background: var(--ground)`, a bottom `1px solid var(--rule)`, `padding: 0 var(--gap-md)`, flex with the wordmark left and nav plus CTA right. Nav links use `--label-size`/`--label-tracking`/`--label-weight`. The CTA is a `#FFFFFF`-filled pill with `--ground` text at 36px — add `SiteHeader.tsx` to `LITERAL_HEX_ALLOWED` only if you use a literal; prefer `var(--ink)` as the fill, which is `#FFFFFF`, and no allowlist entry is needed.

If the links fit inline, this is a server component: **remove `"use client"` and the focus trap entirely.** Update the server-component allowlist in `primitives-contract.test.ts` accordingly, so the file that no longer needs the directive stops being covered for it — that allowlist is bidirectional and will fail if an entry stops declaring it.

- [ ] **Step 4: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design/chrome/SiteHeader.tsx src/design/__tests__ src/design/__tests__/primitives-contract.test.ts
git commit -m "feat(design): rebuild the header as v2's sticky navbar

64px, edge-to-edge, black, square corners, wordmark left, nav and a
white pill CTA right. The difference blend goes: it existed so one
header could stay legible over a white page and a dark footer band, and
v2 has one black canvas, so the bar simply is black.

The overlay's focus trap and scroll lock go with it, since v2's links
sit inline and cover nothing. They were right for a full-viewport opaque
overlay and would be dead weight here — carrying them along would leave
a keydown handler trapping Tab on a page with nothing to trap."
```

---

## Task 11: The mint fidelity tint, the spacing sweep, and the exit gate

**Files:**
- Modify: `src/components/instrument/FidelityScore.tsx`, `src/design/__tests__/design-system.test.ts`
- Test: `src/components/instrument/__tests__/FidelityScore.test.tsx`

**Interfaces:**
- Consumes: `--accent`, and the spacing scale from Task 1.

Two things, both closing spec requirements.

**The mint tint.** Fidelity keeps stroke as its primary encoding — solid whole, dashed qualified — so it survives greyscale, colour-blindness and print. Mint reinforces `lossless` only. **The shapes must stay apart:** a CTA is a mint pill *fill*; this is a mint *stroke tint* on an otherwise ink ring. Filling the ring collapses the two meanings and is a defect the spec names.

**The spacing sweep.** Colour, radius, easing and duration all have guards. Spacing did not, and its absence was the top follow-up from the previous plan. Now that the scale exists, it gets one.

- [ ] **Step 1: Write the failing tests**

Add to `FidelityScore.test.tsx`:

```tsx
	it("tints only the lossless ring with mint", () => {
		// Stroke stays the primary encoding — mint reinforces, never
		// carries. Every other state stays ink, so fidelity survives
		// greyscale and colour-blindness.
		const stroke = (fidelity: string) => {
			const { container } = render(
				<FidelityScore score={100} label="x" fidelity={fidelity as never} />,
			);
			return container.querySelector("path")?.getAttribute("stroke");
		};
		expect(stroke("lossless")).toBe("var(--accent)");
		expect(stroke("visually-lossless")).toBe("var(--ink)");
		expect(stroke("lossy")).toBe("var(--ink)");
		expect(stroke("inherently-lossy")).toBe("var(--ink)");
	});

	it("tints the stroke and never fills the ring", () => {
		// A CTA is a mint pill fill; this is a mint stroke tint. Filling the
		// ring would make one hue mean both "this is the action" and "this
		// is intact" — the collision the spec names as a defect.
		const { container } = render(
			<FidelityScore score={100} label="x" fidelity="lossless" />,
		);
		expect(container.querySelector("path")?.getAttribute("fill")).toBe("none");
	});
```

Add to `design-system.test.ts`:

```ts
describe("spacing scale", () => {
	// Colour, radius, easing and duration are closed sets with sweeps
	// behind them. Spacing was not, and two chrome components had already
	// produced three ad-hoc scales — 14px was a token and a literal in the
	// same file. v2 supplies the scale, so it gets a guard.
	const ALLOWED_LITERAL_PX = new Set([0, 1, 23, 36, 44]);

	it("writes no ad-hoc spacing literal", () => {
		const offenders: string[] = [];
		for (const { path, content } of sourceFileContents) {
			if (!path.endsWith(".tsx")) continue;
			for (const match of content.matchAll(
				/(?:padding|margin|gap|width|height|top|left|right|bottom)[A-Za-z]*:\s*["'](\d+)px["']/g,
			)) {
				const value = Number(match[1]);
				if (!ALLOWED_LITERAL_PX.has(value)) {
					offenders.push(`${path}: ${match[0].trim()}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});
});
```

The allowlist holds the values v2 fixes per-component: `23px`/`36px`/`44px` button heights, `1px` borders, and `0`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/components/instrument/__tests__/FidelityScore.test.tsx src/design/__tests__/design-system.test.ts`
Expected: FAIL — the ring is `var(--ink)` for every state, and the spacing sweep finds literals across the chrome components.

- [ ] **Step 3: Add the tint and fix the literals**

In `FidelityScore.tsx`, the stroke becomes `fidelity === "lossless" ? "var(--accent)" : "var(--ink)"`. Leave `fill="none"` exactly as it is, and add a comment recording why: the mint must tint the stroke and never fill the ring, because a CTA is a mint fill and one hue cannot mean both.

Then replace every spacing literal the sweep names with a token — `--gap-sm`, `--gap-md`, `--gap-lg`, `--section-pad`, or a multiple of `--space-base`.

- [ ] **Step 4: Run the full gate**

Run: `pnpm run ci`
Expected: PASS — typecheck, lint, unit tests, static build, Playwright.

This is the plan's exit gate. A behavioural e2e failure means a change is wrong, not the test. (Known flake: `src/core/io/__tests__/zip.test.ts` has timed out under parallel load and passed alone — re-run it in isolation before concluding anything about that specific test.)

- [ ] **Step 5: Look at the whole site**

Run `pnpm dev` and walk a converter page, the tools index, and a blog post. The migration is complete when the site reads as v2 — black canvas, square panels, mint only on actions and the lossless ring — rather than as the old system with new colours.

- [ ] **Step 6: Commit**

```bash
git add src/components/instrument/FidelityScore.tsx src/design/__tests__ src/components/instrument/__tests__
git commit -m "feat(design): tint the lossless ring, and guard the spacing scale

Fidelity keeps stroke as its primary encoding, so it still survives
greyscale, colour-blindness and a printed page. Mint reinforces lossless
and nothing else.

The two mint meanings are held apart by shape rather than hue: a CTA is
a mint pill fill, this is a mint stroke tint on an otherwise ink ring.
Filling the ring would make one colour mean both 'this is the action'
and 'this is intact', which the spec names as a defect.

The spacing sweep closes the last open follow-up from the previous plan.
Colour, radius, easing and duration all had guards; spacing did not, and
two chrome components had already produced three ad-hoc scales."
```

---

## Definition of done

- [ ] `pnpm run ci` passes end to end.
- [ ] The site renders as v2: `#000000` canvas, `#FFFFFF` ink, square structural corners, mint only on CTAs and the lossless ring.
- [ ] No `--terminal*`, `--ink-faint`, `--dur-min`, `--dur-reveal`, `--tracking-display`, `--leading-display` or `--mono-tracking` remains anywhere in `src`.
- [ ] No theme toggle, no `data-theme` selector, no `prefers-color-scheme` block, no `@custom-variant dark`.
- [ ] The build output contains no font-CDN reference.
- [ ] Marquee cards keep 100px/40px; everything else structural is square.
- [ ] `DifferenceCursor` still positions on `translate`, still renders nothing on a coarse pointer, and still hides the system cursor only via the class it adds itself.
- [ ] The reduced-motion block still collapses both `animation-duration` and `animation-delay`, at `0.01ms` rather than `0`.
