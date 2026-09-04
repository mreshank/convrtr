# convrtr — Editorial Overhaul Design

**Date:** 2026-09-04
**Status:** Approved, pending implementation plan
**Supersedes:** §6 "Design system — Instrument" of
[`2026-08-07-convrtr-design.md`](./2026-08-07-convrtr-design.md). Every other section of
that spec — architecture, module boundaries, engine layer, error taxonomy, the privacy
guarantee — stands unchanged and still governs.

---

## 1. What this is

A whole-site rebuild of convrtr's presentation layer against
[`DESIGN.md`](../../../DESIGN.md): a typography-first, strictly monochrome editorial studio
aesthetic with a custom difference cursor, motion-driven reveals, and image-led layout.

It covers the landing page, a new marketing surface, legal pages, a blog rebuild, every
converter page, and two new route families — derived **groups** and curated **collectives** —
each carrying a showcase and a live, real conversion demo.

**The governing constraint on this document:** DESIGN.md's design system is followed
strictly and extended *only* in the direction it is already written. Where DESIGN.md is
silent and the product forces a decision, this spec records the decision and shows why it
is a continuation rather than a new direction. Nothing here invents a colour, an easing,
a border weight, or a layout idiom DESIGN.md does not already establish.

### The invariant this must not break

The v1 spec's central architectural claim is that **adding a conversion touches only
`core/registry`, never `src/app`**. Today that holds: 36 tools, 5 blog posts, and every
route derives from a registry. A rebuild that produced forty hand-written pages would
technically satisfy the brief and quietly destroy the property that makes the codebase
worth having. Every new route family in this design is therefore either derived from
registry data or declared in a registry of its own.

---

## 2. Non-goals

- No change to `core/engines`, `core/pipeline`, `core/io`, or `core/quality` behaviour.
  This is a presentation-layer rebuild; conversion logic is untouched.
- No new conversions. The catalogue is what it is; this changes how it is presented.
- No server, no runtime, no accounts. `output: "export"` remains absolute.
- No component library. DESIGN.md's identity may not have another vendor's showing
  through it.

---

## 3. Decisions taken

| # | Question | Decision |
|---|---|---|
| 1 | DESIGN.md mandates strict black-and-white, but the converter encodes fidelity state in acid/amber/red across 13 source files, the brand mark and the PWA manifest. | **Pure B&W. State is carried by typography, weight and fill pattern.** The three semantic colour tokens are deleted. |
| 2 | DESIGN.md's marquee, project grid and grayscale→colour hover are photography-driven, and `public/` holds four PWA icons. | **Real sample files, converted live.** Genuine source files ship in the repo; showcase blocks convert them in-browser on the page. |
| 3 | DESIGN.md specifies one light palette; the product ships a light/dark/system toggle. | **Dark mode survives, as DESIGN.md's own footer palette applied site-wide** (`#0A0A0A` ground, `#FFFFFF` text). No new value is invented. |
| 4 | "Collective pages" and "group pages" were undefined. | **Groups are derived, collectives are curated.** Groups generate from `TOOLS` with zero hand-authoring; collectives are task-shaped kits declared in a small registry. |
| 5 | How should the design system be implemented? | **One design layer, templates over registries.** `src/design/` holds tokens, primitives and templates; route files become thin data→template adapters. |

Rejected alternatives and why, briefly: a workspace package for the design system (one
consumer, slower iteration, isolation nothing needs); a progressive re-skin (DESIGN.md's
hero, marquee, grid and terminal footer are structural, not cosmetic — unreachable by
restyling, and the site would be visually mixed throughout).

---

## 4. Design system layer

`src/design/tokens.css` replaces `src/styles/tokens.css`.

### 4.1 Palette

