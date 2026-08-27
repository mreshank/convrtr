import { expect, test } from "@playwright/test";
import { watchForSuspiciousRequests } from "./network-guard";

/**
 * Batch conversion has unit coverage for its orchestration, but the units are
 * driven by an injected fake runner — none of it proves that dropping several
 * real files through real WASM actually works, that per-file save is reachable
 * before the batch finishes, or that the privacy guarantee still holds when
 * multiple workers run at once.
 *
 * The single-file path is covered by png-to-webp.spec.ts; this covers only
 * what changes when there is more than one file.
 */
test("converts several files at once and offers each one for saving", async ({
	page,
	baseURL,
}) => {
	// The guard takes a getter rather than a value so the origin is read at
	// request time — requests fired during initial navigation would otherwise
	// be evaluated against an empty origin and wrongly pass as same-origin.
	const appOrigin = baseURL ?? "";
	const suspicious = watchForSuspiciousRequests(page, () => appOrigin);

	await page.goto("/image/png-to-webp");
	await expect(
		page.getByRole("heading", { name: "Convert PNG to WebP" }),
	).toBeVisible();

	// Three copies of the same fixture: enough to exercise the pool and the
	// per-row table without making the test slow.
	await page.setInputFiles("input[type=file]", [
		"e2e/fixtures/diagram.png",
		"e2e/fixtures/diagram.png",
		"e2e/fixtures/diagram.png",
	]);

	// More than one file must render the batch table, not the single-file view.
	const rows = page.getByRole("row");
	await expect(rows.first()).toBeVisible({ timeout: 15_000 });

	await page.getByRole("button", { name: /CONVERT/ }).click();

	// Every file must reach a terminal state. One failing must not stall the
	// others, which is the property the pool exists to guarantee.
	await expect(page.getByText(/DONE/i).first()).toBeVisible({
		timeout: 90_000,
	});

	// Save-all is the batch's primary action and must become available.
	await expect(page.getByRole("button", { name: /SAVE ALL/i })).toBeVisible({
		timeout: 90_000,
	});

	// The promise still holds with several workers running concurrently — a
	// per-file upload would be just as fatal as a single one.
	expect(suspicious, "no request may carry user file bytes").toEqual([]);
});

test("a batch keeps the files loaded after cancelling", async ({
	page,
	context,
}) => {
	await page.goto("/image/png-to-webp");
	await page.setInputFiles("input[type=file]", [
		"e2e/fixtures/diagram.png",
		"e2e/fixtures/diagram.png",
	]);

	const client = await context.newCDPSession(page);
	// Throttling the main thread widens the window for the click to land while
	// work is still in flight; the codecs run on worker threads and are not
	// slowed by this (see cancel.spec.ts).
	await client.send("Emulation.setCPUThrottlingRate", { rate: 40 });

	await page.getByRole("button", { name: /CONVERT/ }).click();
	await page.getByRole("button", { name: /CANCEL/ }).click();
	await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

	// Cancelling must not discard the user's input — the files stay listed and
	// the batch is re-runnable, matching the single-file behaviour.
	await expect(page.getByText("diagram.png").first()).toBeVisible();
	await expect(page.getByTestId("error")).toHaveCount(0);
	await expect(page.getByRole("button", { name: /CONVERT/ })).toBeEnabled();
});
