# convrtr — Void Terminal Glass

**Date:** 2026-09-07
**Status:** Approved, pending implementation plans
**Governing brief:** [`DESIGN.v2.md`](../../../DESIGN.v2.md)

**Supersedes:** §4 (design system) and §6 (primitives, templates, chrome) of
[`2026-09-04-convrtr-editorial-overhaul-design.md`](./2026-09-04-convrtr-editorial-overhaul-design.md).
That document's §5 (route map), §7 (data layer), §8 (showcases and live demos), §9
(converter rebuild) and §10 (testing) are structural rather than visual and **stand
unchanged** — routes, registries and demo mechanics do not depend on which design system
paints them.

**Also superseded:** `DESIGN.md` in its entirety, as the governing visual brief.

---

## 1. What changed, and what it costs

`DESIGN.v2.md` — "Void terminal glass" — replaces `DESIGN.md`. It is not a revision of the
monochrome editorial system; it is a different one. A black-dominant developer-tool
aesthetic with a rationed mint accent, sharp zero-radius components, monospace data
readouts, and one pale-mint band that interrupts the void for data-heavy proof content.

Two plans are already merged against the old brief: the monochrome token layer with
state-as-stroke, and nine primitives plus the site header and footer.

**The migration is affordable for one reason:** every component references tokens, never
literals. Audited across all eleven — `AsymCard` reaches only for `--radius-card*`,
`MediaFrame` only for `--dur-hover`/`--ease`, `SiteFooter` for the ground/ink/terminal set.
Nothing hardcodes a colour or a size. So the architecture survives a system swap; the values
are what change.

**v2 also retains three things verbatim** from `DESIGN.md`: the interactive difference
cursor, the asymmetrical marquee cards at 100px/40px, and the infinite marquee at aspect
5/7. Those components ship unchanged.

---

## 2. Decisions taken

| # | Question | Decision |
|---|---|---|
| 1 | `DESIGN.md` or `DESIGN.v2.md`? | **v2 governs, followed as written.** |
| 2 | Fidelity was re-encoded as stroke because `DESIGN.md` banned colour. v2 permits a rationed accent. | **Stroke stays primary; mint reinforces `LOSSLESS` only.** |
| 3 | v2 is dark-mode-default; the product ships a light/dark/system toggle. | **One canvas. The toggle is deleted.** |
| 4 | v2's frontmatter says `card: 4px`; its prose, guardrails and every card component say 0px. | **Cards are 0px.** See §4. |
| 5 | Retune the merged components, or rebuild the design layer? | **Retune.** v2 explicitly retains most of them, and rebuilding would discard reviewed, tested code for no gain. |

### 2.1 On the fidelity decision

Decision 2 was taken with a known cost stated and accepted: v2 rations mint to CTAs, code
tokens and icon glyphs, so spending it on fidelity risks the accent reading as *"this is the
action"* where it means *"this is intact."*

**Mitigation, and it is load-bearing:** the two uses take different *shapes*. A CTA is a
mint **pill fill**. The lossless ring is a mint **stroke tint** on an otherwise ink ring.
Hue is shared; form is not. Any implementation that fills the ring, or that outlines a CTA,
collapses the distinction and is a defect.

Stroke remains the primary encoding, so fidelity survives greyscale, colour-blindness and a
printed page. Mint is reinforcement, never the signal.

### 2.2 On deleting the theme toggle

v2 describes a single canvas. Its one pale-mint band is a section treatment — its own
guardrail calls it *"a rare inversion, not a default alternate background"* — not a mode.
Nothing in v2 describes a light theme.

This removes shipped, tested functionality: `ThemeToggle`, `ThemeScript`, `src/lib/theme.ts`,
the dual-theme token blocks and their parity tests. It is recorded here rather than buried
because it is user-facing.

If a light mode is later wanted, v2 supplies its own derivation without inventing anything:
`#E4F1EB` ground with `#131415` ink, which is exactly what it specifies for the pale band.

---

## 3. The token layer

Same architecture, new values. Names change only where v2 introduces a concept the old
system lacked.

### 3.1 Colour

| Token | Value | Role |
|---|---|---|
| `--ground` | `#000000` | the canvas; v2 puts it at ~63% of the page |
| `--surface` | `#111315` | raised panels, code blocks |
| `--surface-alt` | `#E4F1EB` | the one pale band, one section at a time |
| `--ink` | `#FFFFFF` | primary text |
| `--ink-muted` | `#94979E` | the gray continuation clause; secondary body |
| `--ink-inverse` | `#131415` | text on `--surface-alt` |
| `--rule` | `#303236` | borders — felt rather than seen |
| `--rule-subtle` | `#18191B` | the quieter divider |
| `--accent` | `#34D59A` | rationed: CTA fills, icon glyphs, code tokens, lossless tint |
| `--accent-hover` | `#47D18C` | |

`--terminal`, `--terminal-ink` and `--terminal-rule` are **retired**. Their job — naming the
inverted band — passes to `--surface-alt` / `--ink-inverse`, with the direction reversed:
the site is now black and the band is light.

