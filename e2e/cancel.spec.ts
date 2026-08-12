import { expect, test } from "@playwright/test";

test("cancelling a conversion leaves the file loaded and ready to re-run, with no error shown", async ({
	page,
	context,
}) => {
	await page.goto("/image/png-to-webp");
	await page.setInputFiles("input[type=file]", "e2e/fixtures/diagram.png");

	// Throttle the renderer so a CANCEL click lands mid-flight rather than
	// racing completion.
	//
	// Note on what this actually does: setCPUThrottlingRate suspends the
	// renderer's MAIN thread. The WASM decode/encode runs on a dedicated
	// Worker thread and is NOT throttled. What the throttle buys is a slower
	// main thread on both sides of the race — it delays React processing the
	// worker's `done` message as well as delaying our own click round-trip.
	// Do not "fix" flakiness here by raising the rate expecting the codec to
	// slow down; it will not.
	const client = await context.newCDPSession(page);
	await client.send("Emulation.setCPUThrottlingRate", { rate: 40 });

	await page.getByRole("button", { name: "CONVERT" }).click();
	await page.getByRole("button", { name: "CANCEL" }).click();

	await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

	// The cancel must actually have cancelled something. Without this the test
	// passes vacuously if the job settles in the gap between Playwright's
	// actionability check and the mouse dispatch: abort() on a settled promise
	// is a no-op, the result renders, and every assertion below still holds.
	await expect(page.getByTestId("result")).toHaveCount(0);

	// (a) no error text is shown — cancellation is not an error.
	await expect(page.getByTestId("error")).toHaveCount(0);

	// (b) the file is still loaded.
	await expect(page.getByText("diagram.png")).toBeVisible();

	// (c) CONVERT is clickable again.
	const convertButton = page.getByRole("button", { name: "CONVERT" });
	await expect(convertButton).toBeVisible();
	await expect(convertButton).toBeEnabled();

	// Prove "clickable again" is not just a state claim: re-running the
	// conversion to completion must still work after a cancel.
	await convertButton.click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 60_000 });
	await expect(page.getByTestId("error")).toHaveCount(0);
});
