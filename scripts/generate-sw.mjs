#!/usr/bin/env node

// Generates out/sw.js after `next build`, wired in via the "build" script in
// package.json ("next build && node scripts/generate-sw.mjs"). This has to
// run after the build, not before, because the precache list below is built
// by walking the actual `out/` directory: Next.js content-hashes its JS/CSS
// chunks, so a hand-written list of filenames would go stale on the very
// next build that changes any source file.
//
// Caching strategy (see the report in
// .superpowers/sdd/2026-08-07-spine-vertical-slice/w1-pwa-report.md for the
// full rationale):
//   - HTML/JS/CSS/fonts/icons/RSC flight payloads: precached at install, so
//     the whole app shell — every route — works offline from the first
//     visit, not just the page the user happened to load.
//   - WASM codec binaries (*.wasm): deliberately left OUT of the precache
//     list and instead runtime-cached cache-first on first fetch, from
//     inside the service worker's fetch handler. These are the expensive
//     artefacts (hundreds of KB each); a tool that is never opened should
//     never pay for its codec.
//   - The dedicated-worker bootstrap script (the file `new Worker(new
//     URL("./worker.ts", import.meta.url))` in src/core/pipeline/client.ts
//     actually resolves to) gets its own network-first-then-cache handling,
//     keyed off `request.destination === "worker"` rather than a filename.
//     Turbopack passes that worker its chunk manifest by encoding JSON into
//     a URL *fragment* (`...#params=<encoded>`), which the worker reads
//     back via `self.location.hash` once it starts. A response served from
//     a cache that was populated by plain-string precaching (`cache.addAll`
//     given a bare path, as the rest of the shell is) never carries that
//     fragment — the browser only reattaches it to a response that came
//     from fetching the *exact* fragment-bearing request, whether that
//     fetch happened just now or was `cache.put` under that same request
//     earlier. Precache it normally and every conversion fails immediately
//     with "Missing worker bootstrap config", online or off — this cost an
//     entire debugging pass to track down, see the report for the full
//     chain of evidence. Detecting by `destination` instead of filename
//     also means this keeps working if Turbopack ever renames the chunk.
//   - Cache names are suffixed with the Next.js build ID (the hashed folder
//     under out/_next/static/), which changes on every build. `activate`
//     deletes any cache whose name isn't one of the two current ones, so a
//     new deploy can't strand a visitor on old chunks — the classic
//     service-worker footgun this guards against.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = join(here, "..", "out");

// Excluded from the precache (see module comment): WASM binaries are
// runtime-cached on first use instead. Source maps aren't shipped to users
// at all. The lone `worker.<hash>.ts` file Turbopack emits alongside the
// compiled worker bootstrap chunk is dev-tooling metadata (a chunk-id-to-
// source-path record) — the actual worker script executed at runtime is a
// compiled `.js` chunk, so this raw TypeScript file is never fetched and
// would not even be valid JavaScript if it were.
const EXCLUDED_EXTENSIONS = new Set([".wasm", ".map", ".ts"]);

// Directories never precached, whatever they contain.
const EXCLUDED_PREFIXES = ["ffmpeg/"];

async function main() {
	const buildId = await readBuildId();
	const precacheUrls = await collectPrecacheUrls();

	const shellCache = `convrtr-shell-${buildId}`;
	const runtimeCache = `convrtr-runtime-${buildId}`;
	const workerScriptCache = `convrtr-worker-script-${buildId}`;

	const source = renderServiceWorker({
		shellCache,
		runtimeCache,
		workerScriptCache,
		precacheUrls,
	});

	await mkdir(outDir, { recursive: true });
	await writeFile(join(outDir, "sw.js"), source);
	console.log(
		`wrote out/sw.js — ${precacheUrls.length} precached URLs, caches "${shellCache}" / "${runtimeCache}" / "${workerScriptCache}"`,
	);
}

/**
 * Next's static export writes hashed chunks under out/_next/static/chunks
 * and out/_next/static/media, plus exactly one build-id-named directory
 * (e.g. out/_next/static/0mcKl2dkgLGf_IQ--8gJb/) holding the build and SSG
 * manifests. That directory name already changes on every build, which
 * makes it a ready-made cache-busting version key — no separate version
 * number to remember to bump.
 */
