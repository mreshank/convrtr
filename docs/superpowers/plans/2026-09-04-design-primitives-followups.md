# Follow-ups from the design primitives

Raised while executing [`2026-09-04-design-primitives.md`](./2026-09-04-design-primitives.md)
(Plan 2 of 5 of the [editorial overhaul](../specs/2026-09-04-convrtr-editorial-overhaul-design.md)).
Each was found by review, judged out of scope for that plan, and deliberately not fixed.
Recorded here because the plan's working notes were git-ignored scratch and the findings are not.

Ordered by what Plan 3 will hit first.

---

## 1. There is no spacing or type scale, and six templates are about to be written against literals

**This is the most consequential item on the list.**

Colour, radius, easing and duration are closed sets, each with a sweep that fails the build
on a stray literal. Spacing and the type ramp are not, and nothing sweeps them — so both
chrome components hand-roll every dimension.

The clearest symptom: `14px` is a token (`--mono-size`, `tokens.css`) *and* a literal in
`SiteFooter.tsx`, which is the file that imports `MonoMeta`, whose `.meta` class is that
token. `SiteHeader` writes `24px` padding, a `24px` wordmark and `clamp(32px, 8vw, 96px)`
links.

Two components produced three ad-hoc scales. Plan 3 writes **six templates**. Decide the
scale before that, or the drift stops being recoverable.

## 2. Eight of eleven components accept no `className` or `style`

Only `Hairline` and `Reveal` do. A template composing `MonoMeta` + `Hairline` + `AsymCard`
into a grid has no way to give any of them a margin except by wrapping each in a `<div>` —
which is how a primitive set acquires a layer of wrapper divs it never sheds.

Decide deliberately: either primitives take a `className`, or layout is always the
template's job and the wrappers are the intended idiom. Either is defensible; drifting into
the second by accident is not.

## 3. `--ink-faint`'s contrast ceiling is still undischarged

Plan 2 claimed this as one of the Plan 1 follow-ups it owned, and stated the rule in prose
(*use only at ≥18.66px or bold* — `#737373` is 4.43:1 on white, below WCAG AA for normal
text). No primitive uses it, no guard enforces it, and no test would notice.

Plan 3 builds the metadata rows DESIGN.md calls "secondary metadata", which is exactly when
someone reaches for it. Plan 1 also asked for a **declared-but-unconsumed token guard**,
which was never added; `--ink-faint` is currently its only would-be finding. Both belong in
Plan 3's *first* task, not its last.

## 4. Traps waiting in the primitives

- **`Marquee` assumes its content is at least viewport-wide.** Narrower content leaves a
  visible gap at the wrap. Undocumented.
- **`Marquee`'s `width: 100%` is not true full-bleed.** It fills its parent; edge-to-edge is
  the page layout's job, so `EditorialPage` owns it.
- **`[data-arrow-host]` is a hook nothing sets.** `ArrowUpRight` is inert unless a template
  puts that attribute on its container, and neither the barrel nor the docstring says so.
- **`SiteFooter`'s grid is not the four columns the spec asks for.**
  `repeat(auto-fit, minmax(200px, 1fr))` yields six or seven at desktop widths, three of
  them empty. *Plan-mandated* — the plan's own code was identical.
- **The focus trap enumerates the nav with `querySelectorAll("a")`.** A `<button>` added
  inside the overlay would sit outside the loop and leak forward.
- **The server-component guard's directories are hardcoded** to `primitives/` and `chrome/`.
  Plan 3 creates `templates/`, which the guard will not see — and a template is the most
  likely place for an accidental `"use client"`, since it composes both kinds.

## 5. Copy `SiteFooter`, not `ErrorPanel`

Both invert by redefining tokens locally, and they use the same idiom — but `ErrorPanel`
carries dead code. It restates `color` on each button, justified by a comment claiming a
`<button>` does not inherit colour from its parent. That is false in this project: Tailwind
preflight sets `color: inherit` on `button`. `SiteFooter`'s stricter "no descendant colour
at all" is the correct expression of the pattern.

`SiteFooter`'s guard is stated absolutely, though — *every* descendant must have
`style.color === ""`. If Plan 3 puts a `<button>` in the footer and someone applies
`ErrorPanel`'s unnecessary fix, that test fails and reads as "the pattern is wrong" rather
than "the fix is obsolete". Worth a comment naming the preflight dependency it rests on.

## 6. Performance, before the landing page

`MediaFrame` sets `will-change: filter, transform` permanently, so every frame holds a
compositor layer for the life of the page whether or not it is ever hovered — and `Marquee`
renders its children **twice**. The spec already lists page weight as a risk for this exact
component. Move `will-change` into the `:hover`/`:focus-within` rule, or drop it, before a
dozen land on the landing page.

## 7. Smaller

- **`[data-reveal] { overflow: hidden }` with `line-height: 0.9` will clip descenders** on
  display type. It will show on the first headline containing a `g` or `y`.
- **`Reveal` outside a heading announces as a graphic.** `role="img"` is the right licence
  for `aria-label`, but a revealed *paragraph* is announced as an image. `DisplayHeadline`
  could instead put the label on the heading and hide the whole `Reveal`.
- **`Reveal` word-splitting edge cases:** `"a  b"` yields an empty fragment; `[...text]`
  splits combining marks off their base character.
- **`transition-delay` is the symmetric sibling** the reduced-motion block does not collapse.
  Nothing sets one today, but the argument that justified collapsing `animation-delay`
  applies verbatim.
- **The three outer/inner hook conventions differ:** `data-reveal`/`data-reveal-part`,
  `data-marquee-viewport`/`data-marquee`, `data-arrow-host`/`data-arrow`. Same
  parent-drives-child relationship, three suffix schemes — and the marquee's is inverted
  relative to the other two.
- **`LITERAL_HEX_ALLOWED` is file-scoped, not value-scoped.** Any future hex in the two
  allowlisted files passes. Plan 1's follow-ups flagged the same shape for `manifest.ts`.
- **The barrel guard has no floor assertion for `chrome/`.** If that directory moved,
  `it.each([])` registers zero tests and the guard goes quiet on that half.
- **`SiteFooter` uses `next/link` for `mailto:` and external `https://` hrefs.** A plain
  `<a>` is the honest element for a non-route destination.
- **The `"use client"` detector** matches only when the directive is the first non-whitespace
  content; a leading comment would evade it, though the codebase's convention runs the other
  way.
- **No e2e covers reduced motion or the cursor**, because neither has a consumer yet. The
  spec lists a reduced-motion e2e; Plan 3 is when it becomes writable.

## 8. Recorded deviations

- **Spec §4.6's "image hovers reduce to opacity alone" was reinterpreted, not met.**
  `MediaFrame` suppresses the transform under reduced motion (correct) but the
  grayscale→colour change still happens instantly, and no opacity is involved. Defensible —
  an instant colour change is not motion — but it is a reinterpretation and is on the record
  as one.
- **DESIGN.md's cursor `border: 1px solid black` was dropped.** Under difference blending a
  black rim composites to the backdrop and is invisible, and under `box-sizing: border-box`
  it would shrink the inverting disc from 32px to 30px. Verified in Chromium. The omission
  serves DESIGN.md's stated intent better than compliance would, but it is a DESIGN.md
  detail that fell out between documents.
