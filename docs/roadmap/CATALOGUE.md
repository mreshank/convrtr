# convrtr — Complete Tool Catalogue

The exhaustive inventory of every tool convrtr intends to ship, across every category.
Nothing here is aspirational hand-waving: each entry names the engine that will run it,
its fidelity class, and an honest feasibility verdict for in-browser execution.

**This document is the source of truth for scope.** The registry in code mirrors it.
No tool ships that is not listed here; nothing listed here is silently dropped.

---

## Legend

**Fidelity**

| Class | Meaning |
|---|---|
| `LOSSLESS` | Bit-exact or mathematically reversible. No quality decision is made. |
| `LOSSLESS-CAPABLE` | Lossless by default; lossy only if the user explicitly opts in. |
| `LOSSY-ON-REQUEST` | Default is the highest practical quality; user may choose to degrade. |
| `INHERENTLY-LOSSY` | The target format cannot represent the source faithfully (e.g. → GIF). Stated plainly in the UI. |

**Feasibility (in-browser, zero server)**

| Verdict | Meaning |
|---|---|
| `TRIVIAL` | Pure JS, no WASM, instant, <50 KB. |
| `SOLVED` | Mature WASM/native-API path exists. Ship with confidence. |
| `HARD` | Achievable but needs real engineering (large module, streaming, memory ceilings). |
| `FRONTIER` | Possible but at the edge — heavy model/module, slow on low-end devices. Ship behind an explicit warning. |
| `BLOCKED` | Cannot be done well client-side today. **Not shipped.** Documented so we do not re-litigate it. |

---

## 1. IMAGE

The broadest category and the highest search volume. Strongest lossless story of any category.

### 1.1 Format conversion matrix

Inputs: `JPEG` `PNG` `WebP` `AVIF` `GIF` `BMP` `TIFF` `HEIC/HEIF` `SVG` `ICO` `JXL` `QOI` `TGA` `PBM/PGM/PPM` `PSD` `RAW (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2, SRW, PEF)` `EXR` `HDR` `ICNS` `XCF`

Outputs: `JPEG` `PNG` `WebP` `AVIF` `JXL` `GIF` `BMP` `TIFF` `ICO` `QOI` `PDF` `SVG (traced)`

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| HEIC → JPG / PNG / WebP | libheif-wasm → jSquash | `LOSSY-ON-REQUEST` | `SOLVED` |
| PNG ↔ WebP (lossless mode) | jSquash (libwebp) | `LOSSLESS` | `SOLVED` |
| PNG → AVIF | jSquash (libavif) | `LOSSLESS-CAPABLE` | `SOLVED` |
| JPEG → JXL (lossless recompression, ~20% smaller, fully reversible) | libjxl-wasm | `LOSSLESS` | `SOLVED` |
| JXL → JPEG (exact original restored) | libjxl-wasm | `LOSSLESS` | `SOLVED` |
| Any raster → PNG / WebP / AVIF / JXL / TIFF / BMP / QOI | wasm-vips / jSquash | varies | `SOLVED` |
| SVG → PNG / JPG / WebP (at any scale) | Canvas + resvg-wasm | `LOSSLESS` (vector→raster at chosen DPI) | `SOLVED` |
| Raster → SVG (vector trace) | potrace-wasm / imagetracerjs | `INHERENTLY-LOSSY` | `SOLVED` |
| RAW → JPEG / PNG / TIFF / DNG | LibRaw-wasm | `LOSSY-ON-REQUEST` | `HARD` — 4 MB module, large files |
| PSD → PNG / JPG (flattened) | ag-psd | `LOSSY-ON-REQUEST` | `SOLVED` |
| TIFF ↔ PNG (multi-page aware) | UTIF.js / wasm-vips | `LOSSLESS` | `SOLVED` |
| EXR / HDR → PNG / JPG (tone-mapped) | tinyexr-wasm | `INHERENTLY-LOSSY` | `HARD` |
| XCF → PNG | — | — | `BLOCKED` (no viable WASM port) |

