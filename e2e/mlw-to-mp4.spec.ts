import { expect, test } from "@playwright/test";
import { watchForSuspiciousRequests } from "./network-guard";

test("extracts MP4 from an MLW file entirely in the browser with zero bytes uploaded", async ({
	page,
	baseURL,
}) => {
	const appOrigin = baseURL ? new URL(baseURL).origin : "";
	const suspicious = watchForSuspiciousRequests(page, () => appOrigin);

	await page.goto("/video/mlw-to-mp4");

	await expect(
		page.getByRole("heading", { name: "Extract MP4 video from an MLW file" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.mlw");
	await page.getByRole("button", { name: "CONVERT" }).click();

	await expect(page.getByTestId("result")).toBeVisible({ timeout: 60_000 });

	expect(suspicious, "no request may carry user file bytes").toEqual([]);
});
