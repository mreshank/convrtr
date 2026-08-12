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
2. Vercel detects Next.js and pnpm from `pnpm-lock.yaml`. **Leave every build
   setting at its default** — do not override the output directory. Next's
   `output: "export"` is handled by Vercel's Next.js builder.
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

## If the headers do not appear

Vercel occasionally ignores `vercel.json` headers when a framework preset owns
the response. Fallback: set the framework preset to **Other** and the output
directory to `out`, redeploy, and re-check. The site is plain static files, so
nothing else changes.

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