### 1.2 Compression & optimisation

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| PNG lossless optimise | oxipng-wasm (+ zopfli) | `LOSSLESS` | `SOLVED` |
| JPEG lossless optimise (jpegtran-equivalent) | mozjpeg-wasm | `LOSSLESS` | `SOLVED` |
| JPEG re-compress with quality control | mozjpeg-wasm | `LOSSY-ON-REQUEST` | `SOLVED` |
| WebP / AVIF / JXL quality compression | jSquash | `LOSSY-ON-REQUEST` | `SOLVED` |
| **Compress to target file size** (binary-search quality) | any encoder + search loop | `LOSSY-ON-REQUEST` | `SOLVED` |
| Lossy PNG quantisation (pngquant-equivalent) | imagequant-wasm | `LOSSY-ON-REQUEST` | `SOLVED` |
| SVG optimise | SVGO | `LOSSLESS` | `TRIVIAL` |
| GIF optimise / re-quantise | gifsicle-wasm | `LOSSY-ON-REQUEST` | `SOLVED` |
| Batch compress folder | worker pool | inherits | `SOLVED` |

### 1.3 Editing & geometry

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| Resize (Lanczos3 / Mitchell — real resampling, not canvas bilinear) | wasm-vips | `LOSSY-ON-REQUEST` | `SOLVED` |
| Crop / trim whitespace | wasm-vips | `LOSSLESS` | `SOLVED` |
| **Lossless JPEG rotate / flip** (transform without re-encode) | jpegtran via mozjpeg-wasm | `LOSSLESS` | `SOLVED` |
| Rotate / flip (general) | Canvas / vips | `LOSSLESS-CAPABLE` | `TRIVIAL` |
| Bulk rename + resize pipeline | worker pool | inherits | `SOLVED` |
| Add watermark / text overlay | Canvas | `LOSSY-ON-REQUEST` | `TRIVIAL` |
| Round corners / add border / padding | Canvas | `LOSSLESS-CAPABLE` | `TRIVIAL` |
| Image diff / visual compare | pixelmatch | n/a (analysis) | `TRIVIAL` |

### 1.4 Colour & metadata

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| View EXIF / IPTC / XMP | exifr | n/a | `TRIVIAL` |
| **Strip all metadata / GPS scrub** (privacy) | piexifjs / vips | `LOSSLESS` | `TRIVIAL` |
| Edit EXIF fields | piexifjs | `LOSSLESS` | `TRIVIAL` |
| Grayscale / sepia / channel ops | vips | `LOSSY-ON-REQUEST` | `SOLVED` |
| ICC profile convert / assign / strip | vips (lcms) | `LOSSLESS-CAPABLE` | `HARD` |
| Extract dominant palette | node-vibrant | n/a | `TRIVIAL` |

### 1.5 Generators

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| Favicon / ICO pack (multi-resolution + manifest) | vips + ico encoder | `LOSSLESS` | `SOLVED` |
| Apple touch icon / PWA icon set | vips | `LOSSLESS` | `SOLVED` |
| Images → PDF | pdf-lib | `LOSSLESS` | `SOLVED` |
| PDF → images | pdf.js / mupdf-wasm | `LOSSLESS` at chosen DPI | `SOLVED` |
| Image → base64 data URI | FileReader | `LOSSLESS` | `TRIVIAL` |
| BlurHash / ThumbHash / LQIP placeholder | thumbhash | n/a | `TRIVIAL` |
| Sprite sheet + CSS | Canvas | `LOSSLESS` | `TRIVIAL` |
| OG image / social card from template | Canvas | n/a | `TRIVIAL` |

### 1.6 Animated images

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| GIF → WebP / AVIF / APNG (animated) | vips / libwebp | `LOSSLESS-CAPABLE` | `SOLVED` |
| GIF → MP4 / WebM | WebCodecs + muxer | `LOSSY-ON-REQUEST` | `SOLVED` |
| Video → GIF (with optimal palette generation) | WebCodecs + gifenc | `INHERENTLY-LOSSY` | `SOLVED` |
| APNG ↔ animated WebP | libwebp | `LOSSLESS` | `SOLVED` |
| Split animation into frames | vips | `LOSSLESS` | `SOLVED` |
| Frames → animated GIF / WebP | gifenc / libwebp | `LOSSLESS-CAPABLE` | `SOLVED` |

