import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

/**
 * Proves the progress readout says what the converter is actually doing.
 *
 * mediabunny re-encodes whenever the target container cannot carry the source
 * codec — H.264 into WebM, for instance — regardless of `forceTranscode:
 * false`, and it does not expose that decision. So a label derived from the
 * flag alone reads "COPY" while every frame is being re-encoded. For a product
 * whose entire claim is that it tells you when you are losing quality, a
 * progress readout that lies is worse than no readout.
 *
 * Phases are captured with a MutationObserver rather than polled, because
 * polling the DOM races a conversion that finishes in under a second and would
 * pass by simply never looking at the right moment.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to build an MP4 fixture");

/** Records every phase the readout displays, so none is missed. */
async function recordPhases(page: Page): Promise<void> {
	await page.evaluate(() => {
		const seen: string[] = [];
		(window as unknown as { __phases: string[] }).__phases = seen;

		const observer = new MutationObserver(() => {
			const node = document.querySelector('[data-testid="progress-readout"]');
			const text = node?.textContent ?? "";
			if (text && seen[seen.length - 1] !== text) seen.push(text);
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			characterData: true,
		});
	});
}

function phasesSeen(page: Page): Promise<string[]> {
	return page.evaluate(
		() => (window as unknown as { __phases: string[] }).__phases,
	);
}

test("a conversion that must re-encode never claims to be copying", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-phase-"));
	// H.264 + AAC in MP4. Neither codec is legal in WebM, so mediabunny has no
	// choice but to re-encode both streams.
	const fixture = join(work, "sample.mp4");
	execFileSync(
		"ffmpeg",
		["-y", "-i", "e2e/fixtures/sample.mkv", "-c", "copy", fixture],
		{ stdio: "ignore" },
	);

	await page.goto("/video/mp4-to-webm");
	await page.setInputFiles("input[type=file]", fixture);
	await recordPhases(page);
	await page.getByRole("button", { name: /^CONVERT/ }).click();

	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	const phases = await phasesSeen(page);
	const joined = phases.join(" | ");

	expect(
		joined,
		`the readout must report re-encoding, since H.264/AAC cannot be copied into WebM — saw: ${joined}`,
	).toContain("ENCODE");
	expect(
		joined,
		`the readout must not claim a copy while re-encoding — saw: ${joined}`,
	).not.toContain("COPY");
});

test("a conversion that really copies says so", async ({ page }) => {
	await page.goto("/video/mkv-to-mp4");
	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.mkv");
	await recordPhases(page);
	await page.getByRole("button", { name: /^CONVERT/ }).click();

	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	const phases = await phasesSeen(page);
	const joined = phases.join(" | ");

	// The other half of the claim. Without this, labelling everything "ENCODE"
	// would pass the test above while being just as dishonest in the other
	// direction — and would hide the copy path the whole pack exists for.
	expect(
		joined,
		`H.264/AAC into MP4 is a pure remux and must report copying — saw: ${joined}`,
	).toContain("COPY");
	expect(
		joined,
		`a pure remux must not report re-encoding — saw: ${joined}`,
	).not.toContain("ENCODE");
});

test("the result names the path that was actually taken", async ({ page }) => {
	await page.goto("/video/mkv-to-mp4");
	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.mkv");
	await page.getByRole("button", { name: /^CONVERT/ }).click();

	const result = page.getByTestId("result");
	await expect(result).toBeVisible({ timeout: 180_000 });

	// H.264/AAC into MP4 is a pure remux, and the finished readout should say
	// so — not just the progress bar that has already disappeared by the time
	// anyone reads it.
	await expect(result).toContainText("STREAMS COPIED");
	await expect(result).not.toContainText("RE-ENCODED");
});

test("a conversion the registry expects to re-encode says it re-encoded", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-path-"));
	const fixture = join(work, "sample.mp4");
	execFileSync(
		"ffmpeg",
		["-y", "-i", "e2e/fixtures/sample.mkv", "-c", "copy", fixture],
		{ stdio: "ignore" },
	);

	await page.goto("/video/mp4-to-webm");
	await page.setInputFiles("input[type=file]", fixture);
	await page.getByRole("button", { name: /^CONVERT/ }).click();

	const result = page.getByTestId("result");
	await expect(result).toBeVisible({ timeout: 180_000 });

	// The other direction. Without this, always printing "STREAMS COPIED"
	// would satisfy the test above while being a far more damaging lie than
	// the phase label was.
	await expect(result).toContainText("RE-ENCODED");
	await expect(result).not.toContainText("STREAMS COPIED");
});
