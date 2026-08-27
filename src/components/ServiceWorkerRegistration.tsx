"use client";

import { useEffect } from "react";
import { clearScratch } from "@/core/io/opfs";

/**
 * Registers the generated service worker (out/sw.js, produced by
 * scripts/generate-sw.mjs after `next build`) so the app shell and, once
 * used, the WASM codecs keep working with no network at all.
 *
 * Production-only: a service worker caching a dev build — where chunk
 * hashes and content change on every edit — is a debugging nightmare, so
 * registration is skipped whenever NODE_ENV isn't "production".
 *
 * Registration failure is swallowed on purpose. Every conversion already
 * runs fully client-side without a service worker; offline support is
 * strictly additive, so a blocked or unsupported registration (private
 * browsing, a restrictive extension, an older browser) must never surface
 * as an error the user sees.
 */
export function ServiceWorkerRegistration() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
			return;
		}

		navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
			// Silently ignored — see the class comment above.
		});
	}, []);

	// Sweep OPFS scratch files left by a previous session.
	//
	// Conversions delete their own scratch files when they finish, but a tab
	// that is force quit, crashes, or is closed mid-conversion never runs that
	// cleanup. Without a sweep those files accumulate against the origin's
	// storage quota until writes start failing — a failure the user cannot
	// diagnose and would have no way to clear.
	//
	// Runs on every load rather than only in production: leaked scratch files
	// are just as real in development, and the sweep is cheap when there is
	// nothing to remove.
	useEffect(() => {
		void clearScratch().catch(() => {
			// OPFS unavailable or blocked. Nothing was written, so nothing to
			// clean, and this must never surface to the user.
		});
	}, []);

	return null;
}
