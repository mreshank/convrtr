# convrtr — Phased Backlog

Every phase, to task level, from the spine through the last pack. Phases 0–2 are v1.
Phases 3+ are fully specified now so that nothing is lost, re-derived, or re-litigated later.

Each phase states its **goal**, its **exit criteria** (objective, testable), and its tasks.
A phase is not done until its exit criteria pass — not when its tasks are checked off.

Tool inventories referenced here are defined in [`CATALOGUE.md`](./CATALOGUE.md).

---

## Phase 0 — Spine

**Goal.** The generic machinery that makes every later phase cheap. No conversion logic
lives here; this phase ends with a system that can run *any* tool the registry declares.

**Exit criteria.**
- A throwaway "reverse bytes" demo tool works end-to-end — dropped, queued, run in a worker,
  progress-reported, cancellable, downloaded — with **zero** code in `app/`.
- Its static route, `<title>`, JSON-LD, OG image and sitemap entry are all generated from
  its registry entry alone.
- The network-assertion test passes: converting a file issues zero requests carrying bytes.
- Lighthouse ≥ 98 on all four axes.

### 0.1 Repo & toolchain
- [ ] Next.js 15 App Router, TypeScript strict, `output: 'export'`
- [ ] Tailwind v4, Biome (lint + format), Vitest, Playwright
- [ ] Path aliases matching the package boundaries in the spec
- [ ] CI: typecheck, lint, unit, e2e, bundle-size budget, Lighthouse budget
- [ ] `COOP: same-origin` / `COEP: credentialless` headers + a served-headers test

### 0.2 Design tokens & theming
- [ ] Colour tokens for both themes; semantic layer (`surface`, `hairline`, `signal`, `lossy`, `error`)
- [ ] Type scale, 4px spacing scale, radius scale capped at 4px
- [ ] IBM Plex Sans + IBM Plex Mono, self-hosted, subset, `font-display: swap`
- [ ] `tabular-nums` enforced globally on the mono face
- [ ] Theme resolution: system default + explicit override in `localStorage`
- [ ] Pre-paint inline script to prevent theme flash
- [ ] Contrast audit: AA minimum, AAA for body, in **both** themes
- [ ] `prefers-reduced-motion` honoured by every animated component

### 0.3 UI primitives
- [ ] Base UI/Radix wrappers, fully re-skinned: Dialog, Popover, Select, Tooltip, Tabs, Switch, Slider, Disclosure
- [ ] Focus-visible ring consistent across all of them
- [ ] Keyboard traversal audited per primitive

### 0.4 Instrument components
- [ ] `DropField` — dashed hairline, drag-over state, click-to-browse, paste-from-clipboard, folder drop
- [ ] `FileReadout` — filename + mono metadata row
- [ ] `TransformRow` — source / rail / output with live status
- [ ] `ProgressBar` — segmented, real progress, throughput + elapsed + remaining readouts
- [ ] `FidelityBadge` — `LOSSLESS` / `LOSSY` / `INHERENTLY LOSSY`
- [ ] `PrivacyStrip` — persistent, quiet
- [ ] `OptionsPanel` — renders itself from a zod schema; collapsed summary line
- [ ] `ResultPanel` — output metadata, size delta, save / save-all
- [ ] `ToolChip`, `CategoryTable`, `ToolSearch`
- [ ] Storybook-equivalent visual review page for every component in both themes

### 0.5 Registry
- [ ] `Tool` type + zod schema
- [ ] Registry loader with build-time validation
- [ ] Conformance tests: schema valid, engines exist, `related` IDs resolve, no duplicate routes
- [ ] Category metadata + ordering

### 0.6 Engine layer
- [ ] `Engine` interface (`probe` / `load` / `run` / `dispose`)
- [ ] Capability probe with per-browser-version caching
- [ ] Ranked selection with fallback chain
- [ ] Lazy loader with download-progress reporting
- [ ] Tier-4 consent gate ("this needs a 30 MB one-time download")
- [ ] Engine asset host configuration (R2) + service-worker caching

### 0.7 Pipeline
- [ ] Worker pool, `min(hardwareConcurrency - 1, 8)`
- [ ] Job queue: enqueue, prioritise, cancel, retry-with-different-engine
- [ ] Progress protocol (worker → main) with throttled updates
- [ ] `AbortSignal` propagation; WASM memory freed on cancel
- [ ] Batch orchestration across the pool
- [ ] Memory-pressure detection and pre-flight size checks