### 1.7 ML-assisted (frontier)

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| Background removal | onnxruntime-web + U²-Net / BiRefNet | `LOSSY-ON-REQUEST` | `FRONTIER` — 40–170 MB model |
| Super-resolution upscale | onnxruntime-web + Real-ESRGAN | `LOSSY-ON-REQUEST` | `FRONTIER` — slow without WebGPU |
| Face blur / anonymise | onnxruntime-web | `LOSSY-ON-REQUEST` | `FRONTIER` |

---

## 2. VIDEO

The differentiator. Nobody does this well client-side, because everybody re-encodes when they
should be remuxing.

Inputs: `MP4` `WebM` `MOV` `MKV` `AVI` `FLV` `WMV` `MPEG/MPG` `TS/M2TS` `3GP` `OGV` `GIF` `ProRes` `AV1` `HEVC`
Outputs: `MP4 (H.264 / HEVC / AV1)` `WebM (VP8 / VP9 / AV1)` `MKV` `MOV` `GIF` `animated WebP` `APNG`

### 2.1 Container & codec

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| **Remux — change container, copy streams, zero re-encode** | mediabunny / mp4box.js | `LOSSLESS` | `SOLVED` ★ flagship |
| MKV → MP4 (remux when H.264/AAC) | mediabunny | `LOSSLESS` | `SOLVED` |
| MOV → MP4 (remux) | mediabunny | `LOSSLESS` | `SOLVED` |
| TS / M2TS → MP4 (remux) | mediabunny | `LOSSLESS` | `SOLVED` |
| WebM → MP4 (remux if AV1/VP9 legal in MP4, else transcode) | mediabunny + WebCodecs | `LOSSLESS-CAPABLE` | `SOLVED` ★ flagship |
| MP4 → WebM | WebCodecs + webm-muxer | `LOSSY-ON-REQUEST` | `SOLVED` |
| AVI / FLV / WMV / MPEG → MP4 | ffmpeg.wasm | `LOSSY-ON-REQUEST` | `HARD` — legacy demuxers |
| Transcode to H.264 / HEVC / VP9 / AV1 | WebCodecs (GPU) | `LOSSY-ON-REQUEST` | `SOLVED` |
| Compress to target size (two-pass bitrate solve) | WebCodecs | `LOSSY-ON-REQUEST` | `SOLVED` |
| Probe / inspect all streams | MediaInfo-wasm | n/a | `SOLVED` |

### 2.2 Editing

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| **Trim / cut on keyframes (stream copy, no re-encode)** | mediabunny | `LOSSLESS` | `SOLVED` |
| Trim frame-accurate (re-encodes GOP head only) | WebCodecs | `LOSSLESS-CAPABLE` | `HARD` |
| Split into segments | mediabunny | `LOSSLESS` | `SOLVED` |
| Concatenate (same codec → copy) | mediabunny | `LOSSLESS` | `SOLVED` |
| Resize / scale | WebCodecs + Canvas | `LOSSY-ON-REQUEST` | `SOLVED` |
| Crop | WebCodecs + Canvas | `LOSSY-ON-REQUEST` | `SOLVED` |
| **Rotate via container metadata (no re-encode)** | mp4box.js | `LOSSLESS` | `SOLVED` |
| Change frame rate | WebCodecs | `LOSSY-ON-REQUEST` | `SOLVED` |
| Speed up / slow down | WebCodecs | `LOSSY-ON-REQUEST` | `SOLVED` |
| **Mute / remove audio track (copy video)** | mediabunny | `LOSSLESS` | `SOLVED` |
| Replace audio track | mediabunny | `LOSSLESS` (video) | `SOLVED` |
| Burn in subtitles | Canvas + WebCodecs | `LOSSY-ON-REQUEST` | `HARD` |
| Embed soft subtitle track | mediabunny | `LOSSLESS` | `SOLVED` |
| HDR → SDR tone-map | WebCodecs + WebGL | `INHERENTLY-LOSSY` | `FRONTIER` |

