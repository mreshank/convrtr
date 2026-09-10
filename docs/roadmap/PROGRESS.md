# convrtr — progress tracker

Single place to see what was planned, what is built, and what is left. Updated
at the end of each work session.

**Last resync: 2026-09-10** (267 commits, 56 tools, 1440 unit tests, 42 e2e).

---

## How the work is split

Two lanes have been running in parallel on `main`:

- **Engine / correctness lane** — the conversion engines, the tool registry,
  the pipeline, and the tests that prove the fidelity claims. This is the lane
  these notes track in detail.
- **Design / chrome lane** — the visual system, navigation, families and
  listing pages, blog and hub templates. ~160 commits between 2026-09-04 and
  2026-09-10.

They have stayed out of each other's way: the design lane kept the `data-testid`
hooks and ARIA roles stable, and all 42 engine e2e specs passed unchanged after
its 160 commits.

---

## Phase status

| Phase | Scope | State |
|---|---|---|
| 0 | Spine — registry, engines, pipeline, IO, quality model, PWA | **shipped** |
| 1 | Image pack | **shipped** |
| 2 | Video pack | **shipped** |
| 3 | Audio pack | **shipped** |
| 4 | Document & PDF | **in progress** — 3 of ~18 tools |
| 5 | Data & developer formats | not started |
| 6 | Archive | not started |
| 7 | Text, encoding & crypto | not started |
| 8 | Code | not started |
| 9 | Font | not started |
| 10 | Subtitles | not started |
| 11 | 3D & CAD | not started |
| 12 | Geo | not started |
| 13 | Calendar, contacts & colour | not started |
| 14 | Units & calculators | not started |
| 15 | Frontier | not started |
| 16 | Depth & growth | not started |

Against the ~284-tool catalogue, **56 tools** are shipped — roughly a fifth,
and deliberately the fifth where the lossless claims are hardest to make
honestly.

---

## Phase 4 — Document & PDF (current)

Shipped:

- `split-pdf` — one file per page, pages copied not re-rendered. Proven by
  embedding a distinct JPEG per page and requiring each output to contain its
  own verbatim and none of the others.
- `merge-pdf` — first many-in-one-out path in the project. Detects and names
  what a merge cannot carry (bookmarks, form fields) rather than losing them
  silently.
- `rotate-pdf` — edits one `/Rotate` entry per page. Rotation is *added* to
  existing rotation, which is what scans need.

Left, in the order I intend to take them:

1. **Extract a page range** — needs a file-bounded page-range control, the same
   problem `timerange` solved for video: bounds come from the file, not the
   declaration. Reuse that pattern with a page-count probe.
2. **PDF → images** — needs pdf.js for rendering. First Phase 4 tool that is
   honestly lossy (vector to raster), so it must say so.
3. **PDF → text** — pdf.js text layer. Must be clear that a scanned PDF has no
   text layer and will yield nothing without OCR.
4. **Compress PDF** — re-compresses embedded images; lossy, needs the two-tier
   quality model.
5. **Delete / reorder pages**, **page numbers**, **watermark** — all lossless
   page-level work, same shape as rotate.
6. **DOCX → HTML/MD** (mammoth.js), **XLSX → CSV/JSON** (SheetJS),
   **MD → HTML** — the non-PDF half of the phase.
7. **OCR → searchable PDF** (tesseract.js) — the phase's heaviest item, and a
   consent-gated download like the ffmpeg tier.

Blocked and documented in the catalogue: high-fidelity DOCX/PPTX → PDF,
MOBI/AZW3.

---

## Architecture extensions built along the way

Each of these was added because a tool needed it, and each is guarded by a
test that fails if it regresses:

- `runStream` + `OutputSink` — convert files larger than memory. `BlobSource`
  reads input in slices, `StreamTarget` writes output as produced.
- Commit/discard ownership on the file sink — a muxer closes its target on
  failure too, and for a file stream close *is* commit, so committing is a
  separate decision the caller makes only on success.
- `onNotice` — warnings that persist beside the result instead of flashing past
  in a progress bar.
- `onOutputType` — engines report the type they actually produced, for tools
  whose output depends on the file (extracted cover art is JPEG or PNG).
- `runMany` + `combinesInputs` — several files in, one out, without the batch
  runner converting each separately.
- `timerange` / `timestamp` controls — bounds come from a duration probe rather
  than the declaration.
- `heavyDownloadMb` + consent gate — nothing large is fetched without asking.

---

## Findings worth not re-learning

Library behaviour that cost real time and is now recorded in the code:

- mediabunny's `Conversion` **re-encodes on any trim** — its copy path needs
  `firstTimestamp >= startTimestamp`. Keyframe trim had to be built at the
  packet level.
- mediabunny re-encodes when the target container cannot carry the source
  codec, regardless of `forceTranscode: false`, and does not expose that — so
  the phase label must ask the format, not the flag.
- AAC's encoder-delay priming makes `trim.start` default to clamping at 0,
  which silently forces a re-encode of audio meant to be copied.
- libflacjs's helper classes cannot be bundled (UMD factory shadows `require`);
  drive the C API directly, as its own README advises for bundlers.
- pdf-lib 1.17.1 ignores `byteOffset`, and Node pools small files at non-zero
  offsets — pass `new Uint8Array(...)`, never a raw or re-pooled Buffer.
- Emscripten modules resolve sibling assets relative to the *script* directory,
  which after bundling is `_next/static/chunks/`.

Test-design failures that presented as product bugs — all three found by
instrumenting behaviour before debugging the implementation:

- A **periodic** audio fixture made an offset assertion vacuous: 440Hz + 660Hz
  repeats exactly every 0.5s, so the trimmed window matched at offset 0 too.
- **Byte-identical** image fixtures: `testsrc` with different `decimals` renders
  identically at frame zero, so every page "contained" every other page's image.
- A **passing falsification only proves the mutation you tried.** Disabling the
  R128 relative gate and removing K-weighting both passed the whole suite,
  because the fixtures were uniform mid-frequency tones. Fixtures with quiet
  passages and with bass/treble content now catch them by 2.77 LU and 4.06 LU.

---

## Known red, not mine

As of this resync, `pnpm lint` fails on the design lane's files:

- 6 × `noImportantStyles` in `src/app/globals.css` and
  `src/design/chrome/chrome.css` — these look like deliberate overrides.
  Removing them would change rendering, so it needs a design decision: strip
  them, or add a Biome rule override for CSS.
- `noNonNullAssertion` warnings in several design components.

`pnpm typecheck` and `pnpm build` were also red at resync and are now green —
see the session log below.