### 0.8 I/O
- [ ] Streaming file reader
- [ ] OPFS scratch allocation + cleanup on unload
- [ ] File System Access save; `Blob` fallback
- [ ] Batch output as a streamed ZIP
- [ ] Clipboard input, and drag-out where supported

### 0.9 Routing & SEO
- [ ] `generateStaticParams` from the registry
- [ ] Tool page template, category hub template, `/tools` index
- [ ] Client-side fuzzy search over the registry
- [ ] Per-page metadata + build-time OG image generation
- [ ] `HowTo` + `FAQPage` + `SoftwareApplication` JSON-LD
- [ ] `sitemap.xml`, `robots.txt`, canonical URLs
- [ ] Derived internal-link graph (inverse, siblings, category)
- [ ] 404 that suggests the nearest real tool

### 0.10 Resilience & a11y
- [ ] Error taxonomy from the spec, with a component per class
- [ ] Input file never discarded on error
- [ ] Full keyboard operation of the whole conversion flow
- [ ] Screen-reader pass: live-region progress announcements
- [ ] Offline behaviour + PWA manifest + install prompt
- [ ] Service worker: precache shell, runtime-cache engines

### 0.11 Quality & options model

The two-tier control surface from spec §5.9. This is spine work, not per-pack work: every
tool in every later phase inherits it, so it must be generic before Phase 1 starts.

- [ ] `QualityModel` type: preset list, parameter surface, defaults, lossless availability
- [ ] Preset engine: `Lossless` / `Visually lossless` / `Balanced` / `Smallest` / `Target size` / `Custom`
- [ ] **Common tier** renders presets as outcomes, with a one-line plain explanation per preset
- [ ] **Live consequence read-out**: estimated output size, delta vs source, perceptual score
- [ ] Perceptual scoring: SSIM (and butteraugli where affordable) computed locally on a sample
- [ ] Estimation without full conversion — sample-encode a representative region, extrapolate
- [ ] **Advanced tier**: collapsible disclosure, parameter groups, every engine knob exposed
- [ ] Control set: stepper, slider, select, toggle, numeric entry — all keyboard-operable
- [ ] Engine default shown alongside every advanced control; per-group and global reset
- [ ] Any advanced edit flips the active preset to `Custom` — never misreport the state
- [ ] `Target size` mode: binary-search the encoder to hit a user-named size
- [ ] Per-tool config persistence in `localStorage`, with one-click reset
- [ ] Full configuration encoded in the URL for sharing/bookmarking (no server involved)
- [ ] Fidelity badge derives from the *current setting*, live-updating as the dial moves
- [ ] `INHERENTLY LOSSY` state with a one-line reason where lossless is impossible
- [ ] Batch: one configuration across the set, with per-file override

### 0.12 Verification harness
- [ ] Golden-file test utility (byte-exact and perceptual comparison)
- [ ] **Fidelity assertion harness** — any tool declaring `LOSSLESS` must prove round-trip equality
- [ ] **Network assertion test** — zero bytes leave during conversion
- [ ] Fixture corpus, committed, covering edge cases per format

---

## Phase 1 — Image pack

**Goal.** Breadth and search volume; prove the spine on many small, fast jobs.
**Exit criteria.** Every tool in `CATALOGUE.md` §1.1–1.5 marked `SOLVED`/`TRIVIAL` ships with
golden-file tests; every `LOSSLESS` claim is mechanically proven; batch of 100 images
completes without a main-thread stall.

- [ ] Engines: jSquash (mozjpeg, oxipng, libwebp, libavif, libjxl), libheif-wasm, wasm-vips, SVGO, resvg-wasm, imagequant
- [ ] Decode/encode matrix across §1.1
- [ ] HEIC → JPG/PNG/WebP *(highest-volume single tool in the product)*
- [ ] JPEG ↔ JXL lossless recompression, with reversibility test
- [ ] Compression: quality control, **compress-to-target-size** binary search
- [ ] Lossless optimisation: oxipng, mozjpeg, SVGO
- [ ] Resize with real resampling; crop; lossless JPEG rotate
- [ ] EXIF view / edit / **strip + GPS scrub**
- [ ] Favicon & PWA icon pack generation
- [ ] Images ↔ PDF
- [ ] Animated: GIF ↔ WebP/APNG, video → GIF, frame split/join
- [ ] Batch pipeline UI (per-file rows, aggregate progress, save-all as ZIP)
- [ ] Deferred to Phase 15: RAW, EXR/HDR, ICC, ML tools