### 2.3 Extraction

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| **Extract audio (copy stream, no re-encode)** | mediabunny | `LOSSLESS` | `SOLVED` |
| Extract audio → MP3 / WAV / FLAC / Opus | WebCodecs + encoders | `LOSSY-ON-REQUEST` | `SOLVED` |
| Extract all frames → images | WebCodecs | `LOSSLESS` | `SOLVED` |
| Extract single frame / thumbnail / poster | WebCodecs | `LOSSLESS` | `SOLVED` |
| Extract subtitle track | mediabunny | `LOSSLESS` | `SOLVED` |
| Contact sheet / storyboard | WebCodecs + Canvas | n/a | `SOLVED` |
| Waveform / spectrogram image | Web Audio | n/a | `TRIVIAL` |

### 2.4 Creation

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| Images → video (slideshow / timelapse) | WebCodecs + muxer | `LOSSY-ON-REQUEST` | `SOLVED` |
| Screen / webcam record → MP4 | MediaRecorder + remux | `LOSSLESS-CAPABLE` | `SOLVED` |

---

## 3. AUDIO

Inputs: `MP3` `WAV` `FLAC` `AAC/M4A` `OGG Vorbis` `Opus` `WMA` `AIFF` `ALAC` `AMR` `CAF` `MIDI` `APE` `WavPack`
Outputs: `MP3` `WAV` `FLAC` `AAC/M4A` `OGG` `Opus` `AIFF` `ALAC`

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| **WAV ↔ FLAC ↔ ALAC (true lossless round-trip)** | libflac-wasm | `LOSSLESS` | `SOLVED` |
| Any → MP3 | libmp3lame-wasm | `LOSSY-ON-REQUEST` | `SOLVED` |
| Any → Opus / AAC / Vorbis | WebCodecs / libopus | `LOSSY-ON-REQUEST` | `SOLVED` |
| Bitrate / quality change | encoders | `LOSSY-ON-REQUEST` | `SOLVED` |
| Trim / split / merge | Web Audio + encoder | `LOSSLESS-CAPABLE` | `SOLVED` |
| Loudness normalise (EBU R128 / LUFS) | Web Audio | `LOSSY-ON-REQUEST` | `SOLVED` |
| Sample rate / bit depth / channel convert | Web Audio | `LOSSLESS-CAPABLE` | `SOLVED` |
| Mono ↔ stereo | Web Audio | `LOSSLESS-CAPABLE` | `TRIVIAL` |
| Speed / pitch shift (independent) | soundtouch-js | `LOSSY-ON-REQUEST` | `SOLVED` |
| Silence trim / detect | Web Audio | `LOSSLESS-CAPABLE` | `TRIVIAL` |
| Fade in / out | Web Audio | `LOSSY-ON-REQUEST` | `TRIVIAL` |
| ID3 / Vorbis tag read & write | music-metadata + browser-id3-writer | `LOSSLESS` | `TRIVIAL` |
| Cover art extract / embed | music-metadata | `LOSSLESS` | `TRIVIAL` |
| MIDI → WAV (SoundFont synthesis) | js-synthesizer / spessasynth | n/a | `HARD` — needs SF2 asset |
| Vocal / stem separation | onnxruntime-web + Demucs | `LOSSY-ON-REQUEST` | `FRONTIER` |
| WMA / APE decode | ffmpeg.wasm | `LOSSY-ON-REQUEST` | `HARD` |

---