| Token | Light | Dark |
|---|---|---|
| `--ground` | `#FFFFFF` | `#0A0A0A` |
| `--ink` | `#000000` | `#FFFFFF` |
| `--ink-muted` | `#525252` | `#A3A3A3` |
| `--ink-faint` | `#737373` | `#8A8A92` |
| `--rule` | `rgb(0 0 0 / .10)` | `rgb(255 255 255 / .10)` |
| `--terminal` | `#0A0A0A` | `#FFFFFF` |
| `--terminal-ink` | `#FFFFFF` | `#0A0A0A` |
| `--terminal-rule` | `rgb(255 255 255 / .10)` | `rgb(0 0 0 / .10)` |

Dark mode is not invented: `#0A0A0A` on `#FFFFFF` is the footer palette DESIGN.md already
specifies, applied past the footer. In dark mode the terminal band inverts so it still
reads as a distinct closing strip rather than dissolving into the page ground.

`--ink-muted` lifts to `#A3A3A3` in dark rather than staying at `#525252`, which would
fail contrast against a near-black ground. This is the same relationship DESIGN.md draws
in light, held constant.

**No third colour exists in the file.** The only colour anywhere on the site comes from
sample photography, per DESIGN.md's Special Notes.

The existing `ThemeScript` / `ThemeToggle` / `src/lib/theme.ts` triad and its
pre-hydration no-JS fallback survive unchanged in mechanism; only the values they switch
between change.

### 4.2 Typography

Inter, self-hosted through `next/font/google`. DESIGN.md's Style paragraph names Inter
directly, and self-hosting is not a preference — an external font request would puncture
the zero-network guarantee the entire product rests on. `next/font` inlines and self-hosts
at build time, so no request leaves the origin at runtime.

| Role | Spec |
|---|---|
| Display / headline | `font-weight: 700; letter-spacing: -0.05em; line-height: 0.9` |
| Body | `font-weight: 400; letter-spacing: -0.02em; line-height: 1.5` |
| Mono / metadata | mono family; `14px`; `text-transform: uppercase`; `letter-spacing: 0.1em` |

**One deliberate extension.** DESIGN.md writes the metadata family as generic
`'monospace'`. A real self-hosted mono with tabular figures is used instead, because every
number in the converter counts upward live and proportional digits make the readout jitter
while it runs. DESIGN.md's mono *rules* — size, casing, tracking, and its role as the
metadata voice — apply unchanged. This holds the stated direction steady rather than
turning it.

### 4.3 Motion

`--ease: cubic-bezier(0.16, 1, 0.3, 1)` is the only easing token in the system; DESIGN.md
forbids system easing outright.

| Token | Value | Applies to |
|---|---|---|
| `--dur-reveal` | `1s` | staggered text reveals |
| `--dur-hover` | `700ms` | image grayscale→colour + 1.05× scale |
| `--dur-marquee` | `30s` | linear infinite marquee |
| `--dur-min` | `500ms` | floor on every hover state |

This retires the v1 spec's 120–220ms motion budget for presentation motion. State-change
motion inside the converter instrument — a progress bar advancing, a row settling — stays
fast, because DESIGN.md's 500ms floor governs *hover states*, and a progress readout that
lagged half a second behind the work would be misreporting it.

### 4.4 Radius and borders

DESIGN.md's asymmetric card system replaces the v1 "radius never exceeds 4px" rule:

- Card A — `border-top-left-radius: 100px`
- Card B — `border-top-right-radius: 100px; border-bottom-left-radius: 40px`
- Card C — `border-radius: 40px`

Applied in rotation across marquee and grid items. Borders never exceed 1px anywhere,
which DESIGN.md and the v1 spec already agree on.

### 4.5 The monochrome state model

This replaces `--signal` / `--lossy` / `--error`, which are deleted. Fill, stroke pattern
and label carry what colour used to carry.