**Red and amber are not tokens.** v2 admits them only as semantic chart states — a spike
colour and a warning triangle — never as UI chrome. Any component needing them declares them
locally with a comment, or does without.

### 3.2 Radius — and the contradiction resolved

v2's frontmatter says `card: "4px"`. Its Layout section says *"All corners in this system are
0px except pills and the tiny status dots."* Its Guardrails say *"Never round the
feature-grid or panel cards — 0px radius is structural."* And all five of its card and button
component entries specify `radius: 0px`.

One frontmatter key against prose, a guardrail, and five components — while its sibling key `control: "4px"` is honoured. **Cards are 0px.**

| Token | Value | Applies to |
|---|---|---|
| `--radius` | `0` | everything structural — cards, panels, grids, media |
| `--radius-control` | `4px` | nav-utility buttons only (v2 gives them 23px height, 0/14px padding) |
| `--radius-pill` | `9999px` | pills, CTAs, status dots |
| `--radius-card` | `40px` | **marquee cards only** |
| `--radius-card-lg` | `100px` | **marquee cards only** |

The last two are v2's own Special Components, retained verbatim. The guardrail forbids
rounding *feature-grid and panel* cards; marquee cards are neither. `AsymCard` therefore
survives unchanged, scoped to the marquee — which is the only place it was ever used.

### 3.3 Type

Inter throughout, at two negatively-tracked display sizes, plus a mono face and a rare serif.

| Token | Value |
|---|---|
| `--display-size` / `--display-tracking` / `--display-leading` | `68px` / `-2.7px` / `1.13` |
| `--headline-size` / `--headline-tracking` | `48px` / `-1.9px` |
| `--body-size` / `--body-leading` | `16px` / `1.5` |
| `--label-size` / `--label-tracking` / `--label-weight` | `16px` / `-0.4px` / `500` |
| `--mono-size` | `13px` |

Display and headline are **weight 400**, not 700 — v2 is explicit, and this is a real
departure from the old system's 700.

**Faces:** Inter (self-hosted via `next/font`, as now). **GeistMono** replaces IBM Plex Mono
— v2 names it, and it is the system's accent face wherever "developer tool" needs signalling.
Times New Roman appears only as a rare small inline accent; it needs no self-hosting.

Retiring IBM Plex Mono raises a question about the tabular figures the converter's live byte
and time readouts depend on — without them, digits jitter while a conversion counts. The risk
is smaller than it first looks: Geist Mono is a true monospace, so its digits are fixed-width
by construction and `font-variant-numeric: tabular-nums` is belt-and-braces rather than the
mechanism. **Two things still need verifying before the swap lands:** that Geist Mono is
reachable through `next/font/google` at all (an external stylesheet link would puncture the
zero-third-party-request guarantee), and that a counting readout renders without shift. If
either fails, IBM Plex Mono stays and the deviation is recorded.

### 3.4 Motion

v2's motion is fast and diagrammatic, not editorial. This inverts the old system entirely.

| Token | Value | Applies to |
|---|---|---|
| `--ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | the only easing |
| `--dur-fade` | `150ms` | opacity |
| `--dur-hover` | `200ms` | colour and background |
| `--dur-state` | `300ms` | compound state changes — hover fills, borders |
| `--dur-marquee` | `30s` | the scrolling rail |

`--dur-min` (the old 500ms hover floor) is **retired** — it was `DESIGN.md`'s rule and v2
contradicts it directly. `--dur-reveal` drops from `1s` to `--dur-state`.

**The reduced-motion handling survives unchanged**, including the two hard-won details: the
`0.01ms` duration rather than `0` so `animationend` still fires, and the `animation-delay`
collapse without which staggered reveals still play out in full.

### 3.5 Layout — the scale that was missing

Plan 2's follow-ups named the absent spacing and type scale as the single most consequential
gap, and warned that six templates written against literals would not be recoverable. v2
supplies it outright.

| Token | Value |
|---|---|
| `--space-base` | `8px` |
| `--gap-sm` / `--gap-md` / `--gap-lg` | `12px` / `24px` / `80px` |
| `--section-pad` | `240px` |
| `--max-width` | `1600px` |
| `--grid-gap` | `128px` (paired-panel bands) |
| `--navbar-height` | `64px` |

A sweep enforces these the way the palette is enforced: a literal `px` spacing value in a
component fails the build, with an allowlist for the handful v2 fixes per-component (button
heights of 44px/36px/23px, and the marquee card radii).

---

## 4. Component migration

### 4.1 Retune only — eight components

`Hairline` · `MonoMeta` · `Reveal` · `DisplayHeadline` · `Marquee` · `AsymCard` ·
`ArrowUpRight` · `DifferenceCursor`

Token values change; code barely moves. Two notes:

- **`DifferenceCursor` is retained verbatim by v2** — same 32px circle, same difference
  blend, same 2.5× hover. Every guardrail it carries stays: `cursor: none` applied by the
  component at runtime so a visitor without JavaScript keeps a pointer; nothing rendered on a
  coarse pointer; interpolation dropped under reduced motion; and position on the individual
  `translate` property, never `transform`, because `scale` multiplies a translation living in
  `transform` and throws the cursor off screen.
- **`DisplayHeadline` changes weight** from 700 to 400 and its size from `12vw` to a fixed
  `68px`. Fluid-to-fixed is a real behavioural change at small viewports and needs a
  responsive answer, not a bare token swap.

### 4.2 Rewrite — two components

**`MediaFrame`.** v2 replaces the grayscale→colour hover with *"images fading to theme on an
angle by default."* That is a different mechanism — a directional mask blending the image
into `--ground`, not a filter removed on hover. The old behaviour's reduced-motion exception
(suppress the transform, not just the duration) has no equivalent here and is retired with it.

**`SiteHeader`.** v2 specifies a 64px sticky edge-to-edge navbar at `#000000` with 0px
corners, a logo, grouped nav dropdowns as transparent 4px-radius 23px-tall controls, a text
log-in link, and a `#FFFFFF` pill CTA at 36px. That is not a difference-blended bar with a
full-screen overlay.