## 4. DOCUMENT & PDF

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| **PDF merge** | pdf-lib | `LOSSLESS` | `SOLVED` |
| **PDF split / extract / delete / reorder pages** | pdf-lib | `LOSSLESS` | `SOLVED` |
| PDF rotate pages | pdf-lib | `LOSSLESS` | `SOLVED` |
| PDF compress (image downsample + stream recompress) | mupdf-wasm / qpdf-wasm | `LOSSY-ON-REQUEST` | `SOLVED` |
| PDF linearise (fast web view) | qpdf-wasm | `LOSSLESS` | `SOLVED` |
| PDF → images (any DPI) | pdf.js / mupdf-wasm | `LOSSLESS` | `SOLVED` |
| Images → PDF | pdf-lib | `LOSSLESS` | `SOLVED` |
| PDF → text | pdf.js | `LOSSLESS-CAPABLE` | `SOLVED` |
| PDF → Markdown | pdf.js + layout heuristics | `INHERENTLY-LOSSY` | `HARD` |
| Remove PDF password (password known) | qpdf-wasm | `LOSSLESS` | `SOLVED` |
| Add PDF password / permissions | qpdf-wasm | `LOSSLESS` | `SOLVED` |
| PDF watermark / stamp / page numbers | pdf-lib | `LOSSLESS` | `SOLVED` |
| PDF metadata edit | pdf-lib | `LOSSLESS` | `TRIVIAL` |
| PDF form fill / flatten | pdf-lib | `LOSSLESS` | `SOLVED` |
| **OCR → searchable PDF** | tesseract.js | `LOSSLESS` (adds text layer) | `SOLVED` — 100+ languages |
| DOCX → HTML / Markdown | mammoth.js | `INHERENTLY-LOSSY` | `SOLVED` |
| XLSX / ODS → CSV / JSON | SheetJS | `LOSSLESS-CAPABLE` | `SOLVED` |
| Markdown → HTML / PDF | marked + print pipeline | `LOSSLESS` | `SOLVED` |
| HTML → PDF | browser print-to-PDF | `LOSSLESS-CAPABLE` | `SOLVED` |
| EPUB → TXT / HTML | epub.js | `LOSSLESS-CAPABLE` | `SOLVED` |
| CBZ / CBR → PDF | libarchive + pdf-lib | `LOSSLESS` | `SOLVED` |
| DJVU → PDF | djvu.js | `LOSSY-ON-REQUEST` | `HARD` |
| **DOCX → PDF (high fidelity)** | — | — | `BLOCKED` — needs LibreOffice-WASM (~300 MB). Revisit if it slims. |
| **PPTX → PDF / images** | — | — | `BLOCKED` — same reason |
| MOBI / AZW3 ↔ EPUB | — | — | `BLOCKED` — no viable client-side converter |

---

## 5. DATA & DEVELOPER FORMATS

Fastest category to build, instant to run, entirely `LOSSLESS`, and surprisingly high traffic.

Formats: `JSON` `JSONL/NDJSON` `CSV` `TSV` `YAML` `TOML` `XML` `INI` `Parquet` `Avro` `SQL` `SQLite` `XLSX` `HTML table` `Markdown table` `MessagePack` `CBOR` `BSON` `Protobuf` `HCL` `.env` `plist`

| Tool | Engine | Feasibility |
|---|---|---|
| Any ↔ any conversion matrix | papaparse, js-yaml, smol-toml, fast-xml-parser | `TRIVIAL` |
| Parquet ↔ JSON / CSV | hyparquet | `SOLVED` |
| SQLite browse / query / export | sql.js | `SOLVED` |
| SQL dump ↔ SQLite | sql.js | `SOLVED` |
| JSON format / minify / validate / sort keys | native | `TRIVIAL` |
| JSON flatten / unflatten / diff / merge | flat, jsondiffpatch | `TRIVIAL` |
| JSONPath / jq-style query | jsonpath-plus | `TRIVIAL` |
| JSON → TypeScript / Zod / Go struct / Python dataclass / Rust serde | quicktype-core | `SOLVED` |
| JSON Schema infer / validate | ajv | `TRIVIAL` |
| CSV dedupe / column ops / delimiter change | papaparse | `TRIVIAL` |
| OpenAPI ↔ Postman collection | custom | `TRIVIAL` |
| GraphQL SDL → TypeScript | graphql-js | `SOLVED` |
| .env ↔ JSON / YAML | dotenv | `TRIVIAL` |

---

## 6. ARCHIVE & COMPRESSION

Formats: `ZIP` `TAR` `GZ` `BZ2` `XZ` `7Z` `RAR (extract only)` `ZSTD` `LZ4` `BROTLI` `CAB` `ISO`

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| Extract any archive | libarchive-wasm | `LOSSLESS` | `SOLVED` |
| Create ZIP / TAR / GZ / ZSTD | fflate, zstd-wasm | `LOSSLESS` | `SOLVED` |
| Convert archive format (e.g. RAR → ZIP) | libarchive + fflate | `LOSSLESS` | `SOLVED` |
| Recompress at higher ratio | zstd / brotli | `LOSSLESS` | `SOLVED` |
| Inspect contents without extracting | libarchive-wasm | n/a | `SOLVED` |
| Password-protected ZIP (create / extract) | zip.js | `LOSSLESS` | `SOLVED` |
| Split / join multi-part archives | fflate | `LOSSLESS` | `HARD` |
| ISO extract | libarchive-wasm | `LOSSLESS` | `SOLVED` |
| Create 7z / RAR | — | — | `BLOCKED` — RAR compression is proprietary |

