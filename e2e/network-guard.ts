import type { Page, Request } from "@playwright/test";

/**
 * Resource types that are expected to appear as same-origin loads of the
 * app's own static assets (JS chunks, CSS, fonts, WASM fetched via fetch()).
 * A same-origin request of one of these types is not "file bytes leaving the
 * page" — it is the app itself loading.
 *
 * "other" is included deliberately: the conversion pipeline dynamically
 * imports its engine and codec modules from inside a dedicated Worker
 * (`core/pipeline/worker.ts`), and Chromium reports those Worker-initiated
 * same-origin chunk loads as resourceType "other" rather than "script".
 * This is safe to allow here specifically because, by the time this list is
 * consulted, the request has already been proven same-origin with a GET/HEAD
 * method and no body (see `isSuspiciousRequest`) — a request in that shape
 * cannot carry file bytes regardless of how the browser happens to label it.
 */
export const SAFE_SAME_ORIGIN_RESOURCE_TYPES = new Set([
	"document",
	"script",
	"stylesheet",
	"font",
	"image",
	"fetch",
	"other",
]);

/**
 * Decides whether a request could plausibly be carrying user file bytes off
 * the device.
 *
 * The order of these checks matters:
 *
 * 1. Any cross-origin request is suspicious, full stop, regardless of
 *    method or body. This is what actually catches a `<img
 *    src="https://evil.example/…">` beacon, a cross-origin WebSocket
 *    handshake, or any other GET-shaped exfiltration path — none of which
 *    carry a request body for a body check to catch.
 * 2. Only once a request is known to be same-origin do method/body/resource
 *    type get to exempt it: a same-origin GET/HEAD of one of the app's own
 *    static resource types is the app loading itself, not a leak.
 * 3. Everything else same-origin — any non-GET/HEAD method, or any request
 *    carrying a body — is still suspicious, since the pipeline never needs
 *    to send file bytes anywhere, including to itself.
 */
export function isSuspiciousRequest(
	request: Request,
	appOrigin: string,
): boolean {
	let sameOrigin = false;
	try {
		sameOrigin =
			appOrigin !== "" && new URL(request.url()).origin === appOrigin;
	} catch {
		sameOrigin = false;
	}

	if (!sameOrigin) return true;

	const method = request.method();
	const postData = request.postDataBuffer();
	const hasBody = postData !== null && postData.length > 0;
	const nonSafeMethod = method !== "GET" && method !== "HEAD";

	if (nonSafeMethod || hasBody) return true;

	return !SAFE_SAME_ORIGIN_RESOURCE_TYPES.has(request.resourceType());
}

export function describeRequest(request: Request): string {
	const method = request.method();
	const postData = request.postDataBuffer();
	const hasBody = postData !== null && postData.length > 0;
	return `${method} ${request.url()} (resourceType=${request.resourceType()}, hasBody=${hasBody})`;
}

/**
 * Attaches a listener that records every suspicious request seen on `page`.
 * `getAppOrigin` is a thunk rather than a plain string so the caller can set
 * up the listener before navigation (when the origin may not be known yet)
 * and have it resolve to the right value once it is.
 */
export function watchForSuspiciousRequests(
	page: Page,
	getAppOrigin: () => string,
): string[] {
	const suspicious: string[] = [];
	page.on("request", (request) => {
		if (isSuspiciousRequest(request, getAppOrigin())) {
			suspicious.push(describeRequest(request));
		}
	});
	return suspicious;
}
