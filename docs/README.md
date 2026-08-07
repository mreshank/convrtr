# convrtr — documentation

A file conversion hub where every conversion runs inside the browser. No uploads, no server,
no accounts — because there is nothing to upload to.

| Document | What it is |
|---|---|
| [`superpowers/specs/2026-08-07-convrtr-design.md`](./superpowers/specs/2026-08-07-convrtr-design.md) | The v1 design spec: goals, architecture, module boundaries, engine layer, error taxonomy, testing strategy, performance budget, risks |
| [`roadmap/CATALOGUE.md`](./roadmap/CATALOGUE.md) | Every tool in every category (~284), each with its engine, fidelity class and in-browser feasibility verdict — including what is explicitly excluded and why |
| [`roadmap/PHASES.md`](./roadmap/PHASES.md) | The complete phased backlog to task level, Phase 0 (spine) through Phase 16 (depth & growth) |
| [`design/webm-to-mp4.png`](./design/webm-to-mp4.png) | Flagship tool page mid-conversion — establishes the "Instrument" visual direction |
| [`design/png-to-webp-options.png`](./design/png-to-webp-options.png) | The two-tier quality model: outcome-framed presets with a live consequence read-out, plus the full advanced parameter surface |
| [`design/heic-to-jpg-light.png`](./design/heic-to-jpg-light.png) | Light mode + batch results — proves light is first-class, not an inverted dark theme |

## The two properties everything else serves

1. **Lossless by default.** We never re-encode when a copy will do. Lossy output happens
   only when the user asks, and the interface always says which one they are getting.
2. **Provably private.** Not a policy — an architectural fact, enforced by a test that
   asserts zero bytes leave the device during a conversion.

## Scope at a glance

- **v1:** Phase 0 (spine) + Phase 1 (image) + Phase 2 (video)
- **Planned in full:** Phases 3–16, specified now so nothing is re-derived later
- **Excluded, with reasons recorded:** see the final section of `CATALOGUE.md`
