# Deploying convrtr

Target: `convrtr.mreshank.com`. The site is a pure static export with no server,
so hosting is trivial — the only thing that needs care is the two security
headers.

## Why the headers matter

`vercel.json` sets:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

Together these enable **cross-origin isolation**, which is what makes
`SharedArrayBuffer` available. Nothing in the current slice needs it — the WebP
codec runs single-threaded — but multithreaded `ffmpeg.wasm` (Phase 2, video)
does, and it is far easier to ship these from day one than to retrofit them
after third-party embeds have crept in.

**Verify them after the first deploy.** If they are missing, video conversion
will silently fall back to single-threaded and be several times slower.

## One-time setup

1. Go to **vercel.com/new** and import `mreshank/convrtr`.
2. **Leave every build setting at its default.** `vercel.json` already pins the
   build command, the output directory, and the framework preset, so nothing in
   the dashboard needs changing — and dashboard overrides would take precedence
   over the committed config, which is the opposite of what you want.
3. Deploy. You get a `*.vercel.app` URL.
4. **Project Settings → Domains** → add `convrtr.mreshank.com`.
5. At whoever hosts DNS for `mreshank.com`, add the record Vercel shows you —
   normally `CNAME convrtr → cname.vercel-dns.com`.
6. Wait for the certificate to issue (usually a minute or two).

After that, every push to `main` deploys automatically.

## Verify the deploy

```bash
# Headers present?
curl -sI https://convrtr.mreshank.com/image/png-to-webp | grep -i cross-origin

# Expect exactly:
#   cross-origin-opener-policy: same-origin
#   cross-origin-embedder-policy: credentialless

# Page renders and is prerendered (not client-rendered)?
curl -s https://convrtr.mreshank.com/image/png-to-webp | grep -o '<title>[^<]*</title>'

# Structured data present?
curl -s https://convrtr.mreshank.com/image/png-to-webp | grep -c 'application/ld+json'
```

Then open the page and actually convert a PNG, with DevTools' Network tab open.
**You should see the app's own assets load and nothing else.** That is the whole
product promise, and it is checkable by eye in ten seconds.

## Why the build is pinned to webpack

`package.json`'s build script is `next build --webpack`, not the Next 16 default
of Turbopack. This is deliberate; do not "modernise" it without reading this.

Two separate problems surfaced together while adding the image pack, and the
second hid the first:

1. **A real bug.** `libheif-js`'s default entry is its Node build, which
   `require`s `fs`. Pulled into a browser worker bundle it cannot resolve. The
   fix was to import `libheif-js/wasm-bundle` — the entry the package README
   points browser bundlers at (real WebAssembly, binary inlined, no Node
   built-ins).

2. **A tooling difference.** Webpack reported that unresolved `fs` in seconds
   with a full import trace. **Turbopack instead stalled indefinitely at 0% CPU,
   printing a bare `undefined` and no diagnostic.** Even after the import was
   fixed, Turbopack continued to stall on this dependency graph where webpack
   builds cleanly.

Since this is a static export, Turbopack's speed advantage is worth little and
its silence is expensive. Webpack builds all 20 pages reliably.

**Generalisable lesson:** when a build hangs with no output, switch bundlers
before bisecting your own code. One `--webpack` run prints the answer.

If you ever want to try Turbopack again, do it as a deliberate experiment on a
machine that is not under memory pressure — concurrent swap exhaustion (swap was
over 24 GB in use) produced identical-looking hangs on unrelated commits,
including a known-good baseline, which made the bisect signal worthless.

## Why the config is explicit

The first deploy failed with:

```
Error: No Output Directory named "public" found after the Build completed.
```

Two things combined to cause it. Next's `output: "export"` writes to `out/`, not
`public/` — and `public/` is empty in this repo (its only contents were the
create-next-app SVGs, deleted during review), so **git does not track it and
Vercel's clone had no `public/` at all**. Vercel fell back to a preset expecting
one.

`vercel.json` now names all three explicitly:

```json
"buildCommand": "pnpm build",
"outputDirectory": "out",
"framework": null
```

`framework: null` is deliberate. This *is* a plain static site once built, and
it is exactly what the e2e suite tests — `scripts/serve-static.mjs` serves `out/`
as static files with the same two headers. Making the host do the same thing
removes a class of "works locally, differs in production" surprises. Nothing is
lost: `images.unoptimized` is already set, so no Next.js runtime feature is in
use.

`src/__tests__/deploy-config.test.ts` asserts these values, so a regression here
fails CI rather than a deploy.

## If the headers do not appear

Check that no **dashboard** override is set — Project Settings values take
precedence over `vercel.json`. Clear any override for build command or output
directory and redeploy so the committed config wins.

## Cost

Zero. Static hosting on Vercel's free/Pro tier, no database, no functions, no
egress beyond page assets. The heavy WASM codecs are npm dependencies bundled at
build time.

When the video pack lands, `ffmpeg.wasm` is ~30 MB and should be moved to a
separate origin (Cloudflare R2 has free egress) rather than served from Vercel —
see the spec's deployment section. Not needed yet.

## What is deployed today

A single working tool at `/image/png-to-webp`, plus the home page. Every route
is prerendered HTML with its own title, description, canonical URL and JSON-LD,
generated from the registry.

## Third-party licences shipped to the browser

Two dependencies are LGPL-3.0 and reach users as part of the bundle, so they
are worth recording rather than discovering later:

- **ffmpeg.wasm core** (`@ffmpeg/core`) — the legacy-video tier. Served from
  `public/ffmpeg/`, downloaded only on consent.
- **@breezystack/lamejs** — the MP3 encoder, bundled into the audio chunk.

Both are used unmodified, which is the condition that keeps LGPL compliance
straightforward for a web app: the obligation is to let a user replace the
library, and an unmodified, separately identifiable dependency satisfies that
far more cleanly than a patched fork would. Neither has been forked or altered,
and both should stay that way — patching either turns a simple attribution into
a distribution obligation.

MP3's patents expired in 2017, so encoding carries no patent question; the
licence is the only consideration.

Everything else in the bundle is MIT, Apache-2.0 or BSD.