## Phase 2 — Video pack

**Goal.** The differentiator. Prove the spine on huge, streaming, long-running jobs.
**Exit criteria.** `webm→mp4`, `mkv→mp4`, `mov→mp4` all take the **copy path** when codecs
permit, proven by a test asserting bit-identical stream payloads; a 2 GB file converts on a
mid-range laptop without exhausting memory.

- [ ] Engines: WebCodecs adapter, mediabunny (demux/mux), mp4box.js, MediaInfo-wasm, ffmpeg.wasm (Tier 4)
- [ ] **Remux engine + codec-compatibility matrix** — the copy-path decision table
- [ ] `webm → mp4` flagship, both copy and transcode paths
- [ ] `mkv/mov/ts → mp4` remux
- [ ] `mp4 → webm`, transcode to H.264/HEVC/VP9/AV1
- [ ] Compress to target size (two-pass bitrate solve)
- [ ] Keyframe-accurate trim (copy) and frame-accurate trim (partial re-encode)
- [ ] Split, concatenate
- [ ] Resize, crop, fps change, speed change
- [ ] Rotate via container metadata (no re-encode)
- [ ] Mute / remove / replace audio track
- [ ] Extract audio (copy path first), extract frames, extract thumbnail, contact sheet
- [ ] Video → GIF with palette generation
- [ ] Stream inspector page (full codec/container read-out)
- [ ] OPFS-backed streaming for files exceeding memory
- [ ] Deferred to Phase 15: HDR tone-map, subtitle burn-in

---

## Phase 3 — Audio — **shipped**

Delivered: WAV<->FLAC (sample-for-sample lossless, verified by round trip),
WAV->MP3 and WAV->Opus (both lossy, both saying so), sample-exact trim for WAV
and FLAC, tag removal that leaves audio byte-identical, cover-art extraction
without re-encoding, EBU R128 loudness normalisation that refuses to clip, and
waveform drawings. Loudness agrees with ffmpeg's `ebur128` to 0.007 LU.

Not built, and deliberately: arbitrary tag *editing*, which needs a text
control the registry does not have; and MP3/AAC trimming, which is
frame-bounded rather than sample-exact and so belongs with the video pack's
keyframe-snapping honesty rather than beside the sample-exact audio trims.

Engines: WebCodecs audio, libmp3lame, libflac, libopus, Web Audio, music-metadata.
Convert matrix; **WAV↔FLAC↔ALAC lossless round-trip**; bitrate change; trim/split/merge;
LUFS normalise; sample-rate/bit-depth/channel conversion; speed & pitch; silence trim;
fade; ID3/Vorbis tag editor; cover-art extract/embed; waveform image.
*Deferred: MIDI synthesis (needs SoundFont asset), stem separation (Phase 15).*

## Phase 4 — Document & PDF
Engines: pdf-lib, pdf.js, mupdf-wasm, qpdf-wasm, tesseract.js, mammoth.js, SheetJS.
Merge; split/extract/delete/reorder; rotate; compress; linearise; PDF↔images; PDF→text;
password add/remove; watermark/stamp/page numbers; metadata; form fill/flatten;
**OCR → searchable PDF**; DOCX→HTML/MD; XLSX→CSV/JSON; MD→HTML/PDF; EPUB→TXT/HTML; CBZ→PDF.
*Blocked and documented: DOCX/PPTX→PDF high-fidelity, MOBI/AZW3.*

## Phase 5 — Data & developer formats
Full any↔any matrix across JSON/CSV/TSV/YAML/TOML/XML/INI/Parquet/SQLite/XLSX/MD-table/
MessagePack/CBOR/NDJSON. JSON format/minify/validate/sort/flatten/diff/JSONPath.
JSON → TypeScript/Zod/Go/Python/Rust types. SQLite browse & query. `.env` ↔ JSON/YAML.
*Cheapest phase per tool; highest ratio of traffic to effort.*

## Phase 6 — Archive
libarchive-wasm, fflate, zstd-wasm, zip.js. Extract any; create ZIP/TAR/GZ/ZSTD;
convert archive format; recompress; inspect without extracting; password ZIP; ISO extract.
*Blocked: RAR/7z creation.*