async function readBuildId() {
	// Read Next's own BUILD_ID rather than inferring it from directory names.
	//
	// The previous approach scanned out/_next/static for "the directory that
	// isn't chunks or media". That is a denylist, and it broke the moment the
	// build emitted a `css/` directory: `css` sorted first, so every cache was
	// named `convrtr-shell-css` and stayed that way across deploys. Since the
	// activate handler only deletes caches outside the current set, constant
	// names mean stale caches are NEVER purged — ship a fix and users keep the
	// old app indefinitely. A denylist of known-bad names cannot survive the
	// build tool adding a new one.
	const buildIdFile = join(process.cwd(), ".next", "BUILD_ID");
	const buildId = (await readFile(buildIdFile, "utf8")).trim();

	if (!buildId) {
		throw new Error(`generate-sw: ${buildIdFile} is empty`);
	}

	// Cross-check that the id actually names a directory in the export. If it
	// does not, the two have diverged and the cache key would not track the
	// deployed assets — better to fail the build than to ship a service worker
	// that silently never updates.
	const staticDir = join(outDir, "_next", "static");
	const entries = await readdir(staticDir, { withFileTypes: true });
	const present = entries.some(
		(entry) => entry.isDirectory() && entry.name === buildId,
	);
	if (!present) {
		throw new Error(
			`generate-sw: BUILD_ID "${buildId}" has no matching directory under ${staticDir} — did \`next build\` run first?`,
		);
	}

	return buildId;
}

async function collectPrecacheUrls() {
	const files = await walk(outDir);
	const urls = [];
	for (const absolutePath of files) {
		const relativePath = relative(outDir, absolutePath).split(sep).join("/");
		const ext = extname(relativePath);
		if (EXCLUDED_EXTENSIONS.has(ext)) continue;
		// The ffmpeg.wasm core, whole directory. Its .wasm is already excluded
		// by extension, but its 109KB loader is a .js and would otherwise be
		// fetched on install by every visitor — including the overwhelming
		// majority who never open a legacy-video tool. This tier is opt-in by
		// design; precaching any part of it would quietly undo that.
		if (EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
			continue;
		}
		urls.push(`/${encodeForRuntime(relativePath)}`);
	}
	urls.sort();
	return urls;
}

/**
 * Writes a path the way the browser will ask for it.
 *
 * App Router chunks live in directories named after the dynamic segments they
 * serve — `app/[category]/[slug]/page-<hash>.js` — and Next builds their URLs
 * by percent-encoding each segment, so the runtime requests
 * `app/%5Bcategory%5D/%5Bslug%5D/page-<hash>.js`. Cache Storage matches by URL
 * string, so a key holding literal brackets is never found by that request.
 *
 * The effect was that every tool page — all of which are served by
 * `[category]/[slug]` — loaded its HTML offline and then failed to fetch its
 * own JavaScript, so React never hydrated and nothing on the page worked. The
 * shell appeared, which is exactly what made it look like offline support was
 * working.
 *
 * Only brackets are encoded, not the whole segment: `encodeURIComponent` would
 * also rewrite the `$` in the RSC payload filenames Next emits
 * (`__next.$d$category.__PAGE__.txt`), which the runtime asks for verbatim —
 * fixing one mismatch by creating another.
 */
function encodeForRuntime(path) {
	return path.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
}

function extname(path) {
	const dot = path.lastIndexOf(".");
	return dot === -1 ? "" : path.slice(dot);
}

async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await walk(full)));
		} else if (entry.isFile()) {
			files.push(full);
		}
	}
	return files;
}

