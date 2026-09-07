---
version: "superdesign-alpha"
name: "Void terminal glass"
description: "Black-dominant developer-tool system with a bar-chart data-viz hero, rationed mint accent, sharp-cornered utilitarian components, and a rare pale-mint content band breaking the void."
colors:
  background: "#000000"
  surface: "#111315"
  surface-alt: "#E4F1EB"
  text-primary: "#FFFFFF"
  text-secondary: "#94979E"
  border: "#303236"
  border-subtle: "#18191B"
  accent: "#34D59A"
  accent-hover: "#47D18C"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "68px"
    fontWeight: 400
    lineHeight: "1.13"
    letterSpacing: "-2.7px"
  headline-md:
    fontFamily: "Inter"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: "1.13"
    letterSpacing: "-1.9px"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
  label-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "1.5"
    letterSpacing: "-0.4px"
  label-mono:
    fontFamily: "GeistMono"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.5"
  accent-serif:
    fontFamily: "Times New Roman"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
spacing:
  base: "8px"
  gap-sm: "12px"
  gap-md: "24px"
  gap-lg: "80px"
  section-padding: "240px"
rounded:
  control: "4px"
  card: "4px"
  pill: "9999px"
components:
  button-hero-primary:
    background: "#FFFFFF"
    text-color: "#000000"
    radius: "9999px"
    height: "44px"
    note: "observed near-white solid pill, approximate corners"
  button-hero-secondary:
    background: "transparent"
    text-color: "#FFFFFF"
    radius: "9999px"
    height: "44px"
    border: "1px solid #303236"
  button-nav-utility:
    background: "transparent"
    text-color: "#FFFFFF"
    radius: "4px"
    height: "23px"
    padding: "0px 14px"
  button-mint-fill:
    background: "#E4F1EB"
    text-color: "#131415"
    radius: "0px"
    height: "44px"
    padding: "0px 16px"
    hover-background: "#F6FDFA"
  button-outline-square:
    background: "#FFFFFF"
    text-color: "#18191B"
    radius: "0px"
    height: "44px"
    padding: "12px 16px"
    border: "1px solid #18191B"
  button-terminal-accent:
    background: "#34D59A"
    text-color: "#000000"
    radius: "9999px"
    height: "44px"
    padding: "0px 28px"
    hover-background: "#47D18C"
  navbar-cta:
    background: "#FFFFFF"
    text-color: "#000000"
    radius: "9999px"
    height: "36px"
  card-panel-media-right:
    background: "transparent"
    radius: "0px"
    padding: "0px"
  card-media-top-bleed:
    background: "transparent"
    radius: "0px"
    padding: "0px"
  card-feature-grid:
    background: "transparent"
    radius: "0px"
    padding: "0px"
    border: "1px solid #303236"
---
# Void terminal glass
Source: https://neon.com/

