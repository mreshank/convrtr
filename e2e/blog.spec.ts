import { expect, test } from "@playwright/test";
import { watchForSuspiciousRequests } from "./network-guard";

test("blog index lists posts and each post links back to its tool", async ({
	page,
	baseURL,
}) => {
	const appOrigin = baseURL ? new URL(baseURL).origin : "";
	const suspicious = watchForSuspiciousRequests(page, () => appOrigin);

	await page.goto("/blog");
	await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "How MLW Video Encryption Actually Works" }),
	).toBeVisible();

	await page
		.getByRole("link", { name: "How MLW Video Encryption Actually Works" })
		.click();
	await expect(page).toHaveURL(/\/blog\/how-mlw-encryption-works$/);
	await expect(
		page.getByRole("heading", {
			name: "How MLW Video Encryption Actually Works",
		}),
	).toBeVisible();

	await page
		.getByRole("link", { name: "Extract MP4 video from an MLW file" })
		.click();
	await expect(page).toHaveURL(/\/video\/mlw-to-mp4$/);

	expect(suspicious, "no request may carry user file bytes").toEqual([]);
});

test("the MLW tool page surfaces its related reading", async ({ page }) => {
	await page.goto("/video/mlw-to-mp4");
	await expect(
		page.getByRole("heading", { name: "Related reading" }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "How MLW Video Encryption Actually Works" }),
	).toBeVisible();
});
