import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves audio extraction copies the stream instead of re-encoding it.
 *
 * "MP4 to MP3" is what people search for, and answering it the obvious way
 * means decoding the AAC already in the file and re-encoding it — a permanent
 * quality loss to reach an older format. convrtr offers the lossless
 * operation instead: the AAC packets copied out into an `.m4a`. That claim is
 * only worth making if the bytes actually match, so this compares them with
 * ffmpeg, which took no part in the extraction.
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
	"needs ffmpeg for an independent byte comparison",
);

/** Pulls the AAC out as raw ADTS so two containers can be compared directly. */
function extractAac(source: string, destination: string): void {
	execFileSync(
		"ffmpeg",
		["-y", "-i", source, "-vn", "-c:a", "copy", "-f", "adts", destination],
		{ stdio: "ignore" },
	);
}

function sha256(path: string): string | undefined {
	return execFileSync("shasum", ["-a", "256", path]).toString().split(" ")[0];
}

test("extracting audio from MP4 copies the AAC stream untouched", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-audio-"));
	const fixture = join(work, "sample.mp4");
	execFileSync(
		"ffmpeg",
		["-y", "-i", "e2e/fixtures/sample.mkv", "-c", "copy", fixture],
		{ stdio: "ignore" },
	);

	await page.goto("/audio/mp4-to-m4a");
	await expect(
		page.getByRole("heading", { name: "Extract audio from MP4" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", fixture);

	// The default must be the copy path. If this ever becomes a re-encode the
	// tool's whole reason for existing is gone.
	await expect(page.getByText("Lossless").first()).toBeVisible();
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	// Playwright's Chromium does expose showSaveFilePicker, and it never
	// resolves headlessly, so removing it forces the anchor-download fallback.
	// This substitutes only the save mechanism; the extracted bytes are
	// untouched.
	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const outputPath = join(work, "extracted.m4a");
	await (await downloadPromise).saveAs(outputPath);

	const sourceAac = join(work, "source.aac");
	const outputAac = join(work, "output.aac");
	extractAac(fixture, sourceAac);
	extractAac(outputPath, outputAac);

	expect(
		sha256(outputAac),
		"the AAC in the .m4a must be byte-identical to the AAC in the MP4 — a re-encode would change it",
	).toBe(sha256(sourceAac));

	// Byte-identical audio in a broken container would still be useless, and
	// an .m4a must carry no video track at all.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,codec_type",
		"-of",
		"csv=p=0",
		outputPath,
	]).toString();

	expect(probed).toContain("aac,audio");
	expect(
		probed,
		"an audio extraction must not still contain the video track",
	).not.toContain("video");
});

test("the pre-roll cost of the copy is stated, not hidden", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-audio-preroll-"));
	const fixture = join(work, "sample.mp4");
	execFileSync(
		"ffmpeg",
		["-y", "-i", "e2e/fixtures/sample.mkv", "-c", "copy", fixture],
		{ stdio: "ignore" },
	);

	await page.goto("/audio/mp4-to-m4a");
	await page.setInputFiles("input[type=file]", fixture);

	// One mode, not two. A "trim the pre-roll" preset was built and measured:
	// re-encoding to drop AAC's pre-roll gives the new encoder its own, so on a
	// 2.020s source the copy came out 2.043s and the re-encode 2.113s — worse
	// on timing *and* lossy. It is not offered, so it cannot be chosen by
	// mistake, and this asserts it stayed unoffered.
	// Scoped to the quality group: the theme toggle is also a radiogroup, so an
	// unscoped count would be measuring the wrong thing.
	const presets = page
		.getByRole("radiogroup", { name: "Quality" })
		.getByRole("radio");
	await expect(presets).toHaveCount(1);
	await expect(presets.filter({ hasText: "Lossless" })).toBeVisible();

	// The cost has to be visible where the choice is made, not buried. A
	// byte-for-byte copy that silently shifts the audio would be the kind of
	// omission this whole project exists to avoid.
	await expect(page.getByText(/pre-roll/i).first()).toBeVisible();
});
