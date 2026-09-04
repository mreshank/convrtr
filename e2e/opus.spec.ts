import { execFileSync } from "node:child_process";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the Opus encode produces real Opus audio, and that nothing is fetched
 * to do it.
 *
 * The second claim is the unusual one. Every other codec in this project ships
 * as a WASM binary; Opus is encoded by the browser itself, so this conversion
 * should download no codec at all. That is worth asserting rather than assuming,
 * because it is the kind of property that quietly stops being true when a
 * dependency is added.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffprobe to inspect the encoded output");

test("encodes real Opus without downloading a codec", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-opus-"));

	// Anything that looks like a codec binary arriving during the conversion.
	const codecFetches: string[] = [];
	page.on("request", (request) => {
		const url = request.url();
		if (/\.wasm($|\?)|libflac|lamejs|ffmpeg/.test(url)) codecFetches.push(url);
	});

	await page.goto("/audio/wav-to-opus");
	await expect(
		page.getByRole("heading", { name: "Convert WAV to Opus" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.wav");
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	// Lossy, and said so — the same standard the MP3 tool is held to.
	await expect(
		page.getByRole("radiogroup", { name: "Quality" }),
	).not.toContainText("Lossless");
	await expect(page.getByTestId("notices")).toContainText(
		/discards audio permanently/i,
	);

	expect(
		codecFetches,
		"Opus is encoded by the browser, so no codec binary should be fetched",
	).toEqual([]);

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "out.ogg");
	await (await downloadPromise).saveAs(output);

	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,channels",
		"-of",
		"default=nw=1",
		output,
	]).toString();
	expect(probed).toContain("codec_name=opus");
	expect(probed).toContain("channels=2");

	// Substantially smaller than the WAV, and the same length — an encoder that
	// dropped blocks would produce a valid, smaller file too.
	expect(statSync(output).size).toBeLessThan(
		statSync("e2e/fixtures/sample.wav").size * 0.4,
	);
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
