# Texture and Page Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the gutter inconsistency, give the thin pages real structure, and add the generative texture layer `DESIGN.v2.md` asks for — without breaking a single one of its guardrails.

**Architecture:** One owner for band gutters, so the four bands currently touching the viewport edge stop doing so and no future band can. A shared WebGL canvas primitive with a reduced-motion still path and a no-WebGL fallback, recoloured to the closed palette and used as a **contained texture layer** in the three places v2 names — never as a page takeover. Listings become the ruled, table-like rows v2 describes rather than bare lists. Prose pages gain the sectioned structure the system already has vocabulary for.

**Tech Stack:** Next.js 16.3 (`output: "export"`), React 19.2, Tailwind CSS v4, TypeScript 5 (`strict`), Vitest 4 + happy-dom, Biome 2.5, Playwright, raw WebGL — **no shader library, no CDN**.

**Spec:** [`DESIGN.v2.md`](../../../DESIGN.v2.md) governs. This plan implements its §Graphics & Effects, which is the one section no plan has yet built.

**Plan 5 of 5.**

**Working directly on `main`** at the user's standing instruction.

---

## The tension this plan has to resolve, stated up front

The shader references supplied are specified as *"a full-viewport canvas… the shader is the entire surface… the page contains nothing but the canvas"*, with grounds like `#0F0D2B` and accents like `#9890FA`.

**Taken literally, that breaks four of v2's six guardrails**, which say in its own words:

