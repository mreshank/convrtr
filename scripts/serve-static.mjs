#!/usr/bin/env node

// A minimal static file server for `out/`, the `output: "export"` artifact
// that actually ships. Playwright's dev-server webServer never exercised
// this artifact or the cross-origin isolation headers `vercel.json` applies
// in production — this script serves the real thing so e2e does too.

import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = join(here, "..", "out");
const port = Number(process.env.PORT ?? 4173);

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".ico": "image/x-icon",
	".wasm": "application/wasm",
	".woff2": "font/woff2",
	".txt": "text/plain; charset=utf-8",
	".map": "application/json",
};

// Mirrors vercel.json exactly, so e2e runs under the same cross-origin
// isolation posture the production build ships with.
const ISOLATION_HEADERS = {
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Embedder-Policy": "credentialless",
};

async function fileIfExists(path) {
	try {
		const info = await stat(path);
		return info.isFile() ? path : null;
	} catch {
		return null;
	}
}

async function resolveFile(requestUrl) {
	const decoded = decodeURIComponent(requestUrl.split("?")[0] ?? "/");
	const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
	const relative = normalized.replace(/^[/\\]+/, "");

	const candidates =
		relative === ""
			? ["index.html"]
			: [relative, `${relative}.html`, join(relative, "index.html")];

	for (const candidate of candidates) {
		const full = join(outDir, candidate);
		if (!full.startsWith(outDir)) continue;
		const found = await fileIfExists(full);
		if (found) return found;
	}
	return null;
}

const server = createServer(async (req, res) => {
	for (const [key, value] of Object.entries(ISOLATION_HEADERS)) {
		res.setHeader(key, value);
	}

	const file = await resolveFile(req.url ?? "/");
	if (!file) {
		const notFound = await fileIfExists(join(outDir, "404.html"));
		const body = notFound ? await readFile(notFound) : "Not found";
		res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
		res.end(body);
		return;
	}

	const body = await readFile(file);
	res.writeHead(200, {
		"Content-Type": MIME_TYPES[extname(file)] ?? "application/octet-stream",
	});
	res.end(body);
});

server.listen(port, () => {
	console.log(`serving out/ at http://localhost:${port}`);
});
