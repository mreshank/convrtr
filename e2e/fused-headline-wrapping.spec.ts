import { expect, test } from "@playwright/test";

test.describe("FusedHeadline wrapping guard", () => {
	test("clauses never break exactly at their boundary", async ({ page }) => {
		const viewports = [
			{ width: 1280, height: 720 },
			{ width: 900, height: 720 },
			{ width: 600, height: 720 },
			{ width: 375, height: 667 },
		];

		for (const viewport of viewports) {
			await page.setViewportSize(viewport);
			await page.goto("/");

			const h1 = page.locator("h1");
			await expect(h1).toBeVisible();

			const spans = h1.locator("span");
			const spanCount = await spans.count();
			expect(spanCount).toBe(2);

			// Use getClientRects to measure individual line boxes, not the bounding
			// box union. The lead's last rect and continuation's first rect must sit
			// on the same line box — their tops must be equal (within rounding).
			// If they break at the clause boundary, the continuation's first rect top
			// will differ from the lead's last rect top by approximately line-height.
			const leadRects = await spans.nth(0).evaluate((el) =>
				Array.from(el.getClientRects()).map((r) => ({
					top: r.top,
					bottom: r.bottom,
					left: r.left,
					right: r.right,
				})),
			);

			const contRects = await spans.nth(1).evaluate((el) =>
				Array.from(el.getClientRects()).map((r) => ({
					top: r.top,
					bottom: r.bottom,
					left: r.left,
					right: r.right,
				})),
			);

			const leadLastRectTop = leadRects[leadRects.length - 1]?.top ?? 0;
			const contFirstRectTop = contRects[0]?.top ?? 0;

			// The lead's last line and continuation's first line must share the
			// same line box (tops equal within 1px rounding tolerance).
			const topDiff = Math.abs(leadLastRectTop - contFirstRectTop);
			expect(topDiff).toBeLessThanOrEqual(1);

			console.log(
				`\n${viewport.width}px: lead-last top ${leadLastRectTop}, cont-first top ${contFirstRectTop} (diff: ${topDiff})`,
			);
		}
	});
});
