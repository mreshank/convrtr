import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves warnings about a *successful* conversion reach the user.
 *
 * VP9 inside MP4 is spec-legal, so mediabunny copies it and nothing is lost —
 * but many players cannot decode it, and that is invisible from a conversion
 * that reported success. The alternative, re-encoding by default to guarantee
 * playback, trades quality that cannot be recovered for a problem this user
 * may not have. So convrtr copies and says so.
 *
 * Progress phases could not carry this: they are rendered inside the progress
 * bar, which is removed the instant the conversion ends. A warning only
 * visible while someone waits is not a warning.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to build a VP9 fixture");

/** VP9 + Opus: legal in MP4, and widely unplayable there. */
function makeVp9Webm(dir: string): string {
	const path = join(dir, "vp9.webm");
	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-f",
			"lavfi",
			"-i",
			"testsrc=size=320x240:rate=15",
			"-f",
			"lavfi",
			"-i",
			"sine=frequency=440",
			"-t",
			"2",
			"-c:v",
			"libvpx-vp9",
			"-b:v",
			"300k",
			"-deadline",
			"realtime",
			"-cpu-used",
			"8",
			"-c:a",
			"libopus",
			"-b:a",
			"64k",
			path,
		],
		{ stdio: "ignore" },
	);
	return path;
}

test("copying a badly-supported combination warns, and keeps the quality", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-notice-"));
	const fixture = makeVp9Webm(work);

	await page.goto("/video/webm-to-mp4");
	await page.setInputFiles("input[type=file]", fixture);
	await page.getByRole("button", { name: /^CONVERT/ }).click();

	const result = page.getByTestId("result");
	await expect(result).toBeVisible({ timeout: 180_000 });

	// Lossless: VP9 and Opus are both legal in MP4, so the streams copy.
	await expect(result).toContainText("STREAMS COPIED");

	// And the cost of that choice is stated where it can still be acted on,
	// beside the finished result rather than inside a progress bar that is
	// already gone.
	const notices = page.getByTestId("notices");
	await expect(notices).toBeVisible();
	await expect(notices).toContainText(/many players/i);
	await expect(notices).toContainText(/no quality was lost/i);
});

test("a clean conversion shows no warnings at all", async ({ page }) => {
	await page.goto("/video/mkv-to-mp4");
	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.mkv");
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	// The other half of the claim. A notice panel that always appeared would
	// pass the test above while training people to ignore it — which is worse
	// than not warning at all, because the warning that matters gets lost with
	// the rest.
	await expect(page.getByTestId("notices")).toHaveCount(0);
});
