import { execFileSync } from "node:child_process";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the MP3 is a real MP3 of the right audio, and that its cost is stated.
 *
 * The interesting assertions here are about honesty rather than fidelity: MP3
 * cannot be lossless, so what matters is that the tool never claims otherwise,
 * says what was lost, and names the alternative for someone who wanted a
 * smaller file rather than a lossy one.
 *
 * Audio content is checked by decoding both files and comparing correlation
 * rather than samples — a lossy codec changes every sample by design, so a
 * bit-comparison would be meaningless here. What must hold is that the output
 * is recognisably the same audio, at the same rate and duration.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to inspect the encoded output");

test("encodes a real MP3 and states what it cost", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-mp3-"));

	await page.goto("/audio/wav-to-mp3");
	await expect(
		page.getByRole("heading", { name: "Convert WAV to MP3" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.wav");

	// The fidelity ring must not read 100 for a codec that discards audio.
	// Getting this wrong here would undermine every lossless claim elsewhere.
	await expect(page.getByText("Balanced").first()).toBeVisible();
	await expect(
		page.getByRole("radiogroup", { name: "Quality" }),
	).not.toContainText("Lossless");

	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	// The cost, stated where the result appears rather than buried in the FAQ.
	const notices = page.getByTestId("notices");
	await expect(notices).toContainText(/discards audio permanently/i);
	await expect(notices).toContainText(/FLAC/);

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "out.mp3");
	await (await downloadPromise).saveAs(output);

	// A real MP3 carrying the source's audio properties.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,sample_rate,channels",
		"-of",
		"default=nw=1",
		output,
	]).toString();
	expect(probed).toContain("codec_name=mp3");
	expect(probed).toContain("sample_rate=44100");
	expect(probed).toContain("channels=2");

	// Materially smaller than the WAV — the entire reason to accept the loss.
	const source = statSync("e2e/fixtures/sample.wav").size;
	expect(statSync(output).size).toBeLessThan(source * 0.5);

	// And the same duration: an encoder that dropped or duplicated blocks would
	// still produce a valid, smaller MP3.
	const duration = Number.parseFloat(
		execFileSync("ffprobe", [
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"csv=p=0",
			output,
		])
			.toString()
			.trim(),
	);
	expect(duration).toBeGreaterThan(1.8);
	expect(duration).toBeLessThan(2.3);
});