| State | Expression |
|---|---|
| `LOSSLESS` | solid `--ink` ring, filled to 100, mono label |
| `VISUALLY LOSSLESS` | solid ring, partial fill, mono label |
| `LOSSY · Q78` | hairline **dashed** ring — degradation reads as a broken line |
| `INHERENTLY LOSSY` | dashed ring; the reason stated on the adjacent line |
| `ERROR` | inverted block — `--terminal-ink` on `--terminal`; the only inversion permitted in body copy |
| running / active | animated hairline plus mono phase readout |

Colour is not merely removed here; the distinctions it carried are re-encoded. A user must
still be able to tell a lossless result from a lossy one at a glance, and a broken ring
does that without a hue.

`FidelityScore`'s `ringColor()` — which currently blends `--error` → `--lossy` → `--signal`
via `color-mix` — is replaced by a stroke-dash function over the same 0–100 score.

**Enforcement:** `src/styles/__tests__/tokens.test.ts` is extended to assert that no hex
value outside the monochrome set appears in `tokens.css`, so the palette cannot quietly
regress.

Files that read the deleted tokens and must be reworked:
`src/app/[category]/[slug]/ToolClient.tsx`, `src/app/tools/ToolTable.tsx`,
`src/components/content/Callout.tsx`, and
`src/components/instrument/{BatchTable,DropField,ErrorPanel,FidelityScore,HeavyDownloadGate,OptionsPanel,ProgressBar,ThemeToggle,TimeRange}.tsx`,
plus `src/components/instrument/__tests__/FidelityScore.test.tsx`.

`src/app/manifest.ts` and `src/app/icon.svg` carry the same colours as literal hex rather
than as tokens; they are handled in §4.7.

### 4.6 Accessibility and device guardrails

Three rules, each a continuation of DESIGN.md rather than an exception to it.

**Pointer.** `cursor: none` on `body` and the `DifferenceCursor` element itself apply only
under `@media (pointer: fine)`. On a coarse pointer the element is never rendered at all.
DESIGN.md's cursor is a mouse affordance; applying `cursor: none` where there is no mouse
would leave a touch user with neither a system cursor nor a replacement.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, reveals resolve instantly to
their final state, the marquee pauses, and image hovers reduce to opacity alone. The
cursor's `requestAnimationFrame` interpolation is disabled and the element tracks the
pointer directly. The 500ms floor governs motion that actually runs.

**Focus.** Because the difference cursor is mouse-only, keyboard `:focus-visible` gets a
real 1px `--ink` outline — within DESIGN.md's border-weight cap. Without it, keyboard
users would have no focus indication at all, since the cursor that signals interactivity
for mouse users never moves for them.

### 4.7 The brand mark

The mark is not exempt from the palette rule, and it currently breaks it.
`src/app/icon.svg` draws a chevron in `#ccff00` on a `#0b0b0c` ground, the four PNGs in
`public/icons/` match it, and `src/app/manifest.ts` hardcodes `#0b0b0c` for both
`background_color` and `theme_color`.

All of it moves to the terminal pair DESIGN.md already defines: a `#FFFFFF` stroke on a
`#0A0A0A` ground, with the manifest colours following. This is the one place where the
acid signal was doing identity work rather than state work, so losing it costs a
recognisable colour — but a mark that is the only colour on an explicitly monochrome site
would read as an oversight rather than a signature. The chevron geometry is unchanged; it
is already the right shape for a converter, and it carries the identity on its own.

Regenerated: `src/app/icon.svg`, `public/icons/icon-192.png`,
`public/icons/icon-512.png`, `public/icons/icon-192-maskable.png`,
`public/icons/icon-512-maskable.png`, and the two colour fields in `src/app/manifest.ts`
(whose explanatory comment about the dark surface/signal pairing is rewritten to match).

---

## 5. Information architecture

### 5.1 Route map

**Rebuilt onto templates**

