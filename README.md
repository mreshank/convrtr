# convrtr

A file conversion hub where every conversion runs inside the browser. No file is ever
uploaded, because there is no server to upload it to — the site is a static build, and the
conversion engines are WebAssembly modules and native browser codecs executing in Web Workers
on the user's own machine.

Every tool is lossless by default wherever that is achievable at a sensible size, and
visually lossless where it is not. From there, a quality dial lets the user trade fidelity for
size explicitly — the interface always states plainly what they are getting.

## Running it

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Before merging any change, run the full gate:

```bash
pnpm run ci
```

This runs, in order: typecheck, lint (Biome), unit tests (Vitest), the static production
build, and end-to-end tests (Playwright) — including the network assertion that fails the
build if any file byte would leave the browser.

## Architecture

Each tool is a declaration in `src/core/registry` — its accepted/output formats, quality
presets, advanced parameters, and SEO copy — with nothing hand-coded per tool in `src/app`.
`src/core/engines` holds one self-contained adapter per codec (currently a jSquash/WASM
PNG-to-WebP engine); `selectEngine` probes a tool's declared engines in order and picks the
first one the browser can actually run. `src/core/pipeline` is the worker boundary: it posts a
job to a Web Worker, streams progress and cancellation across `postMessage`, and never touches
a specific file format itself. `src/core/io` handles reading the input file and writing the
result back to disk (via the File System Access API where available, falling back to an
anchor-click download), also without format-specific knowledge.

The intended invariant: adding a new conversion touches only `core/registry` (and, if it needs
a new codec, `core/engines`) — never `src/app`.

The site is exported statically (`output: "export"`) and served with the
`Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` headers required for
`SharedArrayBuffer`-backed WASM codecs (see `vercel.json`).

## Documentation

See [`docs/`](./docs) for the full design spec, the tool catalogue, and the phased roadmap.
