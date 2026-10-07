# convrtr

Universal client-side and local file conversion library & CLI instrument for 270+ formats.

100% private. Zero network uploads. Pure device execution via WebAssembly and modern web primitives.

---

## ARCHITECTURAL PRINCIPLES

- **DEVICE-LOCAL**: Conversions happen entirely in your process or browser environment. No third-party servers, no analytics beacons, no data retention.
- **ZERO EMOJIS**: Clean monospace typography, geometric indicators (`↗`, `➔`), technical precision inspired by Dieter Rams.
- **MULTI-HOP ROUTING**: Automatic shortest-path graph resolution for cross-codec and compound transcode pipelines (e.g. FLAC ➔ WAV ➔ MP3).
- **UNIVERSAL RUNTIME**: Seamless operation in Node.js (v18+), Bun, modern browsers, Chrome Extensions, and PWA environments.

---

## INSTALLATION

```bash
# Global CLI usage
npm install -g convrtr

# Project dependency
pnpm add convrtr
# or
npm install convrtr
```

---

## CLI USAGE

### Convert a File

```bash
convrtr photo.heic --to jpg
convrtr track.flac --to mp3 --output ./dist/track.mp3
convrtr document.srt --to vtt
```

### Inspect Conversion Routes

Check if direct or multi-hop path exists between formats:

```bash
convrtr check flac mp3
# STATUS: MULTI-HOP CONVERSION AVAILABLE [FLAC ➔ MP3]
# ROUTE:  audio/flac-to-wav ➔ audio/wav-to-mp3
```

### List Reachable Target Formats

```bash
convrtr targets heic
# TARGETS FOR .HEIC [6 AVAILABLE]:
#   avif, jpg, jxl, pdf, png, webp
```

### List All Supported Formats

```bash
convrtr formats
```

### List Tools by Category

```bash
convrtr list audio
convrtr list image
convrtr list video
convrtr list document
convrtr list data
convrtr list 3d
```

---

## PROGRAMMATIC API

### Universal File Conversion (`convert`)

`convert()` accepts file paths (Node.js), `ArrayBuffer`, `Uint8Array`, or browser `Blob`/`File` instances.

```typescript
import { convert } from "convrtr";
import { readFile, writeFile } from "node:fs/promises";

// Example 1: Convert binary buffer
const inputBuffer = await readFile("./input.svg");
const result = await convert(inputBuffer, {
  from: "svg",
  to: "svg", // optimizes SVG via local SVGO
});

console.log(result.ext);     // "svg"
console.log(result.toolId);  // "image/optimise-svg"
console.log(result.data);    // Uint8Array

await writeFile("./optimized.svg", result.data);

// Example 2: Convert directly to file on disk
await convert.toFile("./recording.wav", "./output.mp3", {
  to: "mp3",
  params: { bitrate: 192 },
  onProgress: (ratio, phase) => {
    console.log(`[${phase}] ${(ratio * 100).toFixed(0)}%`);
  },
});
```

### Format Discovery and Routing

```typescript
import {
  canConvert,
  getAvailableConversions,
  getAvailableTargetFormatsForExt,
  findConversionRoute,
} from "convrtr";

// Check viability
if (canConvert("flac", "mp3")) {
  const route = findConversionRoute("flac", "mp3");
  console.log("Steps required:", route.steps.map(s => s.tool.id));
}

// Available target formats for an input extension
const targets = getAvailableTargetFormatsForExt("heic");
console.log(targets.map(t => t.ext));
// ["jpg", "png", "webp", "avif", "jxl", "pdf"]

// Reachable conversions from extension
const audioOutputs = getAvailableConversions("wav");
```

### Low-Level Tool & Engine Execution

```typescript
import { runTool, getTool, TOOLS } from "convrtr";

// Query tool metadata
const heicTool = getTool("image/heic-to-png");

// Execute specific tool directly
const outputBuffer = await runTool("image/heic-to-png", inputUint8Array);
```

### Direct Registry & Engine Access

```typescript
import { TOOLS, CATEGORIES } from "convrtr/registry";
import { ENGINES, getEngine } from "convrtr/engines";
```

---

## SYSTEM REQUIREMENTS

- Node.js >= 18.0.0
- WebAssembly support enabled in runtime

---

## LICENSE

GPL-3.0 - Free software for private local computation.
