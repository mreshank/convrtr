import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the audio cut is sample-exact, and that the samples kept are
 * untouched.
 *
 * The fixture is a frequency sweep, not a steady tone, and that matters. The
 * first version used 440Hz and 660Hz, which both complete a whole number of
 * cycles every 0.5s — so the file was exactly periodic, the first 1.5 seconds
 * were byte-identical to the last 1.5 seconds, and `indexOf` matched at 0 as
 * readily as at the true offset. The test failed while the trimmer was
 * correct. A sweep makes every window unique, so the offset it finds is the
 * offset the cut actually used.
 *
 * This is a stronger claim than the video trim can make, and the test says so
 * by checking a stronger property: the trimmed PCM must appear *verbatim* at
 * the expected offset inside the source's PCM. Not merely the right duration —
 * the same bytes, starting exactly where they were asked for.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(
	!ffmpegAvailable(),
	"needs ffmpeg for an independent sample comparison",
);

function rawPcm(path: string, destination: string): Buffer {
	execFileSync(
		"ffmpeg",
		["-y", "-i", path, "-f", "s16le", "-acodec", "pcm_s16le", destination],
		{ stdio: "ignore" },
	);
	return readFileSync(destination);
}

test("trims WAV exactly on the sample, keeping those samples untouched", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-atrim-"));

	await page.goto("/audio/trim-wav");
	await expect(
		page.getByRole("heading", { name: "Trim a WAV file" }),
	).toBeVisible();
	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.wav");

	await page.getByRole("button", { name: /ADVANCED/i }).click();
	const startHandle = page.getByRole("slider", { name: /start/i });
	// A usable maximum proves the duration probe resolved before the cut.
	await expect(startHandle).toHaveAttribute("max", /^[1-9]/, {
		timeout: 30_000,
	});

	// Half a second in — no keyframes to snap to, so this should land exactly.
	await startHandle.fill("0.5");
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	// The claim is made in the UI too, not only in the bytes.
	await expect(page.getByTestId("notices")).toContainText(
		/exactly where you asked/i,
	);

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "trimmed.wav");
	await (await downloadPromise).saveAs(output);

	const source = rawPcm("e2e/fixtures/sample.wav", join(work, "src.pcm"));
	const trimmed = rawPcm(output, join(work, "cut.pcm"));

	expect(
		trimmed.length,
		"the trimmed audio must be shorter than the source",
	).toBeLessThan(source.length);
	expect(trimmed.length).toBeGreaterThan(1000);

	// 0.5s at 44100Hz, stereo, 16-bit = 0.5 * 44100 * 2 * 2 bytes.
	const expectedOffset = Math.round(0.5 * 44100) * 2 * 2;
	const found = source.indexOf(trimmed);

	expect(
		found,
		`the trimmed samples must appear verbatim in the source; expected them at byte ${expectedOffset}`,
	).toBeGreaterThanOrEqual(0);
	expect(
		found,
		"the cut must land on the requested sample, not merely near it",
	).toBe(expectedOffset);
});

test("trims FLAC exactly, and re-encoding costs nothing", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-ftrim-"));

	// Build a FLAC from the same source so the comparison is against known audio.
	const flacSource = join(work, "source.flac");
	execFileSync(
		"ffmpeg",
		["-y", "-i", "e2e/fixtures/sample.wav", "-c:a", "flac", flacSource],
		{ stdio: "ignore" },
	);

	await page.goto("/audio/trim-flac");
	await page.setInputFiles("input[type=file]", flacSource);
	await page.getByRole("button", { name: /ADVANCED/i }).click();
	const startHandle = page.getByRole("slider", { name: /start/i });
	await expect(startHandle).toHaveAttribute("max", /^[1-9]/, {
		timeout: 30_000,
	});
	await startHandle.fill("0.5");
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "trimmed.flac");
	await (await downloadPromise).saveAs(output);

	// Still FLAC, and its decoded samples appear verbatim in the source's —
	// which is what makes "decoded and re-encoded, at no cost" a true statement.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name",
		"-of",
		"csv=p=0",
		output,
	])
		.toString()
		.trim();
	expect(probed).toContain("flac");

	const source = rawPcm(flacSource, join(work, "src.pcm"));
	const trimmed = rawPcm(output, join(work, "cut.pcm"));
	const expectedOffset = Math.round(0.5 * 44100) * 2 * 2;

	expect(
		source.indexOf(trimmed),
		"a FLAC round trip through the trimmer must not alter a single sample",
	).toBe(expectedOffset);
});