function renderServiceWorker({
	shellCache,
	runtimeCache,
	workerScriptCache,
	precacheUrls,
}) {
	return `// GENERATED FILE — do not hand-edit. Produced by scripts/generate-sw.mjs
// after every \`next build\`. Edit that script, then rebuild, instead.
"use strict";

const SHELL_CACHE = ${JSON.stringify(shellCache)};
const RUNTIME_CACHE = ${JSON.stringify(runtimeCache)};
const WORKER_SCRIPT_CACHE = ${JSON.stringify(workerScriptCache)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, "\t")};

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(SHELL_CACHE);
			await cache.addAll(PRECACHE_URLS);
		})(),
	);
	// Take over immediately: the whole point of precaching is that the very
	// next reload works offline, not the one after that.
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			const current = new Set([SHELL_CACHE, RUNTIME_CACHE, WORKER_SCRIPT_CACHE]);
			await Promise.all(
				keys.filter((key) => !current.has(key)).map((key) => caches.delete(key)),
			);
			await self.clients.claim();
		})(),
	);
});

/**
 * Mirrors scripts/serve-static.mjs's resolveFile, and (per the Next.js
 * static-export docs) the same rule any static host needs for
 * \`trailingSlash: false\` output: a request for the clean URL "/foo" must
 * resolve to the emitted "/foo.html" file, and "/" resolves to
 * "/index.html".
 */
function candidatePathsFor(pathname) {
	const relativePath = pathname.replace(/^\\/+/, "");
	if (relativePath === "") return ["/index.html"];
	return [\`/\${relativePath}\`, \`/\${relativePath}.html\`, \`/\${relativePath}/index.html\`];
}

async function matchShellCache(pathname) {
	const cache = await caches.open(SHELL_CACHE);
	for (const candidate of candidatePathsFor(pathname)) {
		const match = await cache.match(candidate);
		if (match) return match;
	}
	return undefined;
}

/** Cache-first: once a WASM codec has been fetched, it never needs the
 * network again. These are the "expensive artefacts" the brief calls out —
 * hundreds of KB each — so they are deliberately absent from
 * PRECACHE_URLS and only ever enter RUNTIME_CACHE the first time a
 * conversion actually needs them. */
async function cacheFirst(request) {
	const cache = await caches.open(RUNTIME_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) {
		await cache.put(request, response.clone());
	}
	return response;
}

/** Network-first for navigations, falling back to the precached shell only
 * once the network is actually unreachable — an online visitor always sees
 * the current deploy, an offline one still sees a working page. */
async function navigationResponse(request, pathname) {
	try {
		return await fetch(request);
	} catch {
		const cached = await matchShellCache(pathname);
		if (cached) return cached;
		throw new Error(\`convrtr sw: no cached shell for \${pathname}\`);
	}
}

/** Same-origin static assets (JS/CSS/fonts/RSC flight payloads/icons):
 * cache-first against whatever install already precached, but still willing
 * to fetch-and-store anything precaching missed, so a future asset that
 * isn't yet in PRECACHE_URLS degrades to "cached after first load" instead
 * of "never offline". */
async function assetResponse(request) {
	const cache = await caches.open(SHELL_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) {
		await cache.put(request, response.clone());
	}
	return response;
}

/** Network-first, falling back to a *request-keyed* cache entry — never a
 * plain-string precache entry — for exactly one reason: this is the
 * dedicated-worker bootstrap script, and the worker only starts correctly
 * if the response servicing this fetch can still be traced back to a fetch
 * of this exact fragment-bearing request. See the long comment atop
 * scripts/generate-sw.mjs for why. Once fetched successfully, the response
 * is cached under the same request, so the offline fallback below is
 * reattaching the fragment from a *previous real fetch of this same
 * request*, not synthesizing it from nothing. */
async function workerScriptResponse(request) {
	const cache = await caches.open(WORKER_SCRIPT_CACHE);
	try {
		const response = await fetch(request);
		if (response.ok) {
			await cache.put(request, response.clone());
		}
		return response;
	} catch (err) {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw err;
	}
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.destination === "worker" || request.destination === "sharedworker") {
		event.respondWith(workerScriptResponse(request));
		return;
	}

	if (url.pathname.endsWith(".wasm")) {
		event.respondWith(cacheFirst(request));
		return;
	}

	if (request.mode === "navigate") {
		event.respondWith(navigationResponse(request, url.pathname));
		return;
	}

	event.respondWith(assetResponse(request));
});
`;
}

main();
