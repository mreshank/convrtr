import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the normaliser hits the loudness it says it does.
 *
 * The measurement is the whole tool, so the test measures the *output* with
 * ffmpeg's `ebur128` — an independent implementation of the same standard. If
 * convrtr's K-weighting, block gating or gain calculation were wrong, the
 * result would land somewhere other than the target and this would catch it.
 *
 * A test that only checked "the file got louder" would pass for an
 * implementation that used unweighted RMS, or skipped the relative gate, and
 * both are wrong in ways users would never see directly.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg's ebur128 to verify loudness");

/** Integrated loudness in LUFS, read from ffmpeg's R128 summary on stderr. */
function measuredLoudness(path: string): number {
	const out = execSync(
		`ffmpeg -nostats -i "${path}" -filter_complex ebur128 -f null - 2>&1`,
		{ encoding: "utf8" },
	);
	const summary = out.split("Integrated loudness:")[1] ?? "";
	const value = summary.match(/I:\s+(-?\d+(?:\.\d+)?)/)?.[1];
	return Number.parseFloat(value ?? "NaN");
}

async function normaliseThroughUi(
	page: import("@playwright/test").Page,
	input: string,
	output: string,
): Promise<void> {
	await page.goto("/audio/normalise-wav");
	await page.setInputFiles("input[type=file]", input);
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	await (await downloadPromise).saveAs(output);
}

test("brings a quiet file up to the streaming target", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-norm-"));

	// 24dB down, so there is ample headroom and the target is reachable without
	// any clipping — this isolates the measurement from the clipping guard.
	const quiet = join(work, "quiet.wav");
	execSync(
		`ffmpeg -y -i e2e/fixtures/sample.wav -filter:a "volume=-24dB" -c:a pcm_s16le "${quiet}" 2>/dev/null`,
	);
	expect(measuredLoudness(quiet)).toBeLessThan(-28);

	const output = join(work, "normalised.wav");
	await normaliseThroughUi(page, quiet, output);

	// The default preset targets -14 LUFS. Half a unit is well inside what the
	// standard treats as agreement between implementations.
	const result = measuredLoudness(output);
	expect(
		result,
		`expected about -14 LUFS, ffmpeg measured ${result.toFixed(2)}`,
	).toBeGreaterThan(-14.5);
	expect(result).toBeLessThan(-13.5);

	// And it says what it did, with the measured figure rather than a vague
	// claim of success.
	await expect(page.getByTestId("notices")).toContainText(/LUFS/);
});

/**
 * A quiet tone carrying one full-scale sample.
 *
 * The clipping guard only engages when the gain needed exceeds the available
 * headroom, which takes a high crest factor: quiet overall, but peaking. An
 * attenuated sweep cannot produce that — turning it down lowers its loudness
 * and its peaks together, leaving the headroom untouched, which is exactly why
 * the first attempt at this test measured -0.6 LUFS and needed *negative* gain.
 * Written directly rather than filtered, so the property is guaranteed.
 */
function quietWithOnePeak(path: string): void {
	const sampleRate = 44100;
	const frames = sampleRate * 2;
	const channels = 2;
	const dataLength = frames * channels * 2;
	const buffer = Buffer.alloc(44 + dataLength);

	buffer.write("RIFF", 0);
	buffer.writeUInt32LE(36 + dataLength, 4);
	buffer.write("WAVE", 8);
	buffer.write("fmt ", 12);
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20);
	buffer.writeUInt16LE(channels, 22);
	buffer.writeUInt32LE(sampleRate, 24);
	buffer.writeUInt32LE(sampleRate * channels * 2, 28);
	buffer.writeUInt16LE(channels * 2, 32);
	buffer.writeUInt16LE(16, 34);
	buffer.write("data", 36);
	buffer.writeUInt32LE(dataLength, 40);

	for (let frame = 0; frame < frames; frame++) {
		// About -40dBFS: quiet enough to need a lot of gain to reach -14 LUFS.
		const value = Math.round(
			Math.sin((2 * Math.PI * 440 * frame) / sampleRate) * 320,
		);
		for (let channel = 0; channel < channels; channel++) {
			buffer.writeInt16LE(value, 44 + (frame * channels + channel) * 2);
		}
	}

	// One sample at full scale, which removes essentially all the headroom
	// without meaningfully changing the measured loudness.
	buffer.writeInt16LE(32767, 44 + 1000 * channels * 2);
	buffer.writeInt16LE(32767, 44 + (1000 * channels + 1) * 2);

	writeFileSync(path, buffer);
}

test("refuses to clip, and says how far short it stopped", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-norm-clip-"));

	// Quiet but peaking: reaching -14 LUFS needs far more gain than the headroom
	// allows, so the tool must stop short rather than distort.
	const loud = join(work, "loud.wav");
	quietWithOnePeak(loud);

	const output = join(work, "normalised.wav");
	await normaliseThroughUi(page, loud, output);

	// The honest outcome: undistorted, and explained.
	await expect(page.getByTestId("notices")).toContainText(
		/would clip the peaks/i,
	);
	await expect(page.getByTestId("notices")).toContainText(
		/Clipping cannot be undone/i,
	);

	// Peaks must not have been driven into the rail. ffmpeg reports the maximum
	// sample value; at or below full scale is the requirement.
	const stats = execSync(
		`ffmpeg -i "${output}" -filter:a astats -f null - 2>&1`,
		{ encoding: "utf8" },
	);
	const peakDb = Number.parseFloat(
		stats.match(/Peak level dB:\s+(-?\d+(?:\.\d+)?)/)?.[1] ?? "NaN",
	);
	expect(
		peakDb,
		`peaks must stay at or below full scale, saw ${peakDb}dB`,
	).toBeLessThanOrEqual(0.01);
});