## Overview
This is a dark-mode-default developer-tool aesthetic: a near-total black canvas (background pixel share ~63% #000000, plus deep near-blacks #181818/#111315) carrying sharp, zero-radius utility components, monospace data readouts, and a single mint-green accent (#34D59A) rationed to CTAs, chips, and code tokens. The system borrows from Swiss/International rigor — tight Inter display type at negative tracking, ruled dividers, left-aligned eyebrow labels — but its texture layer (dot-matrix grain, glowing vertical bar-chart bands, branching diagram lines) gives it a technical, terminal-adjacent character closer to infrastructure dashboards than marketing gloss. One pale-mint surface band (#E4F1EB, ~56% of its own section) interrupts the black field mid-page, proving the system is not monochrome-only — it holds a second, light "paper" mode for data-heavy proof sections.

## Composition
The first screen stacks: a full-width dark utility banner, an edge-to-edge black navbar, a center-left-aligned eyebrow + two-line 68px display headline, a pill-button pair, then a five-card feature row bleeding into the fold — establishing content-first density immediately rather than a pure-hero pause. Below the fold the rhythm alternates: a logo strip on black, then a sequence of full-bleed 240px-padded content bands that swap background between black and the pale-mint surface, each headed by a small dotted-grid glyph + a two-clause headline (bold clause + gray clause). The deliberate choice is a headline pattern that fuses a bold statement with a muted explanatory continuation in the same line — rejecting the alternative of a separate small subhead below; this keeps vertical rhythm tight while still carrying two levels of hierarchy in one text block.

## Colors
Black (#000000) is the background at ~63–76% combined with near-black (#181818, #111315) — this is a true dark-mode-default page, not a gradient hero. Pale mint (#E4F1EB) is the second dominant surface (~2% of the full pixel field but a full section's fill), functioning as an inverted "paper" band for data-visualization proof content — text ink flips to near-black (#131415/#18191B) here. Text-primary is pure white (#FFFFFF); text-secondary is a cool gray (#94979E) used for the muted continuation clause in every headline. Borders are near-invisible dark grays (#303236, #18191B), keeping structure felt rather than seen. The mint accent (#34D59A, and its token sibling #CAE6D9) is rationed strictly to: the terminal-styled CTA fill, small icon glyphs (shield, lightning bolt), inline code keyword tokens, and thin data-chart strokes — never washed across a full section. Red and amber appear only as semantic chart states (a spike/error color and a warning triangle), never as UI chrome.

## Typography
Inter carries the entire system at two negatively-tracked display sizes: 68px/400/lh1.13/ls-2.7px for the hero, 48px/400/lh1.13/ls-1.9px for every subsequent section headline — both using the bold-clause/gray-clause fusion pattern. Body copy sits at 16px/400/lh1.5 in white, dropping to the #94979E gray for secondary description. Labels are 16px/500/ls-0.4px, used for card eyebrows and nav items. A monospace family (GeistMono) appears in code panels, terminal timestamps, and the CTA reading a shell command — this is the system's accent face, signaling "developer tool" wherever it appears. A serif (Times New Roman) surfaces only as a rare, small accent weight inside inline text, functioning as a quiet interruption rather than a display face.

## Layout
Content is capped at a 1600px max-width, with generous 240px section padding creating long black voids between bands — a spacious, unhurried rhythm despite the dense feature rows. The hero feature row and several mid-page proof grids use a fixed 2-column layout with a 128px gap, 1 item per side (paired-panel composition: text/diagram left, chart/detail right). The compliance/enterprise-feature grid is a 2-row × 3-column uniform card grid — rows read [30/30/30 | 30/30/30] as equal-width thirds, a strict uniform card grid (not bento, not masonry) separated by hairline dividers. The first-screen five-up feature strip is five equal columns, each pairing a label+body pair over a media tile — uniform width, not variable spans. All corners in this system are 0px except pills and the tiny status dots — a deliberately sharp, technical grid discipline that rejects rounded-card softness in favor of ruled, table-like structure.

## Components
- **Navbar**: edge-to-edge square bar, 100% viewport width (0px inset either side), 64px tall, sticky, fill #000000, 0px corner radii on all four corners (true edge-to-edge classification), holding logo + ~36 total interactive items (grouped nav dropdowns, utility links, social counters) plus a Log-in text link and a signup CTA pill (#FFFFFF fill, #000000 text, radius 9999px, height 36px). Secondary nav-utility buttons (dropdown triggers) are transparent-fill, white text, 4px radius, 23px tall, 0px/14px padding.
- **Hero primary CTA**: an observed near-white/off-white solid pill beneath the headline, ~44px tall, full pill corners — the highest-contrast, most emphasized control on the first screen. Paired with a secondary outline pill (transparent fill, white text, border, same height) immediately beside it — outline variant is secondary, never primary.
- **Five-up feature strip**: first screen, 5 equal columns, each: small bold label + gray descriptive clause (label-md), then a media tile below (autoscaling chart, auth form screenshot, terminal log, node diagram, API call panel) — media covers roughly half the card height, zero radius, transparent card background, no border, no padding (edge-bleeding media).
- **Logo strip**: single row, ~8 monochrome partner marks in flat gray, on black, no dividers, no card chrome — pure trust-signal band.
- **Paired-panel content bands** (×3, one per major feature story): 2-column grid, 128px gap, left column = eyebrow glyph + fused headline + short body, right column = one large data visualization or diagram (bar chart with tooltip callouts, branching timeline diagram, dotted flow lines) — panel background transparent, 0px radius, spans full 1600px container.
- **Enterprise-feature 3×2 grid**: mid-page, 6 cards in 2 rows of 3 equal-width columns (30/30/30 per row), each card: small mint-tinted icon glyph top, bold label + gray body text below, transparent fill, 0px radius, thin border dividers between cells, no padding beyond text inset — no CTA, informational only.
- **Terminal-accent CTA band** (footer proof band): dark background with a branching diagram graphic behind, holding a bold/gray fused headline plus a 3-button cluster: white pill CTA (primary here), outline pill secondary, and a mint-fill pill CTA styled as a shell command (`#34D59A` fill, black text, 9999px radius, 44px height, 0px/28px padding, monospace command text) — hover state lightens to `#47D18C`.
- **Footer**: background #000000, 0px radius, four-column link list (~34 links total) under the logo, plus a compliance badge row (certification labels with small checkmark chips) and a status dot ("all systems operational") in the accent mint.
- **Card family — media-right panel**: transparent, 0px radius/padding, anatomy = full-width panel + right-aligned media + list + body text, used in the "how it works"-style band with two nested tiles inside the media area.
- **Card family — media-top-bleed**: transparent, 0px radius/padding, media image bleeds to the card's top edge with body text below — used in the five-up feature strip.

## Graphics & Effects
A single measured gradient, `linear-gradient(rgba(0,0,0,0) 0%, rgb(0,0,0) 100%)`, covers only a small scrim element (under 1% of the page) — likely a vertical fade beneath a hero graphic or panel edge, not a page-wide wash. Six live video surfaces carry the animated bar-chart/waveform hero graphic, the branching-timeline diagram, and looping terminal/code demos; static stand-ins should use dark radial glows with thin vertical mint/teal bars for the hero and a fine branching-line network graphic for the footer band. A dot-matrix/halftone grain texture overlays the topmost strip banner and recurs faintly behind code-panel graphics — small, angular, dithered, warm-toned in one instance (amber/green halftone) against the black. Elevation is nearly flat: one card-level shadow is a hairline 1px inset-style ring (`lab(100 -0.0000298023 0.0000119209 / 0.05) 0px 0px 0px 1px`), and one popover/tooltip shadow is a soft drop (`rgba(0,0,0,0.4) 0px 8px 20px 0px`) — both subtle, never heavy.

## Motion
Color and background transitions run at `0.2s cubic-bezier(0.4, 0, 0.2, 1)`, opacity fades at `0.15s`–`0.2s` on the same curve, and compound state changes (hover fills, borders) at `0.3s` on the same easing — all fast, snappy, ease-out-in-out settle rather than springy overshoot. Keyframe animations (`infinityScroll`, `move`, `slideUpAndFade`, `slideRightAndFade`, `slideDownAndFade`, `slideLeftAndFade`) drive a continuously scrolling logo/marquee rail and directional slide-and-fade entrances for tooltips and callout chips inside the data-viz panels — motion is functional and diagrammatic, reinforcing the terminal/dashboard character rather than decorative bounce.

# Special Components

## Interactive Difference Cursor
A custom circular cursor that follows the mouse with smooth interpolation and changes appearance based on the underlying color.

Create a 32px diameter circle `div` with `position: fixed`, `pointer-events: none`, and `z-index: 9999`. Apply `mix-blend-mode: difference` and `background-color: white`. Use `requestAnimationFrame` to interpolate movement (lerp) for a 'lagging' smooth effect. On hover of 'a' or 'button' tags, use a CSS transition to `transform: scale(2.5)`.

## Asymmetrical Marquee Cards 
Image containers within the marquee that use non-uniform border-radii to create an organic, editorial feel.

Style project cards with alternating border-radius patterns: Card A: `border-top-left-radius: 100px`. Card B: `border-top-right-radius: 100px; border-bottom-left-radius: 40px`. Card C: `border-radius: 40px`. This breaks the standard grid monotony.

## Infinite Project Marquee

Full-width overflow-hidden section. Items: Vertical cards (aspect-ratio: 5/7). Apply asymmetrical rounded corners to cards (e.g., top-left: 100px, or top-right: 100px + bottom-left: 40px). Animation: Continuous horizontal scroll. Images within should be fading to theme on an angle by default. (check these for ref: https://superdesign.dev/library/testimonial-portrait-stack, https://superdesign.dev/library/testimonial-marquee, https://superdesign.dev/library/testimonial-scrolling-columns)


## Guardrails
- Never fill the hero background with a full-frame saturated gradient — black must dominate; color stays confined to thin vertical bars/glows in the upper hero region.
- Never round the feature-grid or panel cards — 0px radius is structural to this system; only buttons, pills, and status dots may be fully rounded.
- Never substitute the navbar's nav-utility button values for the hero primary CTA — the hero primary is an observed white/off-white pill, distinct from the transparent 4px-radius nav triggers.
- Never spread the mint accent (#34D59A) across large fills — it belongs only to CTA pills, icon glyphs, and code-token highlights.
- Never lose the fused bold/gray headline pattern by splitting it into a separate subhead line — the muted continuation must stay inline with the bold opening clause.
- Never apply the pale-mint (#E4F1EB) surface to more than one content band at a time — it is a rare inversion, not a default alternate background.