**What must survive the rewrite:** the focus containment. The overlay nav was given a trap
across `[wordmark, toggle, ...links]` with body-scroll lock, because the overlay is opaque
and full-viewport and this header mounts on every page. If v2's navbar keeps any overlay or
dropdown that covers content, it inherits that requirement.

### 4.3 Re-anchor — one component

**`SiteFooter`.** The local-token-redefinition inversion pattern survives intact and is the
right pattern — it was chosen because hand-inverting left the page's `--ink` in scope, so the
global `:focus-visible` outline drew black on black. Only the direction flips: the site is
black by default, so the footer either stays on `--ground` or becomes a `--surface-alt` band.

v2's own footer is `#000000` with a four-column link list, a compliance badge row and a mint
status dot — so it stays on the canvas, and the inversion pattern moves to whichever band
uses `--surface-alt`.

### 4.4 Deleted

`ThemeToggle` · `ThemeScript` · `src/lib/theme.ts` · dual-theme token blocks · theme parity
tests · `--terminal*` tokens · `--dur-min`.

---

## 5. What v2 adds that does not exist yet

A bar-chart data-visualisation hero. Dot-matrix grain over the top strip and behind code
panels. The fused bold/gray headline pattern — a bold opening clause and a muted continuation
**on the same line**, which v2 guards explicitly against being split into a subhead. Terminal
and code panels in GeistMono. A five-up feature strip. A 3×2 uniform feature grid with
hairline dividers. A logo strip. A compliance badge row with a mint status dot. Branching
diagram graphics.

This is a plan of its own, not an appendix to the migration.

---

## 6. Sequence

1. **Migration** — token layer, radius set, the two rewrites, the re-anchor, the deletions.
   Ends green through `pnpm run ci`.
2. **v2 component families** — everything in §5.
3. **Templates and the existing-route rebuild** — the prior spec's §6.2 templates, retargeted.
4. **Samples, live demos, groups and collectives** — prior spec §7 and §8, unchanged.
5. **Marketing, legal, sitemap** — prior spec §5, unchanged.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| **Geist Mono may not be reachable through `next/font`**, and a CDN link would puncture the zero-third-party-request guarantee the product rests on. | Verify self-hosting in the build output, exactly as the Inter swap was verified. If it cannot self-host, keep IBM Plex Mono. |
| **`68px` fixed display type** replaces a fluid `12vw` and will overflow narrow viewports. | A responsive answer is part of the migration, not an afterthought. |
| **Mint means two things** — primary action and lossless. | Enforced by shape: pill fill versus stroke tint. Filling the ring or outlining a CTA is a defect. |
| **The theme toggle's deletion is user-facing.** | Recorded in §2.2 with v2's own derivation for restoring a light mode. |
| **A second design-system swap could happen again.** | Every component already references tokens rather than literals, which is what made this migration affordable. That discipline is the mitigation; the sweeps enforce it. |
| **The prior spec is now partly superseded**, and a reader may follow the wrong half. | The header of this document states exactly which sections stand and which do not. |

---

## 8. What carries over unchanged

Worth stating plainly, because it is most of the engineering value built so far:

- **The registry-derived architecture.** Adding a conversion still touches only
  `core/registry`, never `src/app`.
- **The privacy guarantee**, enforced by a Playwright assertion that no file byte leaves the
  device.
- **The guard tests** — palette closure, radius set, border weight in two syntaxes,
  dangling-variable references, the server-component allowlist, the orphan guard. Their
  *values* change; their mechanism does not.
- **The fidelity honesty model**, including the open defect recorded in the monochrome
  foundation's follow-ups: twenty tools whose preset `params` do not encode what their `id`
  and `label` claim, so a genuine stream copy reports `LOSSY` at a placeholder score of 50.
  That is a `core/quality` defect, untouched by any design system, and still the most
  serious outstanding issue in the product.