> Never fill the hero background with a full-frame saturated gradient — black must dominate; color stays confined to thin vertical bars/glows in the upper hero region.
> Never spread the mint accent (#34D59A) across large fills — it belongs only to CTA pills, icon glyphs, and code-token highlights.

And it would contradict the product's character: this is a file converter whose argument is that it is honest and local, not a generative-art showcase.

**The reconciliation is already written in v2 §Graphics & Effects**, which asks for precisely this material in precisely three places:

> static stand-ins should use **dark radial glows with thin vertical mint/teal bars for the hero** and **a fine branching-line network graphic for the footer band**. A **dot-matrix/halftone grain texture overlays the topmost strip banner and recurs faintly behind code-panel graphics**.

So: shaders are **contained texture layers inside named bands**, drawn from the closed palette, sitting *behind* content at low intensity. Black still dominates. Mint stays a thin bar and a glyph. The supplied palettes are replaced wholesale.

**Any task that produces a full-viewport shader takeover, or a shader using a colour outside the ten, has failed.**

## Global Constraints

- **The palette is closed** to `#000000`, `#111315`, `#E4F1EB`, `#FFFFFF`, `#94979E`, `#131415`, `#303236`, `#18191B`, `#34D59A`, `#47D18C`. **This binds GLSL too** — every `vec3` colour constant must be one of these, and the palette guard must be extended to read shader source.
- **Mint is rationed** — CTA fills, icon glyphs, code tokens, the lossless tint, and now thin data/hero bars. Never a large fill.
- **Radius closed set:** `0` structural, `4px` nav-utility, `9999px` pills and dots, `40`/`100px` marquee cards only.
- **Spacing from the scale.** Sweeps admit literal px only from `{0, 1, 14, 23, 36, 44}` and police template literals and Tailwind arbitrary values.
- **Display and headline are weight 400**; the fused bold/gray headline never splits into a subhead.
- **Zero third-party requests.** `e2e/network-guard.ts` enforces it — **no shader library, no CDN, no remote asset.** GLSL ships as inline strings.
- **`prefers-reduced-motion` is honoured by every animated surface.** Each shader renders a **single frame** and stops. The existing block in `globals.css` must not be touched.
- **A route may not import families or primitives**; `page.tsx` component body ≤ 50 lines, file ≤ 150.
- **`data-testid` values are frozen.**
- **Every user-facing claim names the file that makes it true.**
- **Formatting:** Biome — tabs, double quotes.

## Performance budget, because this is a converter

Converter pages run WASM codecs on the main thread's neighbours. A decorative canvas must never compete with a conversion.

- **No shader on a converter route.** The instrument's page carries none.
- Every shader **pauses when off-screen** (`IntersectionObserver`) and **when the tab is hidden** (`visibilitychange`).
- Canvases render at a **capped device pixel ratio** (1.5 max), not the device's native DPR.
- A shader that cannot get a context renders its fallback and never retries in a loop.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/design/texture/ShaderSurface.tsx` | The shared canvas: context, RAF loop, pointer uniform, pause rules, reduced-motion still, fallback. |
| `src/design/texture/glsl/preamble.ts` | Shared GLSL: hashed value noise, fbm, domain warp, and the palette as `vec3` constants. |
| `src/design/texture/glsl/halftone.ts` | Dot-matrix lattice — v2's grain, for the top strip and behind code panels. |
| `src/design/texture/glsl/heroGlow.ts` | Dark radial glow with thin vertical mint bars — v2's hero stand-in. |
| `src/design/texture/glsl/branchNetwork.ts` | Fine branching-line network — v2's footer band graphic. |
| `src/design/texture/index.ts` | Barrel. |
| `src/design/families/ListingRows.tsx` | v2's ruled, table-like listing: hairline rows, mono meta, arrow affordance. |
| `src/design/families/ProseSection.tsx` | An eyebrow + fused headline + body block, for the prose pages. |

**Modified**

`src/design/templates/EditorialPage.tsx` and `templates.css` (gutter ownership) · the four bands that currently set their own horizontal padding · `HeroBand`, `TerminalPanel`, `SiteFooter` (texture) · `src/app/blog/page.tsx`, `groups/`, `collectives/`, `about/`, `how-it-works/`, `privacy/`, `legal/*` (structure) · `src/design/__tests__/tokens.test.ts` (palette guard reads GLSL)

---

## Task 1: One owner for the band gutter

**Files:**
- Modify: `src/design/templates/EditorialPage.tsx`, `src/design/templates/templates.css`, `src/design/families/{BranchDiagram,ComplianceRow,FeatureStrip,ToolGrid,HeroBand,FormatStrip}.tsx`
- Test: `src/design/__tests__/EditorialPage.test.tsx`, `src/design/__tests__/band-gutter.test.ts` (create)

**Interfaces:**
- Produces: every band inside `EditorialPage` has a horizontal gutter, owned in one place.

**The confirmed bug.** Four bands set `maxWidth: "var(--max-width)"` (1600px) and **no horizontal padding**: `BranchDiagram`, `ComplianceRow`, `FeatureStrip`, `ToolGrid`. Below 1600px the cap never binds, so they run flush to the viewport edge. Four others (`HeroBand`, `FormatStrip`, `FeatureGrid`, `TerminalPanel`) do carry padding, so the page reads inconsistently — some bands inset, some touching the glass.

**The fix is one owner, not four patches.** Four independent copies of a gutter is the same drift that produced three independent `896`s elsewhere in this codebase. The shell owns the gutter; bands own their cap.

Two things to be careful of, both learned here already:

- **A cap on the shell would eat its own padding** before children measure against it — that is why `EditorialPage` deliberately imposes no `max-width`. Add padding to the shell **without** adding a cap.
- `TerminalPanel`'s `var(--gap-md)` is a bordered panel's **inner** padding and `FeatureGrid`'s is a **cell text inset**. Neither is a gutter. **Leave both.** Only remove the horizontal gutter padding from `HeroBand` and `FormatStrip`, whose padding exists for that purpose — otherwise those two get a double gutter.

- [ ] **Step 1: Write the failing guard**

Create `src/design/__tests__/band-gutter.test.ts`. It must read every file in `src/design/families/`, find those declaring `maxWidth: "var(--max-width)"`, and assert **none of them also declares its own horizontal padding** — because the shell owns it now. Write the reasoning in: a band that insets itself inside a shell that already insets it is double-gutted, and a band that insets itself when the shell does not is the inconsistency this task exists to remove.

Add a second assertion reading `templates.css`: `[data-editorial]` declares a horizontal padding drawn from the scale.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/band-gutter.test.ts`
Expected: FAIL — `HeroBand` and `FormatStrip` still declare their own, and the shell declares none.

- [ ] **Step 3: Move the gutter to the shell**

In `EditorialPage.tsx`, add horizontal padding of `var(--gap-md)` to the `[data-editorial]` shell — **padding only, no `max-width`**. Remove the horizontal padding from `HeroBand` and `FormatStrip`, keeping any vertical padding they have.

`FormatStrip` is full-bleed by design — a marquee that stops short of the edges looks wrong. If a gutter breaks it, say so and exempt it explicitly with a comment rather than silently leaving it inconsistent.

- [ ] **Step 4: Run everything**

Run: `pnpm exec vitest run src/design/__tests__ && pnpm test && pnpm lint && pnpm typecheck && pnpm build`

- [ ] **Step 5: Measure the gutter at every breakpoint**

Rebuild first — Playwright serves `out/`, not source. On `/`, report **every band's left offset and width** at **1920, 1440, 1280, 1024, 768 and 375**. Requirements: no band's left offset is 0 at any width below 1600; all bands at a given width share the same left offset; `documentElement.scrollWidth` equals the viewport at each.

Take a screenshot at 1280 and 375 and say whether the page now reads as one column.

- [ ] **Step 6: Commit**

```bash
git add src/design/templates src/design/families src/design/__tests__
git commit -m "fix(design): give every band one gutter, owned in one place

Four bands -- BranchDiagram, ComplianceRow, FeatureStrip and ToolGrid --
set a 1600px cap and no horizontal padding, so below 1600px the cap
never bound and they ran flush to the viewport edge while four other
bands were inset. The page read as inconsistent because it was.

The shell owns the gutter and bands own their cap, rather than four
copies of a gutter that have to agree -- the same drift that produced
three independent 896s on the converter route. A guard now fails any
band that insets itself.

Padding only on the shell, no cap: a cap there would eat its own padding
before children measured against it, which is the lesson EditorialPage's
own comment already records."
```

---

## Task 2: The shader surface

**Files:**
- Create: `src/design/texture/ShaderSurface.tsx`, `src/design/texture/glsl/preamble.ts`, `src/design/texture/index.ts`
- Modify: `src/design/__tests__/tokens.test.ts`, `src/design/__tests__/primitives-contract.test.ts`
- Test: `src/design/__tests__/ShaderSurface.test.tsx`

**Interfaces:**
- Produces: `ShaderSurface({ fragment, intensity, label })` — a client component rendering a `<canvas>` sized to its parent, running `fragment` with the shared preamble.

This is the one client component this plan adds. Everything after it is composition.

**What it must do, and each of these is load-bearing:**

- **Fill its parent, not the viewport.** `position: absolute; inset: 0` inside a positioned parent — never `fixed`, never `100vw`. A texture layer that escapes its band is the guardrail breach this plan exists to avoid.
- **`pointer-events: none`.** It sits behind content. The dot-matrix grain already taught this lesson: a decorative overlay that swallows clicks kills the band, and no DOM test sees it.
- **`aria-hidden`.** It is texture and has nothing to say.
- **Honour `prefers-reduced-motion` by rendering exactly one frame** and never starting the loop. Not a slowed loop — one frame, then stop.
- **Pause when off-screen** via `IntersectionObserver`, and **when the tab is hidden** via `visibilitychange`.
- **Cap device pixel ratio at 1.5.** A 3× canvas on a 4K screen costs real GPU for a texture nobody looks at directly.
- **Fall back visibly, once.** If `getContext("webgl2") ?? getContext("webgl")` returns null, render a static CSS stand-in and never retry.
- **Clean up on unmount:** cancel the RAF, disconnect the observer, remove listeners, and lose the context.

**The palette binds GLSL.** Colour constants live in `preamble.ts` as named `vec3`s derived from the ten values — nothing else. Extend the palette guard in `tokens.test.ts` to read `src/design/texture/glsl/**` and fail on any hex or `vec3` literal that is not one of the ten. That guard is what keeps the supplied reference palettes from leaking in.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShaderSurface } from "@/design/texture/ShaderSurface";

const FRAG = "void main() { gl_FragColor = vec4(0.0); }";

describe("ShaderSurface", () => {
	it("fills its parent rather than the viewport", () => {
		// A texture layer that escapes its band would break v2's guardrail
		// that black must dominate and colour stays confined to a region.
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		const el = container.querySelector("canvas") as HTMLCanvasElement;
		expect(el.style.position).toBe("absolute");
		expect(el.style.width).toBe("100%");
	});

	it("never intercepts pointer events", () => {
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		const el = container.querySelector("canvas") as HTMLCanvasElement;
		expect(el.style.pointerEvents).toBe("none");
	});

	it("is hidden from assistive technology", () => {
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("renders a fallback and does not loop when WebGL is unavailable", () => {
		const spy = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue(null);
		const raf = vi.spyOn(window, "requestAnimationFrame");
		const { container } = render(<ShaderSurface fragment={FRAG} label="x" />);
		expect(container.querySelector("[data-shader-fallback]")).not.toBeNull();
		expect(raf).not.toHaveBeenCalled();
		spy.mockRestore();
		raf.mockRestore();
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/ShaderSurface.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the preamble and the surface**

`preamble.ts` exports a GLSL string with: a hashed value noise, a six-octave fbm, a two-level domain-warp helper, and the palette as named `vec3` constants. Write each colour with a comment naming the token it comes from, so a reader can check it against `tokens.css`.

`ShaderSurface.tsx` is `"use client"` — add it to the client-component allowlist in `primitives-contract.test.ts`, since that guard is bidirectional and will fail otherwise.

Uniforms: resolution, time, and a smoothed pointer intensity that rises toward 1 while the pointer is over the parent and relaxes to 0 when it leaves. Under reduced motion, intensity stays at its resting value and no frame after the first is drawn.

- [ ] **Step 4: Extend the palette guard to GLSL**

In `tokens.test.ts`, add `src/design/texture/glsl/**` to the corpus and assert no colour literal outside the ten appears there. **Prove it bites:** add `vec3(0.60, 0.56, 0.98)` — the supplied Silk accent — to a shader file, run the guard, confirm FAIL, revert.

- [ ] **Step 5: Run everything**

Run: `pnpm exec vitest run src/design/__tests__ && pnpm test && pnpm lint && pnpm typecheck && pnpm build`

- [ ] **Step 6: Commit**

```bash
git add src/design/texture src/design/__tests__
git commit -m "feat(texture): add the shader surface, contained and palette-bound

One client component: a canvas that fills its parent, never the
viewport. v2 asks for generative texture in three named places and
forbids a full-frame wash in the same document, so containment is the
whole design -- absolute inset-0 in a positioned parent, pointer-events
none, aria-hidden, behind content.

The palette binds GLSL as well as CSS. Colour constants live in the
preamble as named vec3s derived from the ten tokens, and the palette
guard now reads shader source, so a reference palette cannot leak in
through a language the sweep could not previously see.

Reduced motion renders exactly one frame and never starts the loop --
not a slowed loop. The surface also pauses off-screen and on tab hide,
and caps DPR at 1.5, because this is a file converter and a decorative
canvas must never compete with a WASM codec."
```

---

## Task 3: The three textures, in the three places v2 names

**Files:**
- Create: `src/design/texture/glsl/{halftone,heroGlow,branchNetwork}.ts`
- Modify: `src/design/texture/index.ts`, `HeroBand.tsx`, `TerminalPanel.tsx`, `SiteFooter.tsx`
- Test: `src/design/__tests__/texture-placement.test.ts`

**Interfaces:**
- Consumes: `ShaderSurface`.

v2 §Graphics & Effects names three, and this task builds exactly those three — no more:

1. **`heroGlow`** — *"dark radial glows with thin vertical mint/teal bars for the hero"*. Black ground, a soft radial fall-off, and **thin** vertical bars in `--accent`. The bars are thin and few; mint must remain a rationed stroke, not a wash.
2. **`halftone`** — *"a dot-matrix/halftone grain texture [that] overlays the topmost strip banner and recurs faintly behind code-panel graphics"*. The supplied Halftone reference is the right mechanism: floor the coordinate to a lattice, sample an fbm once per cell centre, use it as the dot radius. Recoloured to `--rule` on `--ground`. Goes behind the hero and behind `TerminalPanel`.
3. **`branchNetwork`** — *"a fine branching-line network graphic for the footer band"*. Thin lines in `--rule-subtle`, over the footer's pale band, which means it renders on `--surface-alt` and must be dark-on-pale there rather than light-on-dark.

**Intensity is the constraint that keeps this from becoming decoration.** Each texture sits behind content at low opacity. If a texture makes any text harder to read, it is too strong — measure, do not eyeball.

- [ ] **Step 1: Write the placement guard**

Create `src/design/__tests__/texture-placement.test.ts` asserting:
- No converter route renders a `ShaderSurface` — walk `src/app/[category]/[slug]/` and the `ConverterPage` template and assert neither imports it. Write the reasoning in: a decorative canvas must not compete with a WASM codec on the product's working surface.
- Every `ShaderSurface` usage sits inside a parent that establishes a positioning context, so it cannot escape its band.

- [ ] **Step 2: Run to verify it fails, then write the three shaders**

Each is a fragment body appended to the preamble. Keep each to two or three palette values, per v2's own instruction that the effect should read as one material rather than a rainbow.

- [ ] **Step 3: Place them**

`heroGlow` and `halftone` behind `HeroBand`'s content; `halftone` behind `TerminalPanel`; `branchNetwork` behind `SiteFooter`'s band. Each parent needs `position: relative` and the content needs to sit above the canvas — check the stacking rather than assuming it.

- [ ] **Step 4: Measure contrast over every texture**

This is the step that decides whether the texture is acceptable. Rebuild, then for each textured band sample the **composited** background under the text — not the token value, the actual rendered pixels — and compute the contrast of the text against the darkest and lightest sampled points. **Every text pair must still clear 4.5:1 at both extremes.** Report the numbers. If any fails, reduce the intensity until it passes and report the value you settled on.

- [ ] **Step 5: Verify the behaviour rules in a browser**

Rebuild first, then report:
1. Under `reducedMotion: "reduce"`, sample the canvas twice a second apart — the pixels must be identical.
2. Without it, the same sample must differ.
3. Scroll the textured band off-screen and confirm the RAF loop stops — instrument a frame counter on `window` and report the count before and after.
4. Hit-test a link over each texture and confirm `elementFromPoint` returns the link, not the canvas.
5. `documentElement.scrollWidth` equals the viewport at 375 and 1280 — a canvas that overflows its parent is the failure mode here.
6. Force `getContext` to fail and confirm the fallback renders and the page still looks deliberate.

- [ ] **Step 6: Run the gate and commit**

Run: `pnpm run ci`

```bash
git add src/design/texture src/design/families src/design/chrome src/design/__tests__
git commit -m "feat(texture): add the hero glow, halftone grain and branch network

The three surfaces v2 names in Graphics & Effects, and only those three:
a dark radial glow with thin vertical mint bars for the hero, the
dot-matrix grain over the top strip and behind code panels, and a fine
branching-line network behind the footer band.

Recoloured entirely. The supplied references specify grounds and accents
outside this system; every colour here is one of the ten, and the
palette guard reads GLSL so it stays that way.

No converter route carries one, and a guard enforces it: the instrument
is the product and a decorative canvas must not compete with a WASM
codec. Contrast over every texture was measured against the composited
pixels at their darkest and lightest, not against the token underneath."
```

---

## Task 4: Listings become the ruled rows v2 describes

**Files:**
- Create: `src/design/families/ListingRows.tsx`
- Modify: `src/design/families/index.ts`, `src/app/blog/page.tsx`, `src/app/groups/page.tsx`, `src/app/collectives/page.tsx`
- Test: `src/design/__tests__/ListingRows.test.tsx`

**Interfaces:**
- Produces: `ListingRows({ items })` where each item is `{ href, title, meta?, description? }`.

**What is wrong today.** `src/app/blog/page.tsx` renders a bare `<ul>` of `<li>`, each an `<a className="text-[18px] underline">` over a `<p className="text-[14px]">`. Two problems: those are **Tailwind arbitrary values bypassing the type scale**, and a browser-default underline is not this system's link treatment. The result has no hierarchy, no rhythm and no structure.

**What v2 asks for instead:** *"ruled dividers"*, *"a strict uniform card grid… separated by hairline dividers"*, *"table-like structure"*, and mono for metadata. A listing in this system is a ruled table of rows, not a bulleted list.

Each row: a title at the label scale, an optional mono meta column (a date, a count, a format pair), an optional muted description, a hairline between rows — never around them — and an arrow affordance that appears on hover and focus. `ArrowUpRight` already exists as a primitive; use it rather than a new glyph.

- [ ] **Step 1: Write the failing test**

Assert: one row per item; the title uses `var(--label-size)` and no `text-[` arbitrary value anywhere in the component; hairlines fall between rows only (first row has no top border, no row has a bottom border); the whole row is the link target, not just the title; and the arrow is `aria-hidden` since the link already has an accessible name.

- [ ] **Step 2: Run to verify it fails, then write it**

- [ ] **Step 3: Repoint the three listings**

`/blog` (title, publish date as mono meta, description), `/groups` (name, tool count as mono meta), `/collectives` (title, tool count, the `why` as description). Each route stays under its line caps and imports only from `@/design/templates` — so `ListingRows` reaches them through the template, not directly. Give `HubPage` a slot if it needs one, and say so.

- [ ] **Step 4: Verify**

Rebuild, then on all three: row count matches the registry; every row's full area is clickable — hit-test a point in the row away from the title text; the arrow appears on keyboard focus, not only on hover; hairlines fall between rows only, confirmed by reading computed border widths on the first, middle and last rows; contrast of title and meta against the ground, each naming its ground; `scrollWidth` equals the viewport at 375 and 1280.

- [ ] **Step 5: Commit**

```bash
git add src/design/families src/design/templates src/app/blog src/app/groups src/app/collectives src/design/__tests__
git commit -m "feat(listings): make the hubs the ruled rows v2 describes

The blog index was a bare ul of li, its link styled text-[18px] with a
browser-default underline and its description text-[14px] -- two
Tailwind arbitrary values bypassing the type scale entirely, which is
why it read as unstyled. Groups and collectives were the same shape.

v2 asks for ruled dividers and table-like structure, so a listing here
is a table of rows: title at the label scale, mono metadata, hairlines
between rows and never around them, and the existing ArrowUpRight
primitive as the affordance. The whole row is the target, not just the
title -- a 200px link in a 1200px row is a needlessly small one."
```

---

## Task 5: The prose pages get structure

**Files:**
- Create: `src/design/families/ProseSection.tsx`
- Modify: `src/design/families/index.ts`, `src/content/pages/*.ts`, `src/app/{about,how-it-works,privacy}/page.tsx`, `src/app/legal/*/page.tsx`
- Test: `src/design/__tests__/ProseSection.test.tsx`

**Interfaces:**
- Produces: `ProseSection({ eyebrow, lead, cont, children })`.

**What is wrong today.** `/about`, `/how-it-works` and `/privacy` each render a title above a flat stack of `<p>` elements — no sections, no hierarchy, nothing to navigate by. For a page explaining how a product works, that is the weakest possible form.

**What the system already has vocabulary for:** *"each headed by a small dotted-grid glyph + a two-clause headline"*, the fused bold/gray headline, mono eyebrows, and hairline rules. A prose page here should be a sequence of sections, each with an eyebrow and a fused headline, not one undifferentiated column.

`FusedHeadline` already exists — compose it rather than restating it.

**The content model changes with it.** `src/content/pages/*.ts` currently holds flat `PARAGRAPHS` arrays. Restructure to sections: `{ eyebrow, lead, cont, paragraphs }[]`. Keep it typed constants — the reasoning for not using MDX is recorded in that directory's `types.ts` and still holds.

**Do not invent content.** Reorganising existing prose into sections is in scope; writing new claims is not. If a section needs a heading that does not exist in the current text, derive it from what the paragraphs already say. **Every claim must still name the file that makes it true** — this project has shipped false claims three times from copy written for effect.

**`/how-it-works` may use a `TerminalPanel`** to show what a conversion actually does, since that component exists and the page is about mechanism. Only if the content is real.

- [ ] **Step 1: Write the failing test**

Assert: the eyebrow renders in the mono voice; the headline is a `FusedHeadline` at `h2` and both clauses share one heading element; body paragraphs sit inside the prose measure; and a section with no eyebrow still renders correctly, since not every section needs one.

- [ ] **Step 2: Run to verify it fails, then write it**

- [ ] **Step 3: Restructure the content and the five routes**

Sections for `/about`, `/how-it-works`, `/privacy` and the three legal pages. The legal pages keep `LegalPage`'s narrower measure and their revision line. **The two placeholders in `terms.ts` and `privacy-policy.ts` stay exactly as they are** — clearly marked, pending the owner's input.

- [ ] **Step 4: Verify**

Rebuild, then per page: heading levels descend in order with exactly one `h1`; prose lines land in the 60–75 character measure; contrast for body and eyebrow, each naming its ground — the legal pages sit on a different ground from the marketing ones, so do not assume; `scrollWidth` equals the viewport at 375 and 1280. Screenshot each at 1280 and say whether it now reads as a designed page.

- [ ] **Step 5: Commit**

```bash
git add src/design/families src/content/pages src/app/about src/app/how-it-works src/app/privacy src/app/legal src/design/__tests__
git commit -m "feat(content): give the prose pages the structure the system already has

/about, /how-it-works and /privacy were a title over a flat stack of
paragraphs -- no sections, nothing to navigate by, and the weakest form
available for a page whose job is explaining how something works.

They are now sequences of sections, each with a mono eyebrow and the
fused bold/gray headline v2 uses for every content band, composed from
the existing FusedHeadline rather than a restatement of it.

The prose was reorganised, not rewritten: no new claim was introduced,
and the two legal placeholders stay marked and pending the owner's
input rather than being quietly filled."
```

---

## Task 6: Groups and collectives earn their pages

**Files:**
- Modify: `src/app/groups/page.tsx`, `src/app/groups/format/[format]/page.tsx`, `src/app/groups/task/[kind]/page.tsx`, `src/app/collectives/[slug]/page.tsx`, `src/design/templates/{HubPage,ShowcasePage}.tsx`
- Test: existing template tests

**Interfaces:**
- Consumes: `ListingRows`, `BranchDiagram`, `ShowcasePage`.

These pages are correct and thin. Both have material available that they are not using.

**`/groups`** lists two dimensions as flat links. It should show what each dimension *contains* — a format's tool count, the categories it spans — using the mono readout voice. **Derive every figure**; hand-written counts are the thing this codebase has repeatedly refused.

**A format group page** is the natural home for `BranchDiagram`: a format group *is* a conversion graph, and that component already draws one from `conversionBranches()`. Use it, and the page stops being a list and starts being an answer to "what can I do with this file?".

**`/collectives/[slug]`** already has `ShowcasePage` and a demo. What it lacks is the collective's *reason* being visible — the `why` should lead, in the fused headline voice, rather than sitting as a lede.

**No fabrication.** Every count derived, every claim traceable.

- [ ] **Step 1: Enrich `/groups`**

Mono counts per group, derived. Keep the route under its caps.

- [ ] **Step 2: Put the branch diagram on the format pages**

For a format with no outward branches, render nothing rather than an empty diagram — `BranchDiagram` already returns `null` for an empty list, so pass it real data and let it decide.

- [ ] **Step 3: Lead the collective with its reason**

- [ ] **Step 4: Verify**

Rebuild, then: every derived count matches what the registry yields — check three against a direct computation; the branch diagram renders on a format that branches and is absent on one that does not; no route exceeds its caps; `scrollWidth` equals the viewport at 375 and 1280 on all four page types.

- [ ] **Step 5: Commit**

```bash
git add src/app/groups src/app/collectives src/design/templates
git commit -m "feat(groups): let the group and collective pages use what they know

/groups listed two dimensions as flat links while the registry could
tell a visitor how many tools each holds. A format group is a
conversion graph, so it now draws the one BranchDiagram already derives
from conversionBranches -- the page answers 'what can I do with this
file?' rather than listing links.

Every figure is derived. A collective now leads with its reason in the
fused headline voice, because the reason is what separates a collective
from a group."
```

---

## Task 7: The exit gate

**Files:**
- Modify: whatever the walk surfaces

- [ ] **Step 1: Run `pnpm run ci`**

Known flakes, only these: `zip.test.ts`, `loudness.test.ts`, `generate-sw.test.ts`. Any other failure means a change is wrong.

- [ ] **Step 2: Walk every route, at every breakpoint**

Rebuild, then for **every** route type at **1920, 1440, 1280, 1024, 768 and 375**:

1. `documentElement.scrollWidth` equals the viewport.
2. **No element's left offset is 0** where a gutter is expected — this is the bug this plan opened with, and the check that proves it fixed.
3. Exactly one `<main>` and one `<h1>`.
4. The lowest text contrast, **naming its ground** — over a texture, sample the composited pixels, not the token.
5. Every tab stop's focus ring visible, measured with real `Tab` keypresses against what is actually behind the ring.

- [ ] **Step 3: Confirm the texture rules hold site-wide**

No converter route renders a canvas; every shader pauses off-screen and under reduced motion; the page's total canvas count is what you expect and no more.

- [ ] **Step 4: Report and commit**

Report a table. Anything unresolved goes to the user with a recommendation, not a silent pass.

---

## Definition of done

- [ ] `pnpm run ci` passes end to end.
- [ ] No band's left offset is 0 at any width below 1600; all bands at a given width share one left offset.
- [ ] The gutter is declared in exactly one place, enforced by a guard.
- [ ] Every GLSL colour is one of the ten, enforced by the palette guard reading shader source — proved by mutation with a reference palette value.
- [ ] No converter route renders a shader, enforced by a guard.
- [ ] Every shader: fills its parent not the viewport, is `pointer-events: none` and `aria-hidden`, renders one frame under reduced motion, pauses off-screen and on tab hide, caps DPR at 1.5, and falls back once without looping.
- [ ] Text contrast over every texture clears 4.5:1 at the darkest and lightest sampled points.
- [ ] No listing uses a Tailwind arbitrary type value; all three use the ruled rows.
- [ ] The prose pages are sectioned, and no new claim was introduced.
- [ ] The two legal placeholders remain marked and unfilled.
- [ ] Every count on groups and collectives is derived.
- [ ] Across every route at six widths: one `<main>`, one `<h1>`, no horizontal overflow, every focus ring visible.