## Phase 7 — Text, encoding & crypto
Base64/32/58/85; URL; HTML entities; punycode; numeric bases; Roman numerals; **streaming
file hashing** (MD5/SHA-family/CRC32/BLAKE3/xxHash); HMAC; JWT; bcrypt; TOTP;
AES-GCM file encryption; RSA/ECDSA keygen; PGP; X.509 decode; SSH key convert; UUID/ULID/
nanoid; case/slug/line ops; text diff; charset & line-ending conversion; Unicode tools;
QR generate/decode; barcode; regex tester.

## Phase 8 — Code
prettier, esbuild-wasm, sass-wasm, terser, csso, shiki, sql-formatter.
Format/minify across JS/TS/CSS/HTML/JSON/YAML/MD/SQL; TS→JS; SCSS/LESS→CSS;
syntax-highlight → HTML/SVG/PNG; code diff; cron explain.

## Phase 9 — Font
opentype.js, wawoff2, harfbuzzjs. TTF/OTF↔WOFF↔WOFF2; **subset by charset/language**;
glyph & metrics inspector; `@font-face` CSS generation; variable-font instancing; data URI.

## Phase 10 — Subtitles
SRT/VTT/ASS/SSA/SBV/SUB/TTML/SCC/LRC full matrix; timing shift & scale; merge; split;
strip formatting; fix encoding; sync offset; extract from video (links back to Phase 2).

## Phase 11 — 3D & CAD
three.js loaders/exporters, draco3d, meshoptimizer, occt-import-js.
STL↔OBJ↔PLY↔GLTF/GLB↔3MF; STL ASCII↔binary; Draco/meshopt compression; mesh inspector;
STEP→mesh; FBX→GLB.

## Phase 12 — Geo
shapefile.js, togeojson, topojson, wellknown, proj4js.
GeoJSON↔TopoJSON↔KML/KMZ↔GPX↔Shapefile↔WKT/WKB↔CSV; reprojection; simplification;
bounding box; distance & area.

## Phase 13 — Calendar, contacts & colour
ICS↔JSON/CSV; VCF↔CSV/JSON; bookmarks↔JSON/HTML.
Colour space matrix (HEX/RGB/HSL/HSV/LAB/LCH/OKLCH/OKLAB/CMYK/P3); palette extraction;
WCAG contrast checker; colour-blindness simulation; shade/tint scales; Tailwind & CSS
variable export; ASE/ACO/GPL palette files.

## Phase 14 — Units & calculators
Full unit matrix. Domain calculators: **bitrate ↔ file size ↔ duration**, encoding size
estimator, aspect ratio, resolution scaling, DPI/PPI, print size, data size (SI vs binary),
epoch/timezone, date difference, number base.
*Currency excluded — requires a server-fed rate feed.*

## Phase 15 — Frontier
Gated behind explicit warnings about download size and device capability. WebGPU-preferred.
Background removal (U²-Net/BiRefNet); super-resolution (Real-ESRGAN); face blur;
stem separation (Demucs); RAW decode (LibRaw); EXR/HDR; ICC profile conversion;
HDR→SDR tone-mapping; subtitle burn-in; MIDI synthesis.

## Phase 16 — Depth & growth
- [ ] **Tool chaining** — pipe one tool's output into the next (HEIC → resize → compress → ZIP) as a saved pipeline
- [ ] Command palette (⌘K) over all ~284 tools
- [ ] Shareable option presets encoded in the URL (no server; state lives in the link)
- [ ] Per-tool comparison view (before/after, size delta, perceptual diff)
- [ ] Bulk folder processing with directory-handle persistence
- [ ] Local-only recent-jobs list (IndexedDB, user-clearable, off by default)
- [ ] Programmatic SEO expansion: long-tail pairs, "X vs Y format" explainers, per-format reference pages
- [ ] `llms.txt` + GEO optimisation for AI-search citation
- [ ] i18n for the highest-volume tool pages
- [ ] Public engine-capability matrix page ("what your browser can do")

---

## Ordering rationale

Phases 3–8 are ordered by **traffic-per-unit-effort**, not by interest. Phases 5 and 7 are
individually the cheapest tools in the product and among the highest-volume searches; they
are deliberately placed before the harder media work of Phases 9–12 so the catalogue grows
fast once the spine exists.

Phase 15 is last among functional work because every tool in it is `FRONTIER`: large models,
slow on low-end hardware, and dependent on WebGPU maturing. Nothing in it blocks anything.