| Route | Template | Source |
|---|---|---|
| `/` | `EditorialPage` | `TOOLS`, `COLLECTIVES`, `SAMPLES` |
| `/tools` | `HubPage` | `TOOLS` |
| `/[category]` | `HubPage` | `getToolsByCategory()` |
| `/[category]/[slug]` | `ConverterPage` | `getTool()` |
| `/blog` | `HubPage` | `BLOG_POSTS` |
| `/blog/[slug]` | `ArticlePage` | `getPost()` + MDX |

**New — groups (derived, zero hand-authoring)**

| Route | Source |
|---|---|
| `/groups` | `deriveFormatGroups()` + `deriveTaskGroups()` |
| `/groups/format/[format]` | every tool accepting or emitting that format |
| `/groups/task/[kind]` | every tool sharing a `kind` |

**New — collectives (curated)**

| Route | Source |
|---|---|
| `/collectives` | `COLLECTIVES` |
| `/collectives/[slug]` | `getCollective()` |

**New — marketing, legal, infrastructure**

`/about` · `/how-it-works` · `/privacy` · `/legal/terms` · `/legal/privacy-policy` ·
`/legal/licences` · `sitemap.ts` · `robots.ts`

### 5.2 Why groups live under `/groups/*`

A verb hub at `/compress` would sit at the root, where `/[category]` already claims the
dynamic segment. A static route does win over a dynamic sibling in Next's matcher, so it
would appear to work — and then `generateStaticParams` and `dynamicParams = false` would
interact with it in ways that fail at export time rather than at edit time. Namespacing
under `/groups/*` removes the collision entirely.

### 5.3 Why `/legal/licences` is not ceremonial

The conversion engines carry real attribution obligations — libheif, mozjpeg, libwebp,
libavif, oxipng, ffmpeg, SVGO and mediabunny among them. The page is rendered from
dependency and sample-manifest data rather than hand-maintained prose, so it cannot drift
out of date as engines are added.

### 5.4 `/privacy` versus `/legal/privacy-policy`

Two different documents, deliberately. `/privacy` is the *argument* — the architectural
demonstration that no server exists, that the network-guard test asserts zero bytes leave
the device, and that the claim is mechanically enforced rather than promised.
`/legal/privacy-policy` is the conventional document a visitor or a compliance reviewer
expects to find at a conventional URL. Collapsing them would either bury the argument or
dress it up as boilerplate.

---

## 6. Primitives, templates, and the DRY rule

### 6.1 Primitives — `src/design/primitives/`

| Primitive | Responsibility |
|---|---|
| `DifferenceCursor` | 32px circle, `position: fixed`, `pointer-events: none`, `z-index: 9999`, `mix-blend-mode: difference`, white ground. rAF lerp for lag. `scale(2.5)` on `a`/`button` hover. Mounted once in the root layout; `pointer: fine` only. |
| `Reveal` | Splits text into spans, slides each from `translateY(100%)` to `0` with `--ease` over `--dur-reveal`, staggered. Markup is server-rendered and the animation is pure CSS, so it works without JS and never flashes unstyled. |
| `Marquee` | Full-bleed `overflow: hidden`, duplicated track for a seamless loop, 30s linear infinite, pauses on container hover. |
| `AsymCard` | The A/B/C radius rotation, with an aspect-ratio prop (`5/7` for marquee, `4/3` for grid). |
| `MediaFrame` | `grayscale(100%)` → `grayscale(0%)` plus `scale(1.05)` over 700ms. The only element on the site permitted to show colour. |
| `MonoMeta` | The metadata voice — 14px, uppercase, `0.1em`. |
| `Hairline` | The 1px rule; the system's only elevation device. |
| `ArrowUpRight` | Hover-revealed glyph, top-right of grid items. |
| `DisplayHeadline` | 12vw / 700 / `-0.05em` / `0.9`, with staggered character reveal. |

### 6.2 Templates — `src/design/templates/`

