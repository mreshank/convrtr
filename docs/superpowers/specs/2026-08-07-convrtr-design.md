# convrtr — Design Spec (v1)

**Date:** 2026-08-07
**Domain:** `convrtr.mreshank.com`
**Status:** Approved for planning

---

## 1. Summary

convrtr is a file conversion hub where **every conversion runs inside the user's browser**.
No file is ever uploaded, because there is no server to upload it to. The site is a static
build; the conversion engines are WASM modules and native browser codecs that execute in
Web Workers on the user's own machine.

Two properties define the product:

1. **Optimal by default, controllable to the extreme.** The default on every tool is the
   best practical outcome — truly lossless where that is achievable at a sensible size,
   visually lossless where it is not. From there the user decides how much loss they will
   trade for size, on *every* tool, and the interface always states plainly what they are
   getting. Lossless is the starting point, never a cage.
2. **Provably private.** Not a privacy policy — an architectural fact. A user can open the
   network tab and watch nothing happen.

Everything else — speed, breadth, design — serves those two.

---

## 2. Goals

- Convert the formats people actually search for, correctly, without uploading them.
- Be materially faster than server-based competitors by exploiting hardware codecs and
  container remuxing instead of brute-force transcoding.
- Scale to ~284 tools (see `docs/roadmap/CATALOGUE.md`) without the codebase scaling
  linearly with it.
- Cost ₹0/month to run, permanently.
- Look like a precision instrument, not a template.

## 3. Non-goals

- User accounts, history, or any server-persisted state. There is no server.
- Server-side processing of any kind, including "optional" or "opt-in" uploads.
- Cloud storage integrations (Drive, Dropbox) — they require OAuth and a backend.
- DRM-protected media.
- Currency conversion or anything else requiring a live data feed.

---

## 4. Locked product decisions

| Decision | Choice | Rationale |
|---|---|---|
| v1 scope | Spine + Image pack + Video pack | Images give breadth and search volume; video gives the flagship and the hardest engineering. Together they prove the spine at both extremes. |
| Site shape | Static page per conversion, generated from the registry | People search "webm to mp4", not "file converter". 200 pages cost what 3 cost. |
| Server | None, ever | A privacy guarantee only works if it is absolute. |
| Design | "Instrument" — precision-hardware aesthetic | Decorate with data, never ornament. |
| Themes | System-following by default, with explicit light/dark override | Both themes first-class. |

---

## 5. Architecture

### 5.1 Module boundaries

Each package has one purpose, a documented contract, and is independently testable.

| Package | Purpose | Depends on | Must never |
|---|---|---|---|
| `core/registry` | Tool declarations + types. Pure data. | nothing | touch the DOM or import an engine |
| `core/engines` | One adapter per engine, each self-contained | `core/registry` types | run on the main thread |
| `core/pipeline` | Worker pool, job queue, progress, cancellation | `core/engines` | know about specific formats |
| `core/io` | File read/write, OPFS scratch, streaming, download | nothing | know about specific formats |
| `ui/primitives` | Accessibility primitives, skinned | design tokens | carry a vendor's visual identity |
| `ui/instrument` | Signature components (drop field, read-out, transform row…) | `ui/primitives` | contain conversion logic |
| `app/` | Routes, pages, metadata — generated from the registry | all of the above | hand-code a per-tool page |

The test of these boundaries: adding a new conversion must touch **only** `core/registry`
(one file) and, if it needs a new engine, **only** `core/engines` (one file). If a new tool
ever requires editing `app/`, the abstraction has failed.

### 5.2 The registry

```ts
type Tool = {
  id: 'video/webm-to-mp4'
  category: Category
  kind: 'convert' | 'compress' | 'resize' | 'extract' | 'edit' | 'inspect' | 'generate'
  accept: { mime: string[]; ext: string[]; maxBytes?: number }
  output: { ext: string; mime: string }
  engines: EngineRef[]          // ranked; first supported one wins
  quality: QualityModel         // presets + full parameter surface — see §5.9
  options: OptionSchema         // zod schema → renders both option tiers
  seo: {
    title: string
    h1: string
    intent: string              // one-paragraph answer to "what is this"
    faq: { q: string; a: string }[]
    related: ToolId[]
  }
}
```

Derived automatically from each entry: the route, the static page, `<title>`/description/OG
image, `HowTo` + `FAQPage` + `SoftwareApplication` JSON-LD, the options UI, file-type
validation, the search index entry, and the internal-link graph (inverse conversion,
siblings, category).

### 5.3 Engine layer

Engines are ranked per tool and selected at runtime by probing the actual device — never by
sniffing the user agent.

| Tier | Engine | Download | Used for |
|---|---|---|---|
| 1 | Native (`createImageBitmap`, OffscreenCanvas, WebCrypto) | 0 | baseline raster, hashing |
| 2 | **WebCodecs** | 0 (GPU) | video/audio — 10–50× faster than WASM |
| 3 | Specialist WASM (mozjpeg, oxipng, libavif, libjxl, libheif, vips) | 100 KB–3 MB | best-in-class per format |
| 4 | ffmpeg.wasm | ~30 MB | exotic/legacy formats only |

