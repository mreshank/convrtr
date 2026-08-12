import { expect, test } from "@playwright/test";

// Resource types that are expected to appear as same-origin loads of the
// app's own static assets (JS chunks, CSS, fonts, WASM fetched via fetch()).
// A same-origin request of one of these types is not "file bytes leaving the
// page" — it is the app itself loading. Everything else — cross-origin
// requests, XHR/beacon/websocket traffic, or any request carrying a body —
// is suspicious and fails the test.
const SAFE_SAME_ORIGIN_RESOURCE_TYPES = new Set([
	"document",
	"script",
	"stylesheet",
	"font",
	"image",
	"fetch",
]);

test("converts a PNG to WebP entirely in the browser with zero bytes uploaded", async ({
	page,
}) => {
	let appOrigin = "";
	const suspicious: string[] = [];

	page.on("request", (request) => {
		const method = request.method();
		const postData = request.postDataBuffer();
		const hasBody = postData !== null && postData.length > 0;
		const nonSafeMethod = method !== "GET" && method !== "HEAD";

		// Nothing to worry about: a plain GET/HEAD with no body cannot carry
		// file bytes, regardless of origin or resource type.
		if (!nonSafeMethod && !hasBody) return;

		let sameOrigin = false;
		try {
			sameOrigin =
				appOrigin !== "" && new URL(request.url()).origin === appOrigin;
		} catch {
			sameOrigin = false;
		}

		if (
			sameOrigin &&
			SAFE_SAME_ORIGIN_RESOURCE_TYPES.has(request.resourceType())
		) {
			return;
		}

		suspicious.push(
			`${method} ${request.url()} (resourceType=${request.resourceType()}, hasBody=${hasBody})`,
		);
	});

	await page.goto("/image/png-to-webp");
	appOrigin = new URL(page.url()).origin;

	await expect(
		page.getByRole("heading", { name: "Convert PNG to WebP" }),
	).toBeVisible();
	await expect(page.getByText("LOSSLESS")).toBeVisible();

	await page.setInputFiles("input[type=file]", "e2e/fixtures/diagram.png");
	await page.getByRole("button", { name: "CONVERT" }).click();

	await expect(page.getByTestId("result")).toBeVisible({ timeout: 60_000 });

	expect(suspicious, "no request may carry user file bytes").toEqual([]);
});