| Template | Shape |
|---|---|
| `EditorialPage` | display hero → marquee → centred statement → two-column project grid → terminal footer |
| `HubPage` | display headline, mono count, then either a project grid or the dense hairline table |
| `ShowcasePage` | `HubPage` plus a showcase band and a live demo |
| `ArticlePage` | prose measure, mono dateline, related reading |
| `LegalPage` | `ArticlePage` at a narrower measure with a mono revision line |
| `ConverterPage` | the instrument, in DESIGN.md's clothes |

Shared chrome: `SiteHeader` — fixed, `mix-blend-mode: difference` so it stays legible over
any ground, lowercase wordmark at 24px/700/tight, plus-icon menu toggle opening a full
overlay nav, 24px padding. `SiteFooter` — `--terminal` band, four columns on desktop
(brand + bio spanning two, then Socials, then Contact), thin `--terminal-rule` top border,
14px copyright and credits.

### 6.3 The DRY rule, stated as an enforceable constraint

> A `page.tsx` may not contain layout. It resolves data from a registry and hands it to a
> template. A shape no template covers means the template gains a prop, or a new template
> is added — never inline JSX in a route.

Enforced by `src/app/__tests__/route-purity.test.ts`: every file matching
`src/app/**/page.tsx` must import from `@/design/templates` and stay at or under **40 lines**.
This is the same mechanism `src/core/registry/__tests__` already uses to keep engine
imports out of page bundles, applied to layout.

---

## 7. Data layer

### 7.1 Samples — `src/content/samples/`

A manifest over real files in `public/samples/`. Each entry:

```
id            stable identifier, e.g. "coastline-heic"
source        path under /samples — the real file a demo converts
thumb         small pre-derived thumbnail for marquee and grid
bytes         source size
mime, ext     format identity
dimensions | duration
licence       REQUIRED
credit        REQUIRED
formats       which registry formats this sample satisfies
```

`licence` and `credit` are required fields precisely so a sample cannot enter the repo
without provenance, and `/legal/licences` renders from the manifest rather than from
memory.

**Conformance test:** every sample has both a `source` and a `thumb`; every thumbnail is
at or under **24 KB**; every `formats` entry corresponds to a format some registered tool
accepts or emits.

**Service worker:** `scripts/generate-sw.mjs` gains `samples/` in `EXCLUDED_PREFIXES`,
alongside the existing `ffmpeg/`. Precaching them would make the first visit pay for every
sample on the site before rendering a single page.

### 7.2 Collectives — `src/content/collectives/`

```
slug, title, deck, statement (editorial prose)
tools     member tool ids
hero      sample id
demo      { toolId, sampleId }
related   blog slugs
```

A conformance test resolves every `toolId` through `getTool()`, every sample id through
the manifest, and every blog slug through `getPost()` — mirroring
`src/content/blog/__tests__/conformance.test.ts`.

Initial set (task-shaped, not format-shaped):

- **Off the iPhone** — HEIC→JPG/PNG/WebP, strip EXIF
- **Ship a website** — favicon pack, optimise SVG, PNG→WebP, compress JPG
- **Rescue a course video** — MLW→MP4, trim, frame extract, audio extract
- **Strip your metadata** — remove EXIF/PNG metadata, GPS scrub

### 7.3 Groups — derived, no registry

`src/core/registry/groups.ts` exports `deriveFormatGroups(TOOLS)` and
`deriveTaskGroups(TOOLS)`, each producing `{ id, label, tools }`.

A group page's body is a real comparison table built from registry facts — what converts
in, what comes out, which paths are lossless, which stream, which carry a heavy download.
That is genuine information rather than a thin doorway, and it cannot go stale, because a
new tool changes the table by existing.

An optional `GROUP_NOTES` map keyed by format or kind allows an editorial paragraph for a
high-value format. Absence is the default and is fine; no group is blocked on prose.

### 7.4 Marketing and legal — `src/content/pages/`

MDX bodies with the same `meta.ts` shape as blog posts, reusing the MDX pipeline and the
content components already registered in `src/mdx-components.tsx`
(`Callout`, `FAQ`, `ComparisonTable`, `ToolCTA`, `RelatedReading`).

