"use client";

import { useEffect } from "react";

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

	return null;
}