---

## 7. TEXT, ENCODING & CRYPTO

All `TRIVIAL` unless noted. All `LOSSLESS`. Low effort, high traffic, excellent internal-link fodder.

| Group | Tools |
|---|---|
| Encoding | Base64 (text + file), Base32, Base58, Base85, URL encode/decode, HTML entities, Punycode, Quoted-printable |
| Numeric | Hex ↔ decimal ↔ binary ↔ octal, arbitrary base, Roman numerals, IEEE-754 inspector |
| Hashing | MD5, SHA-1, SHA-256, SHA-384, SHA-512, SHA-3, CRC32, BLAKE3, xxHash — with **streaming file hashing** for multi-GB files |
| Auth | HMAC, JWT decode & verify, bcrypt hash/compare, TOTP generator |
| Encryption | AES-GCM file encrypt/decrypt (WebCrypto), RSA/ECDSA keygen, PGP encrypt/decrypt (openpgp.js), X.509 certificate decode, SSH key format convert |
| IDs | UUID v1/v4/v7, ULID, nanoid, Snowflake decode |
| Text ops | Case convert, slugify, sort/dedupe/reverse/number lines, trim, wrap, diff two texts, word & character count |
| Charset | UTF-8/16/32, Latin-1, Shift-JIS, GBK, Big5, KOI8-R; line endings CRLF ↔ LF ↔ CR |
| Unicode | Normalisation (NFC/NFD/NFKC/NFKD), escape/unescape, codepoint inspector, invisible-character detector |
| Visual | QR code generate & decode (jsQR), barcode generate (EAN/UPC/Code128), ASCII art |
| Regex | Tester with match explanation, cheatsheet |

---

## 8. CODE

| Tool | Engine | Feasibility |
|---|---|---|
| Format JS/TS/JSX/CSS/HTML/JSON/YAML/MD | prettier (standalone) | `SOLVED` |
| Format SQL | sql-formatter | `TRIVIAL` |
| Minify JS/TS | terser / esbuild-wasm | `SOLVED` |
| Minify CSS / HTML | csso, html-minifier | `SOLVED` |
| TypeScript → JavaScript | esbuild-wasm | `SOLVED` |
| SCSS / LESS → CSS | sass-wasm | `SOLVED` |
| Syntax-highlight → HTML / SVG / PNG | shiki | `SOLVED` |
| Code diff (side-by-side) | diff2html | `TRIVIAL` |
| Cron expression explain / build | cronstrue | `TRIVIAL` |

---

## 9. FONT

Formats: `TTF` `OTF` `WOFF` `WOFF2` `EOT` `SVG font`

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| TTF/OTF ↔ WOFF ↔ WOFF2 | wawoff2, opentype.js | `LOSSLESS` | `SOLVED` |
| Subset by character set / language | harfbuzzjs subset | `LOSSLESS` (for kept glyphs) | `SOLVED` |
| Inspect glyphs, metrics, features | opentype.js | n/a | `SOLVED` |
| Generate `@font-face` CSS + preload tags | custom | n/a | `TRIVIAL` |
| Variable font → static instance | harfbuzzjs | `LOSSLESS` | `HARD` |
| Font → base64 data URI | FileReader | `LOSSLESS` | `TRIVIAL` |

---

## 10. SUBTITLES & CAPTIONS

Formats: `SRT` `VTT` `ASS/SSA` `SBV` `SUB` `TTML/DFXP` `SCC` `LRC`

All `TRIVIAL`, all `LOSSLESS-CAPABLE`. Full conversion matrix, plus: shift/scale timing, merge tracks,
split by time, strip formatting, fix encoding, extract from video, sync offset.

---

## 11. 3D & CAD

Formats: `STL` `OBJ` `PLY` `GLTF/GLB` `FBX (read)` `DAE` `3MF` `STEP` `X3D`

