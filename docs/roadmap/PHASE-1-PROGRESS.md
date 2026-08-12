# Phase 1 — Hardening + Image Pack

Live progress. Phase 0 (spine) is complete and deployed; see git history from
`42fc568` to `0e9f675`.

## Why hardening comes before the tools

Batch conversion, the `/tools` index and the error taxonomy are shared
infrastructure. Built first, every one of the ~48 image tools inherits them for
free. Built after, they are 48 retrofits. The ordering is not caution — it is
the cheaper path.

## The change that made the image pack tractable

The engine layer was one monolithic interface:

```ts
interface Engine { run(input, params, onProgress): Promise<ArrayBuffer> }
```

Under that shape every format pair is its own engine — ~10 inputs × ~8 outputs
approaches 80 files. Decomposed into `ImageDecoder` and `ImageEncoder`, composed
by `createImagePipelineEngine`, the same matrix costs 18: **a new input format is
one decoder, a new output format is one encoder**, and every existing counterpart
pairs with it automatically.

Committed in `7bf660c`. The lossless PNG→WebP round-trip stayed bit-exact across
all 8,192,000 subpixels through the restructure — which is the point of having
pinned that claim to a falsifiable test.

## Status

| | Status | Commit |
|---|---|---|
| Engine decomposition (decoders × encoders) | done | `7bf660c` |
| Error taxonomy UI, wired | done | `0d63939` |
| `/tools` index + category hubs + search | done | `0d63939` |
| Image codecs — jpeg, avif, jxl, webp, heic | in progress | |
| Batch conversion + worker pool + ZIP | in progress | |
| PWA + service worker + offline e2e | in progress | |
| Tool registry entries (the ~48) | pending | |
| Resize / crop / rotate | pending | |
| EXIF view / strip / GPS scrub | pending | |
| Compress-to-target-size | pending | |
| Favicon pack, images↔PDF, SVG, animated GIF→WebP | pending | |
| OPFS streaming for files larger than RAM | pending | |

## Coordination rules for parallel agents

These earned their place across ~20 agent dispatches:

1. **Agents never run `git`.** The controller owns every commit, so the index
   never collides and finished work can be committed while other agents are
   mid-write.
2. **Agents never run `pnpm install`.** All dependencies are installed in one
   controller pass up front; a concurrent install races the lockfile.
3. **Each agent owns a disjoint path set**, stated explicitly in its brief.
4. **The controller exclusively owns the shared wiring files** —
   `src/core/registry/index.ts` and `src/core/engines/index.ts`. Agents create
   new tool and engine files; the controller wires them in. Without this every
   parallel agent collides on the same two files.
5. **Agents never run the full test suite** while others are in flight —
   another agent's half-written file fails spuriously and wastes a round.

## Verification habits that have caught real defects

- **Prove a test can fail before trusting it.** The fidelity test was falsified
  under `lossless: 0` before being believed.
- **Spot-check with real inputs.** The engine layer passed 3/3 unit tests while
  never once executing a codec — the tests only exercised selection with stubs.
  A real PNG surfaced that jSquash cannot fetch its WASM under Node at all.
- **Every significant defect so far originated in the plan, not the
  implementation.** The `noUncheckedIndexedAccess` conflict, the `formatBytes`
  rounding cliff, the orphaned `@theme` keys, the preset that could never leave
  Custom, the unreachable Cancel button, and the network assertion that exempted
  every GET before checking origin. Implementers transcribed faithfully; the
  specification was wrong. Keep the verification layer heavy.

## Next

Phase 2 (video) is the differentiator: remux-before-transcode so MKV/MOV/TS
convert by copying streams — lossless, seconds not minutes — with WebCodecs for
genuine transcodes and OPFS streaming for files larger than memory. Full
inventory in [`CATALOGUE.md`](./CATALOGUE.md); task-level backlog in
[`PHASES.md`](./PHASES.md).
