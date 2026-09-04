import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the audio pack's central claim: WAV to FLAC and back returns the
 * identical samples.
 *
 * "Lossless" is the most abused word in audio conversion — it is routinely
 * applied to encodes that are merely transparent to the ear. This test takes
 * the strict meaning: the decoded samples must match bit for bit, verified by
 * ffmpeg comparing raw PCM, a tool that took no part in either conversion.
 *
 * The round trip runs through the real UI both ways, so it covers the WAV
 * parser, the FLAC encoder, the decoder and the WAV writer together — any one
 * of them altering a sample fails the comparison.
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

/** Raw signed 16-bit PCM, stripped of any container framing. */
function rawPcm(path: string, destination: string): Buffer {
	execFileSync(
		"ffmpeg",
		["-y", "-i", path, "-f", "s16le", "-acodec", "pcm_s16le", destination],
		{ stdio: "ignore" },
	);
	return execFileSync("cat", [destination]);
}

async function convertThroughUi(
	page: import("@playwright/test").Page,
	toolPath: string,
	inputFile: string,
	outputPath: string,
): Promise<void> {
	await page.goto(toolPath);
	await page.setInputFiles("input[type=file]", inputFile);
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	await (await downloadPromise).saveAs(outputPath);
}

test("WAV to FLAC and back returns identical samples", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-flac-"));
	const source = "e2e/fixtures/sample.wav";

	const flacPath = join(work, "encoded.flac");
	await convertThroughUi(page, "/audio/wav-to-flac", source, flacPath);

	// It must actually be a FLAC, and meaningfully smaller — an encoder that
	// wrote the input straight through would pass a sample comparison.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name",
		"-of",
		"csv=p=0",
		flacPath,
	])
		.toString()
		.trim();
	expect(probed).toContain("flac");

	const originalSize = execFileSync("stat", ["-f%z", source]).toString().trim();
	const flacSize = execFileSync("stat", ["-f%z", flacPath]).toString().trim();
	expect(
		Number(flacSize),
		"FLAC should be materially smaller than the WAV it came from",
	).toBeLessThan(Number(originalSize) * 0.9);

	const wavPath = join(work, "decoded.wav");
	await convertThroughUi(page, "/audio/flac-to-wav", flacPath, wavPath);

	// The claim, checked strictly: every sample identical.
	const before = rawPcm(source, join(work, "before.pcm"));
	const after = rawPcm(wavPath, join(work, "after.pcm"));

	expect(
		after.length,
		"the decoded audio must have the same number of samples as the original",
	).toBe(before.length);
	expect(
		before.equals(after),
		"every PCM sample must survive WAV -> FLAC -> WAV unchanged; this is what 'lossless' has to mean",
	).toBe(true);
});