### 7.5 `sitemap.ts`

Derived from `TOOLS`, `BLOG_POSTS`, `COLLECTIVES`, both group derivations, and the static
page list — so a new tool or kit enters the sitemap without anyone remembering to add it.

---

## 8. Showcases and live demos

### 8.1 What a live demo is

`<LiveDemo toolId sampleId />` runs a real conversion. Not a recording, not a pre-baked
result, not an animation of one.

**At rest** it renders the sample's thumbnail in a `MediaFrame` plus a mono `RUN DEMO`
affordance. No engine module, no WASM, no sample bytes are fetched. A page carrying three
demos costs nothing until one is clicked.

**On activation** it fetches the sample same-origin and runs it through the same
`runJob` pipeline `ToolClient` uses, then prints the real readout: input → output bytes,
delta, fidelity state, elapsed time, and whether streams were copied or re-encoded.

**The result** lands in a `MediaFrame`, which makes DESIGN.md's signature interaction
literal: hovering a converted result reveals it in true colour, and that colour is the
only colour on the site, arriving exactly as DESIGN.md specifies — from the photography.

### 8.2 Two refusals, built in

- **Demos never auto-run.** Activation is always a user action.
- **No demo for a heavy-download tool.** Any tool declaring `heavyDownloadMb` — currently
  the 31MB ffmpeg tier — gets a static specimen instead. Without this, a click would
  silently spend 31MB of someone's connection on a decoration.

### 8.3 The network guard already permits this

`e2e/network-guard.ts` treats a same-origin `GET`/`HEAD` with no body, of resource type
`image` or `fetch`, as the app loading itself rather than as bytes leaving the device.
Fetching `/samples/*` fits that shape exactly. The guarantee is unweakened: the guard
still fails the build on any cross-origin request whatsoever, and on any same-origin
request carrying a body.

A Playwright spec runs a live demo end-to-end under the guard, so this stays true rather
than merely being true today.

### 8.4 Showcase band

Non-interactive, above the demo: an `AsymCard` grid or marquee of the member tools with
their sample specimens, each linking to its converter. Used by both group and collective
pages.

---

## 9. Converter rebuild

`src/app/[category]/[slug]/ToolClient.tsx` currently carries single-file state, batch
state, streaming, notices and heavy-download gating in roughly 700 lines. It is past the
point of being reasonable to hold in one piece, and the route-purity rule will not admit
it as-is.

**Split:**

- `useConversion(tool)` — load, convert, cancel, save, stream, notices
- `useBatchConversion(tool)` — batch queue, per-row state, zip-all
- `ConverterPage` template — layout only
- Instrument components re-skinned to §4.5's state model

**The constraint that governs this step.** Every `data-testid` the Playwright suite drives
— `result`, `streamed`, `notices`, and the rest — survives verbatim. E2E specs may change
where they assert *appearance*. Where they assert *behaviour*, a failing test means the
rebuild broke something and the rebuild is wrong, not the test. That distinction is what
separates a re-skin from a regression, and it is the reason the existing suite is worth
having.

**The page gains, entirely from registry data:** a display-scale hero from `tool.seo.h1`, a
sample showcase, an FAQ block from `tool.seo.faq`, related tools from `tool.seo.related`,
and related reading from `getPostsByTool()`. Nothing per-tool is hand-written, so the v1
invariant survives the rebuild intact.

---

## 10. Testing

Added to the existing gate:

| Test | Asserts |
|---|---|
| token monochrome | no hex outside the monochrome set in `tokens.css` |
| route purity | every `src/app/**/page.tsx` imports a template and stays at or under 40 lines |
| collectives conformance | every tool id, sample id and blog slug in `COLLECTIVES` resolves |
| sample manifest conformance | every sample has source, thumb, licence, credit; thumbs within budget |
| group derivation | every tool appears in at least one format group and exactly one task group |
| live demo e2e | a demo converts a real sample end-to-end with the network guard attached |
| reduced motion e2e | reveals resolve instantly and the marquee is paused under `prefers-reduced-motion` |