| Tool | Engine | Fidelity | Feasibility |
|---|---|---|---|
| STL ↔ OBJ ↔ PLY ↔ GLTF/GLB ↔ 3MF | three.js loaders/exporters | `LOSSLESS-CAPABLE` | `SOLVED` |
| STL ASCII ↔ binary | custom | `LOSSLESS` | `TRIVIAL` |
| Mesh compress (Draco / meshopt) | draco3d, meshoptimizer | `LOSSY-ON-REQUEST` | `SOLVED` |
| STEP → mesh | occt-import-js | `INHERENTLY-LOSSY` (B-rep → mesh) | `HARD` — 8 MB module |
| Inspect (triangles, bounds, materials) | three.js | n/a | `TRIVIAL` |
| FBX → GLB | three.js FBXLoader | `LOSSLESS-CAPABLE` | `HARD` |

---

## 12. GEO & MAPPING

Formats: `GeoJSON` `TopoJSON` `KML` `KMZ` `GPX` `Shapefile` `WKT` `WKB` `CSV with coordinates`

Full conversion matrix via `shapefile.js`, `togeojson`, `topojson`, `wellknown`. All `SOLVED` or `TRIVIAL`,
all `LOSSLESS-CAPABLE`. Plus: coordinate system reproject (proj4js), simplify geometry, bounding box,
distance/area calculation.

---

## 13. CALENDAR, CONTACTS & MISC STRUCTURED

| Tool | Engine | Feasibility |
|---|---|---|
| ICS ↔ JSON / CSV | ical.js | `TRIVIAL` |
| VCF ↔ CSV / JSON | vcard-parser | `TRIVIAL` |
| Timezone / epoch converter | Temporal API | `TRIVIAL` |
| Chrome/Firefox bookmarks ↔ JSON / HTML | custom | `TRIVIAL` |

---

## 14. COLOUR & DESIGN

`HEX` ↔ `RGB` ↔ `HSL` ↔ `HSV` ↔ `LAB` ↔ `LCH` ↔ `OKLCH` ↔ `OKLAB` ↔ `CMYK` ↔ `P3`

Plus: palette extraction from image, WCAG contrast checker, colour-blindness simulator,
gradient generator, shade/tint scale generator, Tailwind config export, CSS custom property export,
ASE / ACO / GPL palette file read & write.

---

## 15. UNITS & CALCULATORS

Length, mass, temperature, area, volume, speed, time, **data size (SI vs binary)**, pressure, energy,
power, force, angle, frequency, fuel economy, cooking measures, shoe/clothing sizes.

Domain calculators that matter here: **bitrate ↔ file size ↔ duration**, video encoding size estimator,
aspect ratio, resolution scaling, DPI/PPI, print size, audio sample-size, percentage, date difference,
number base.

> Currency conversion is **excluded** — it requires a live rate feed, which requires a server. Listing it
> would break the zero-server guarantee for a marginal tool.

---

## Explicitly excluded, and why

Recording these prevents re-litigating them every planning cycle.

| Excluded | Reason |
|---|---|
| DOCX/PPTX/XLSX → PDF (high fidelity) | Requires LibreOffice-WASM, ~300 MB. Revisit only if a slim build appears. |
| MOBI / AZW3 conversion | No viable client-side implementation; Amazon formats are hostile. |
| RAR / 7z **creation** | RAR compression is proprietary; 7z creation has no maintained WASM encoder. |
| Currency conversion | Needs a live server-fed rate source. Violates the zero-server guarantee. |
| DRM-protected media of any kind | Legally and technically out of scope. Never. |
| Cloud-storage import (Drive/Dropbox) | Would mean OAuth, a backend, and files transiting a server. Contradicts the core promise. |
| Anything requiring an account | There is no server. There are no accounts. Permanently out of scope. |

---

## Rough counts

| Category | Tools |
|---|---|
| Image | ~48 |
| Video | ~31 |
| Audio | ~26 |
| Document & PDF | ~24 |
| Data & developer | ~22 |
| Archive | ~14 |
| Text / encoding / crypto | ~30 |
| Code | ~9 |
| Font | ~9 |
| Subtitles | ~12 |
| 3D & CAD | ~8 |
| Geo | ~10 |
| Calendar & contacts | ~4 |
| Colour | ~12 |
| Units & calculators | ~25 |
| **Total** | **~284** |

Each is a registry entry, a generated static route, and an indexed landing page.
