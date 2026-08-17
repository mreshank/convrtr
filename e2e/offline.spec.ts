import { expect, type Page, test } from "@playwright/test";

/**
 * convrtr has no server: every conversion already runs client-side. What
 * this file proves is the harder claim in the brief — that once the app
 * shell and a tool's WASM codecs have been fetched once, the *entire*
 * pipeline keeps working with the network cut off completely, not just
 * that the HTML happens to be cached.
 *
 * The flow mirrors how a real visitor gets there: load a tool, let it
 * finish one conversion online (which is also the moment the service
 * worker's runtime cache picks up the WASM codec — see
 * scripts/generate-sw.mjs), then go offline and do it again.
 */

async function waitForServiceWorkerReady(page: Page) {
	await page.evaluate(() => navigator.serviceWorker.ready);
}

/** True once some CacheStorage entry (any cache, any key) is a .wasm URL —
 * i.e. the runtime-cache-on-first-use path in the generated service worker
 * actually fired, not just that the worker registered. */
async function wasmIsRuntimeCached(page: Page) {
	return page.evaluate(async () => {
		const cacheNames = await caches.keys();
		for (const name of cacheNames) {
			const cache = await caches.open(name);
			const keys = await cache.keys();
			if (keys.some((request) => request.url.endsWith(".wasm"))) return true;
		}
		return false;
	});
}

test("converts offline after the WASM codec has been cached once online", async ({
	page,
	context,
}) => {
	await page.goto("/image/png-to-webp");
	await expect(
		page.getByRole("heading", { name: "Convert PNG to WebP" }),
	).toBeVisible();

	// Let the service worker install and precache the app shell before doing
	// anything else — this is the "let the worker install and cache" step.
	await waitForServiceWorkerReady(page);

	// One online conversion: this is what actually populates the runtime
	// cache with the PNG decode + WebP encode WASM modules. Without this
	// step, the very first conversion attempt would itself need the
	// network, which is exactly the case the brief says not to paper over.
	await page.setInputFiles("input[type=file]", "e2e/fixtures/diagram.png");
	await page.getByRole("button", { name: "CONVERT" }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 60_000 });

	expect(
		await wasmIsRuntimeCached(page),
		"the WASM codec must be in CacheStorage after a real conversion, proving the runtime-cache-on-first-use path fired",
	).toBe(true);

	await context.setOffline(true);
	try {
		// Reload with no network at all: the navigation request itself must
		// be served from the precached shell.
		await page.reload();
		await expect(
			page.getByRole("heading", { name: "Convert PNG to WebP" }),
		).toBeVisible();

		// The file input is a fresh DOM node after reload, so the file has
		// to be re-selected — this is not reusing any in-memory state from
		// the online run, only what the service worker has on disk.
		await page.setInputFiles("input[type=file]", "e2e/fixtures/diagram.png");
		await page.getByRole("button", { name: "CONVERT" }).click();

		// This is the real claim: decode, resize/recolor pipeline, and encode
		// all running inside a Worker whose own WASM fetches are being
		// answered by the service worker's cache, with the browser's network
		// stack fully disabled.
		await expect(page.getByTestId("result")).toBeVisible({ timeout: 60_000 });
	} finally {
		await context.setOffline(false);
	}
});
