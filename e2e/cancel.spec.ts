import { expect, test } from "@playwright/test";

test("cancelling a conversion leaves the file loaded and ready to re-run, with no error shown", async ({
	page,
	context,
}) => {
	await page.goto("/image/png-to-webp");
	await page.setInputFiles("input[type=file]", "e2e/fixtures/diagram.png");

	// CPU-throttle the page so the WASM decode/encode work is slow enough to
	// reliably land a CANCEL click mid-flight, instead of racing completion.
	// This is reset once CANCEL has been clicked; nothing after that point
	// depends on throttled execution.
	const client = await context.newCDPSession(page);
	await client.send("Emulation.setCPUThrottlingRate", { rate: 40 });

	await page.getByRole("button", { name: "CONVERT" }).click();
	await page.getByRole("button", { name: "CANCEL" }).click();

	await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

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
