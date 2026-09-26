# convrtr

```
================================================================================
   ____ ___  _   ___   ______ _____ _____ ____  
  / ___/ _ \| \ | \ \ / /  _ \_   _|  _ \___ \ 
 | |  | | | |  \| |\ V /| |_) || | | |_) |__) |
 | |__| |_| | |\  | | | |  _ < | | |  _ </ __/ 
  \____\___/|_| \_| |_| |_| \_\|_| |_| \_\_____|
                                                
   PRIVATE, IN-BROWSER FILE CONVERSION INSTRUMENT
   ZERO SERVER UPLOADS. 100% WEBASSEMBLY ENGINES.
================================================================================
```

[![License: AGPL-3.0](https://img.shields.io/badge/LICENSE-AGPL--3.0-000000.svg?style=flat-square)](./LICENSE)
[![TypeScript: Strict](https://img.shields.io/badge/TYPESCRIPT-STRICT-000000.svg?style=flat-square&logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)
[![Next.js: 16](https://img.shields.io/badge/NEXT.JS-16-000000.svg?style=flat-square&logo=nextdotjs&logoColor=ffffff)](https://nextjs.org/)
[![WebAssembly: SIMD](https://img.shields.io/badge/WEBASSEMBLY-SIMD-000000.svg?style=flat-square&logo=webassembly&logoColor=ffffff)](https://webassembly.org/)
[![Zero Uploads: Verified](https://img.shields.io/badge/NETWORK_LEAK-0_BYTES-000000.svg?style=flat-square)](https://github.com/mreshank/convrtr)
[![Chrome Extension](https://img.shields.io/badge/CHROME_STORE-v0.2.8-000000.svg?style=flat-square&logo=googlechrome&logoColor=ffffff)](https://chromewebstore.google.com/detail/convrtr/pgoadfnhcalnheeepcbngchmhlkgboal)

[Web App ↗](https://convrtr.mreshank.com) • [Chrome Web Store ↗](https://chromewebstore.google.com/detail/convrtr/pgoadfnhcalnheeepcbngchmhlkgboal) • [Architecture Specs ↗](./docs) • [Format Registry ↗](./src/core/registry)

---

## Overview

convrtr is an open-source, brutalist, privacy-first file conversion instrument. Every conversion executes entirely inside the client browser. No file byte is ever transmitted across the network, because there is no server to receive it. The application is compiled as a static client bundle, executing WebAssembly binaries and native browser codecs inside dedicated Web Workers on your local hardware.

### Key Highlights

- **Zero Server Uploads:** Complete local isolation. Your files never leave your device.
- **280+ Format Transformations:** Comprehensive coverage across Images, Audio, Video, Documents, Data tables, and Archives.
- **WebAssembly & Native Execution:** Powered by FFmpeg WASM, jSquash, Libheif, SQLite WASM, 7z WASM, Apache Arrow, and Libflac.
- **Network Invariant Enforcement:** Continuous automated CI assertions (Playwright) verify that zero outbound network requests occur during file processing.
- **Offline Capable:** Full Progressive Web App (PWA) and Service Worker architecture operates without internet connectivity.
- **Lossless Default:** All tools default to mathematically lossless output where achievable, and visually lossless where bounded by format constraints.
- **Chrome Extension Companion:** Side Panel, Omnibox quick dispatch, right-click context menu staging, and viewport capture.

---

## Architectural Comparison

Traditional online file converters force users to upload proprietary files to remote third-party cloud infrastructure. convrtr shifts the entire compute boundary to local hardware:

| Operational Metric | Traditional Cloud Converters (CloudConvert, Zamzar, Convertio) | convrtr Technical Instrument |
| :--- | :--- | :--- |
| **Execution Environment** | Remote third-party servers | Local WebAssembly / Web Workers |
| **Data Transmission** | 100% of file bytes uploaded + downloaded | 0 bytes transmitted (zero network traffic) |
| **Data Privacy & Compliance** | Third-party retention risk, GDPR/HIPAA concerns | Provable mathematical isolation on-device |
| **File Size Constraints** | Hard paywalls (typically capped at 25MB - 100MB) | Bounded solely by local system RAM |
| **Processing Latency** | Network upload latency + server queuing delay | Direct local CPU/SIMD throughput |
| **Offline Operation** | Requires active high-bandwidth internet connection | Fully operational offline |
| **Software Model** | Subscription tiers, advertisements, credit systems | Free, open-source under AGPL-3.0 |

---

## Execution Pipeline

```
+-----------------------------------------------------------------------------+
|                               LOCAL BROWSER                                 |
|                                                                             |
|  [Input File]                                                               |
|        |                                                                    |
|        v                                                                    |
|  [File System Access API / Blob Reader]                                     |
|        |                                                                    |
|        v                                                                    |
|  [Web Worker Thread Isolation] <==== postMessage (Progress / Cancellation)  |
|        |                                                                    |
|        +---> [Codec Selection Engine]                                       |
|                    |                                                        |
|                    +---> [WASM SIMD / SharedArrayBuffer]                    |
|                    |     (FFmpeg, jSquash, SQLite, 7z, Arrow)               |
|                    |                                                        |
|                    +---> [Native WebCodecs / Canvas API]                    |
|                                |                                            |
|                                v                                            |
|                    [Processed Output Buffer]                                |
|                                |                                            |
|  [Output File Written to Local Disk] <------------------------------------+ |
|                                                                             |
|  NETWORK TRAFFIC: 0 BYTES TRANSMITTED                                       |
+-----------------------------------------------------------------------------+
```

---

## Supported Format Capabilities

convrtr includes over 280 declarative converters organized across 5 core technical categories:

### 1. Image & Graphics Codecs
- **Next-Gen Web Formats:** AVIF, JXL, WebP, PNG, JPEG, SVG, SVGZ.
- **Mobile & Camera Raw:** HEIC, HEIF, TIFF, BMP, DNG, RAW, CR2, NEF.
- **Design & Creative:** PSD, PSB, KRA, ORA, CLIP, SKETCH, XD, PROCREATE, ARTSTUDIO.
- **Animation & Cursors:** GIF, APNG, WebP animation, CUR, ANI, XCUR.
- **Texture & Retro Graphics:** QOI, DDS, TGA, PCX, PPM, XBM, XPM, HDR, BLP, BPG, FITS.

### 2. Audio Processing & Synthesis
- **Hi-Fi Lossless & Streaming:** FLAC, WAV, ALAC, AIFF, OGG, Opus, MP3, AAC, M4A, WMA.
- **Tracker & Chiptune Formats:** MOD, XM, S3M, IT, 669, AMF, DBM, DSM, FAR, IMF, MED, MTM, OKT, PTM, RAD, STM, ULT.
- **Voice, Telecom & Legacy:** SILK (WeChat/Skype), AMR, ULAW, ALAW, VOC, VOX, VAG, AU, AUD, AVR, CAF, DSF, DSP, HMI, NIST, ROL, XMI, 8SVX.
- **Audio Operations:** Normalization, waveform rendering, tag removal, metadata inspection, lossless trimming.

### 3. Video & Animation Engines
- **Container & Codec Transcoding:** MP4, WebM, MKV, MOV, AVI, FLV, TS, OGV, 3GP.
- **Visual Transforms:** Video-to-GIF, video-to-WebP animation, audio extraction (MP4 to M4A/MP3), frame extraction.

### 4. Documents & Typography
- **PDF Manipulation:** Merge PDF, Split PDF, Rotate PDF, Images-to-PDF, Extract PDF pages.
- **Markup & Publishing:** EPUB, MOBI, Markdown, RTF, RTFD, LaTeX, Org-mode, LyX, HWP, PalmDoc, Man pages, Troff, Texinfo.
- **Vector & CAD:** DXF, PLT, DST, EXP, JEF, CGM, CDR, Draw.io, Excalidraw, JSONCanvas.
- **Notebooks & Archives:** Scrivener, GoodNotes, Joplin, Enex, CWK, SCORM.

### 5. Structured Data, Geospatial & Database
- **Analytics & Databases:** SQLite (`.sqlite` to `.zip`/`.csv`), Apache Parquet (`.parquet` to `.csv`), Apache Arrow (`.arrow` to `.csv`), DBF, DTA (Stata), SAV (SPSS), XPT (SAS).
- **Geospatial & Telemetry:** Shapefile (`.shp` to GeoJSON), GPX, KML, KMZ, TCX, IGC (Gliding), OSM, GeoPackage (`.gpkg`), DJI flight logs, GoPro GPMF metadata.
- **Structured Interchange:** CSV, JSON, GeoJSON, VCF (vCard), ICS (iCalendar), LDIF, OFX (Financial), Torrent metadata, Sol (Flash LSO).
- **Archive Extraction:** 7Z, ZIP, TAR, GZ, BZ2, XZ, ISO, WAD, PAK, XP3, Game memory cards (PSU, MCR, GCI, VMS).

---

## Chrome Extension Integration

convrtr is also published on the [Chrome Web Store](https://chromewebstore.google.com/detail/convrtr/pgoadfnhcalnheeepcbngchmhlkgboal).

### Keyboard Shortcuts
- `Command+Shift+C` (or `Ctrl+Shift+C`): Toggle docked Side Panel alongside active browsing tab.
- `Command+Shift+,` (or `Ctrl+Shift+,`): Open lightweight Quick Popup instrument.
- `Command+Shift+S`: Trigger instantaneous visible tab viewport snapshot into WASM image pipeline.
- `Command+O`: Trigger file picker dialog.
- `Command+Enter`: Execute pending conversion queue.
- `Command+D`: Download all completed conversions as a consolidated archive.

### Omnibox Quick Dispatch
Type `cv` in Chrome's address bar followed by target formats to jump straight to matched tools:
```
cv png to webp
cv sqlite to csv
cv flac to wav
```

---

## Verification & Security Guarantees

convrtr guarantees data confidentiality by architectural construction:
1. **Static Build Target:** Compiled strictly via `output: "export"`. No server endpoints or runtime API proxies exist.
2. **COOP/COEP Headers:** Emits strict `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to isolate memory threads for `SharedArrayBuffer` execution.
3. **Automated CI Network Leakage Assertion:** A Playwright end-to-end integration test monitors the browser network layer during conversion runs. Any outbound HTTP, WebSocket, or WebRTC packet targeting an external host immediately fails the build gate.

Run verification suite:
```bash
pnpm run ci
```

---

## Local Development & Engineering

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 10.0.0

### Installation
```bash
# Clone repository
git clone https://github.com/mreshank/convrtr.git
cd convrtr

# Install dependencies
pnpm install

# Start development server on port 3964
pnpm dev
```
Open [http://localhost:3964](http://localhost:3964).

### Available Commands
```bash
# Run unit test suite (Vitest)
pnpm test

# Run code style & lint checks (Biome)
pnpm lint

# Run TypeScript type verification
pnpm typecheck

# Build Chrome Extension bundle
pnpm build:extension

# Build static production web bundle
pnpm build

# Execute full continuous integration test gate
pnpm ci
```

---

## Adding New Converters

The codebase is engineered around strict declarative invariants. Adding a new file conversion tool touches only `src/core/registry` (and an adapter in `src/core/engines` if introducing a new codec binary). `src/app` remains untouched.

```typescript
// Example: src/core/registry/tools/image/example-to-webp.ts
import { defineTool } from "../defineTool";

export const exampleToWebp = defineTool({
  id: "example-to-webp",
  category: "image",
  kind: "convert",
  name: "EXAMPLE to WebP",
  accept: { ext: ["example"], mime: ["image/example"] },
  output: { ext: "webp", mime: "image/webp" },
  engines: ["jsquash-webp"],
  quality: {
    presets: ["lossless", "balanced", "smallest"],
    default: "lossless"
  }
});
```

---

## Frequently Asked Questions

### How does client-side file conversion work without a server?
Modern web browsers support WebAssembly (WASM), an efficient binary instruction format that runs at near-native speed. convrtr loads compiled C/C++/Rust codec libraries (such as FFmpeg, libwebp, libavif, and sqlite3) directly into the browser's JavaScript runtime. Execution occurs in isolated background Web Workers, leaving your main browser thread responsive.

### What is the maximum file size convrtr can process?
Because files are not uploaded across a network connection, there is no arbitrary bandwidth or file size cap imposed by convrtr. Processing limits are governed strictly by your device's available RAM and browser WebAssembly memory allocations (typically up to 2GB to 4GB per Worker instance).

### Does convrtr work completely offline?
Yes. convrtr registers a Service Worker that caches all application assets, stylesheets, scripts, and WebAssembly binaries locally. Once loaded, you can disconnect your machine from the internet and execute conversions indefinitely.

### Are my files or metadata stored anywhere?
No. Files reside exclusively in temporary browser memory buffers during active conversion and are discarded once saved or closed. No tracking scripts, analytics cookies, or remote telemetry payloads exist in the codebase.

---

## License

Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE).
