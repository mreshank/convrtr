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
| Batch core + worker pool + streamed ZIP | done | `277c046` |
| Image codecs — jpeg, avif, jxl, webp, heic | done | `a1c787e` |
| 15 conversions + PWA offline | done | `13c6d53` |
| libheif browser build + webpack pin | done | `4e9664f` |
| Batch UI + per-file save + SW cache-key fix | done | `4a4d705` |
| ImageTransform stage + Lanczos resize | done | `650e479` |
| Resize tools (PNG/JPG/WebP) | done | `16c1f13` |
| EXIF/metadata strip, byte-level | done | `73e7363` |
| Compress to target size | done | `597bb0b` |
| Favicon generator | done | `5965d63` |
| Images ↔ PDF | pending | |
| SVG optimise | pending | |
| Animated GIF → WebP | pending | |
| OPFS streaming for files larger than RAM | pending | |

**22 tools, 27 prerendered pages, 258 tests.** Phase 1's hardening and the
substantial image work are complete; what remains is the tail.

## What the tests have actually caught

Worth recording, because it argues for keeping the verification layer heavy
even as the tool count grows. Every one of these builds cleanly and passes
typecheck:

- **A tool whose `id` and `slug` disagreed** (favicon generator). Routes derive
  from `slug`, lookups use `id`, so the page rendered and then failed to find
  its own tool — visible only to users.
- **A preset that could never return from `custom`**, so the fidelity badge
  lied about what the encoder was doing.
- **A service worker whose cache key never changed between deploys**, which
  would have stranded every returning user on a stale app forever.
- **A registry importing engine values at runtime**, dragging nine codec
  modules into every page's build graph and hanging the build.
- **A network-assertion test that could not fail** for the most common
  exfiltration shape, while appearing to guard the product's core promise.

Three of those are invisible until after deployment, and two only affect
*returning* users — the hardest class of bug to notice or reproduce.

## The pipeline needs a transform stage before resize can land

`createImagePipelineEngine(decoderId, encoderId)` composes exactly two steps:
decode then encode. Resize, crop and rotate are neither — they operate on the
decoded `ImageData` in between.

The extension is small and should be done deliberately rather than by bolting
resize into an encoder:

```ts
interface ImageTransform {
  id: string;
  apply(image: ImageData, params: Record<string, ParamValue>): Promise<ImageData>;
}

createImagePipelineEngine(decoderId, encoderId, transforms?: ImageTransform[])
```

Engine ids gain the transform chain, e.g. `image:png-[resize]->jpeg`. Progress
gains a `TRANSFORM` phase between `DECODE` and `ENCODE`. `@jsquash/resize` is
already installed and does proper resampling — not canvas bilinear, which is
what makes downscaled photos look soft on competing tools.

Doing this properly also unlocks chained operations later (resize → compress →
strip metadata) without a bespoke engine per combination — the same N+M argument
that made the decoder/encoder split worth it.

## Two hard-won operational lessons

### When a build hangs, switch tools before bisecting

`libheif-js` resolves by default to its Node build, which `require`s `fs` — it
cannot resolve inside a browser worker bundle. Webpack reported this in seconds
with a full import trace. **Turbopack stalled indefinitely at 0% CPU printing a
bare `undefined`**, and kept stalling on this dependency graph even after the
import was corrected. The build is pinned to `--webpack` for that reason; see
`docs/DEPLOY.md`.

### Verify the environment before bisecting the code

Concurrent swap exhaustion (over 24 GB in use) produced hangs indistinguishable
from a code fault — including on a known-good commit that had built in one
second hours earlier. Four bisects were run against that noise before anyone
tested the baseline. **Test that the last known-good commit still builds before
concluding anything about new code.**

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