Contract every engine implements:

```ts
interface Engine {
  id: string
  probe(): Promise<boolean>                     // is this device capable?
  load(onProgress): Promise<void>               // lazy; reports download progress
  run(input: JobInput, signal: AbortSignal, onProgress): Promise<JobOutput>
  dispose(): void
}
```

Rules:
- Tier 4 is **never** loaded without telling the user first ("This format needs a 30 MB
  one-time download").
- Engines are loaded lazily, per tool, and cached by the service worker.
- Probing is cached in `localStorage` per engine per browser version.

### 5.4 Remux-before-transcode

The single most important behaviour in the product, and the main quality/speed
differentiator.

```
demux container
  → inspect stream codecs
     → are they legal in the target container?
        YES → copy streams, rewrite container   [LOSSLESS, seconds]
        NO  → transcode via WebCodecs           [LOSSY, honest badge, real progress]
```

Competitors skip this check and re-encode unconditionally, silently degrading files that
needed no re-encoding. Every conversion path must evaluate the copy path first.

### 5.5 Execution pipeline

- Files never touch the main thread. `File` → `ReadableStream` → Worker.
- Worker pool sized `min(hardwareConcurrency - 1, 8)`; batch jobs distributed across it.
- Streaming for large media. Files exceeding a memory budget use **OPFS** as scratch space.
- Output written directly to disk via File System Access API where available; `Blob`
  download otherwise.
- Progress reported from the codec itself. **Never** an indeterminate spinner where real
  progress exists.
- Every job cancellable via `AbortSignal`; cancellation frees WASM memory immediately.

### 5.6 Cross-origin isolation

Multithreaded ffmpeg.wasm needs `SharedArrayBuffer`, which needs cross-origin isolation.
We set `COOP: same-origin` and `COEP: credentialless` site-wide. This is free for us: a
zero-server site loads no third-party scripts. Single-threaded fallback if isolation is
unavailable.

### 5.7 Routing & SEO

- Next.js App Router, `output: 'export'` — genuinely static, no runtime.
- `generateStaticParams` enumerates the registry.
- Every leaf: unique title/description, build-time-generated OG image, JSON-LD.
- Category hubs and a `/tools` index with instant client-side fuzzy search.
- `sitemap.xml` and `robots.txt` generated from the registry.
- Internal links derived, not hand-written: each tool links to its inverse, its siblings,
  and its category.

### 5.8 Deployment

| Asset | Host | Why |
|---|---|---|
| App (HTML/CSS/JS) | Vercel | Pro account, custom domain, edge cache |
| WASM binaries | Cloudflare R2 | Free tier, zero egress — keeps Vercel bandwidth free |
| State | none | there is no server |

PWA with a service worker precaching the shell and caching engines on first use. After one
visit, tools work with no network at all.

### 5.9 The quality model — two tiers of control

Every tool, without exception, lets the user decide how much loss they will accept. The
difference between a novice and an expert is not *whether* they get control, but which
vocabulary the control is expressed in.

**Tier 1 — Common (always visible, 3–5 controls, outcome-framed).**

Presets phrased as consequences, not parameters:

| Preset | Meaning |
|---|---|
| `Lossless` | Bit-exact or mathematically reversible. Offered whenever the format supports it. |
| `Visually lossless` | No perceptible difference at 100% zoom / normal listening. Usually the default. |
| `Balanced` | Clearly smaller, quality loss hard to notice in normal use. |
| `Smallest` | Aggressive. The interface says so. |
| `Target size…` | The user names a size; we binary-search the encoder to hit it. |
| `Custom` | Set automatically the moment any advanced parameter deviates. |

Alongside the preset, a **live consequence read-out**: estimated output size, delta against
the source, and — where computable — a perceptual score (SSIM / butteraugli for images,
measured against the source). This is what turns "how much loss?" from a vibe into a number.

**Tier 2 — Advanced (collapsible, parameter-framed, exhaustive).**

Every knob the underlying engine exposes, grouped by concern, with engine defaults shown and
a per-group reset. Nothing is hidden because it is "too technical" — that is precisely the
audience this tier exists for. Representative surfaces:

| Format | Advanced parameters |
|---|---|
| JPEG | quality, progressive, chroma subsampling (4:4:4 / 4:2:2 / 4:2:0), trellis quantisation, optimise coding, smoothing, custom quant tables |
| PNG | oxipng level 0–6, zopfli iterations, interlace, bit-depth reduction, palette reduction, filter strategy |
| WebP | quality, method 0–6, alpha quality, near-lossless, filter strength, segments, SNS |
| AVIF | quality, speed 0–10, subsampling, bit depth, tiling, denoise |
| JXL | distance (0 = lossless), effort 1–9, progressive, modular vs VarDCT |
| Video | rate control (CQ / VBR / CBR), CRF, bitrate, preset, profile, level, GOP size, B-frames, reference frames, tune, pixel format, colour primaries / transfer / matrix, two-pass |
| Audio | bitrate, VBR quality, joint stereo, sample rate, bit depth, dither, channel layout |

**Rules binding the two tiers**

- Changing any advanced parameter flips the preset to `Custom`. The user is never lied to
  about which preset is active.
- Advanced settings persist per tool in `localStorage`, and reset is always one click.
- The full configuration is encodable in the URL, so a setup can be shared or bookmarked
  without a server ever seeing it.
- The fidelity badge reflects the **current setting**, not the tool: `LOSSLESS`,
  `VISUALLY LOSSLESS`, or `LOSSY · Q78`. It updates as the user moves the dial.
- Where a tool *cannot* be lossless (e.g. → GIF), the badge says `INHERENTLY LOSSY` and the
  reason is stated in one line rather than buried.
- Batch jobs apply one configuration across the set, with per-file override available.

---

## 6. Design system — "Instrument"

Full token definitions live with the code; the governing rules:

- **Colour encodes state, never hierarchy.** Acid `#CCFF00` marks exactly three things:
  active/running, the lossless guarantee, and the primary action. Amber `#FFB020` marks
  lossy-by-choice. Red `#FF4D3D` marks errors only.
- **Every number is monospace with tabular figures**, so digits don't shift while counting.
- **Elevation is a 1px hairline**, never a shadow.
- **Radius never exceeds 4px** except pills.
- **Motion communicates state change or does not exist.** 120–220ms. Honours
  `prefers-reduced-motion`.
- **Light mode is not inverted dark mode.** Warm paper, ink text, olive-ink accent.
- Headless primitives (Base UI/Radix) for accessibility, fully re-skinned. No component
  library's visual identity may show through.

Explicit prohibitions (treated as defects in review): gradients, glows, blur/glassmorphism,
decorative shadows, emoji icons, stock illustration, 3D blobs, floating rounded cards on
tinted backgrounds, centred marketing heroes.

Validated reference render: `docs/design/webm-to-mp4.png`.

---

## 7. Error handling

A taxonomy, because "something went wrong" is a design failure:

| Class | Example | Behaviour |
|---|---|---|
| `UNSUPPORTED_INPUT` | AVI on a device without ffmpeg tier | Name the format, offer the nearest supported path |
| `CORRUPT_INPUT` | truncated MP4 | Say which structure failed; offer inspect tool |
| `CAPABILITY_MISSING` | no WebCodecs H.264 encoder | Explain the device limit, offer the WASM fallback with its cost |
| `OUT_OF_MEMORY` | 4 GB video on a 4 GB device | Suggest OPFS-streamed path or splitting first |
| `USER_CANCELLED` | abort | Silent; restore prior state |
| `ENGINE_FAILURE` | WASM trap | Log locally, offer alternate engine, never lose the input file |

No error ever discards the user's input. The file stays loaded and re-runnable.

---

## 8. Testing strategy

- **Golden-file tests per engine.** Real fixture files in, byte-compared or
  perceptually-compared out. A lossless path that isn't bit-exact is a failing test.
- **Fidelity assertions.** Every tool declaring `LOSSLESS` has a test proving round-trip
  equality. This is the product's core claim and must be mechanically enforced.
- **Registry conformance tests.** Every entry validates against the schema; every declared
  engine exists; every `related` ID resolves.
- **Playwright e2e** on the real UI with real files, including drag-drop, cancellation, and
  the offline path.
- **Network assertion test.** An automated check that a conversion issues zero network
  requests carrying file bytes. The privacy guarantee is a test, not a promise.

## 9. Performance budget

| Metric | Budget |
|---|---|
| Initial JS (shell) | < 90 KB gzipped |
| LCP on a tool page | < 1.2 s on 4G |
| Time from drop to first progress tick | < 300 ms |
| Engine module for a Tier-3 image tool | < 1 MB |
| Lighthouse (perf/a11y/best-practice/SEO) | ≥ 98 each |

---

## 10. v1 ships

Spine complete, plus: the Image pack (convert matrix, compression, optimisation, resize,
metadata strip, favicon generation) and the Video pack (remux, webm→mp4, mkv/mov→mp4, trim,
extract audio, video→gif, frame extraction). See `docs/roadmap/PHASES.md` for task-level
detail, and `docs/roadmap/CATALOGUE.md` for everything beyond v1.

## 11. Risks

| Risk | Mitigation |
|---|---|
| WebCodecs codec support varies by device | Runtime probing, ranked fallbacks, honest messaging about what this device can do |
| Large-file memory ceilings on mobile | OPFS streaming, pre-flight size checks, explicit guidance rather than a crash |
| `SharedArrayBuffer` unavailable in some embeddings | Single-threaded fallback path, tested |
| Vercel bandwidth on WASM assets | Binaries served from R2, not Vercel |
| Scope sprawl across 284 tools | Registry-driven; a tool that needs bespoke UI is a design smell to be resolved, not accommodated |