`pnpm ci` — typecheck, Biome, Vitest, static build, Playwright — remains the gate, and
every sequencing step below ends green through it.

---

## 11. Sequencing

Eight steps. Each is independently shippable and ends green.

1. **Design layer.** Tokens, primitives, chrome, cursor, motion, a11y guardrails, unit
   tests. Nothing consumes it yet, so nothing can break.
2. **State-model refactor.** The three semantic colours out of all 13 source files; brand mark and manifest
   regenerated; typographic
   state in; `FidelityScore` test updated.
3. **Templates** plus the route-purity test.
4. **Existing routes rebuilt** onto templates: `/`, `/tools`, `/[category]`,
   `/[category]/[slug]`, `/blog`, `/blog/[slug]`.
5. **Samples registry, `LiveDemo`, showcase band.**
6. **New route families:** groups (derived), then collectives (curated).
7. **Marketing, legal, sitemap, robots.**
8. **Full pass** — `pnpm ci`, with the network guard re-run specifically against pages
   carrying demos.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **Page weight.** DESIGN.md is image-led; a marquee pulling a dozen full samples makes a heavy landing page. | Marquee and grid use committed thumbnails capped at 24 KB, asserted by the manifest test. Only a clicked demo fetches an original. Samples are excluded from the SW precache. |
| **The rebuild silently regresses conversion behaviour.** | Every behavioural `data-testid` preserved; e2e specs may only change where they assert appearance. |
| **The custom cursor degrades touch or keyboard use.** | Cursor is `pointer: fine` only; keyboard focus gets a real 1px outline; reduced-motion disables interpolation. |
| **A monochrome palette flattens the lossless/lossy distinction** — the product's core honesty claim. | State is re-encoded, not removed: solid versus dashed stroke, fill level, and an explicit mono label. Reviewed as a defect if any state is distinguishable by label alone. |
| **New route families drift from the registry** and become hand-maintained pages. | Groups are derived with no registry at all; collectives are conformance-tested; route purity is asserted mechanically. |
| **Export-time route collision** between a root-level verb hub and `/[category]`. | Groups namespaced under `/groups/*`; no static route is added at the root. |

---

## 13. Open input

**Sample file provenance.** The manifest requires `licence` and `credit`, and the size
budget, thumbnail plumbing and licence page are all specified above. Sourcing the actual
photography is not something this implementation can do.

**Default taken, revisable without code change:** the repo ships generated placeholder
specimens so that every page renders, every demo runs a genuine conversion, and every test
passes. Swapping in CC0 or owned photography later is a manifest edit and a file drop —
no component, template or test changes.

---

## 14. Relationship to the v1 spec

[`2026-08-07-convrtr-design.md`](./2026-08-07-convrtr-design.md) §6 prohibited, as review
defects: gradients, glows, blur, decorative shadows, emoji icons, stock illustration, 3D
blobs, floating rounded cards on tinted backgrounds, and centred marketing heroes. It also
fixed radius at ≤4px and motion at 120–220ms.

DESIGN.md requires a centred display hero, 100px asymmetric radii, and 500ms–1s motion.
**DESIGN.md governs.** §6 of the v1 spec is superseded in full by §4 of this document.

The prohibitions that do *not* conflict remain in force and are treated as review defects:
no gradients, no glows, no blur or glassmorphism, no decorative shadows, no emoji icons,
no stock illustration, no 3D blobs, no component library's visual identity showing through.
Elevation is still a 1px hairline and never a shadow.

Everything else in the v1 spec — the module boundaries, the engine layer, the error
taxonomy, the fidelity model, the performance budget, and the privacy guarantee enforced
by test — is unchanged and still binding.
