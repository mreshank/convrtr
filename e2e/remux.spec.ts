import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the claim the whole video pack rests on: converting an MKV holding
 * H.264 and AAC into MP4 copies the compressed streams rather than
 * re-encoding them, so the video inside the output is byte-identical to the
 * video that went in.
 *
 * This is the video equivalent of the image pack's lossless round-trip test.
 * Asserting "it produced an MP4" would pass just as happily for a converter
 * that silently re-encoded and cost the user a generation of quality — which
 * is exactly what almost every competing tool does. The only assertion worth
 * making is on the bytes.
 *
 * ffprobe/ffmpeg are used to extract the streams for comparison. They are not
 * part of the product — they are the independent measuring instrument, which
 * is the point: the check does not rely on the same library that performed
 * the conversion.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

const HAVE_FFMPEG = ffmpegAvailable();

test.skip(
	!HAVE_FFMPEG,
	"needs ffmpeg to extract streams for an independent byte comparison",
);

test("remuxing MKV to MP4 leaves the video stream byte-identical", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-remux-"));

	await page.goto("/video/mkv-to-mp4");
	await expect(
		page.getByRole("heading", { name: "Convert MKV to MP4" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.mkv");

	// The default preset must be the copy path. If this ever flips to a
	// re-encode by default the whole value proposition is gone, and this
	// assertion should be the thing that notices. Checked after upload,
	// because the options panel only renders once a file is selected.
	await expect(page.getByText("Lossless").first()).toBeVisible();
	await page.getByRole("button", { name: /^CONVERT/ }).click();

	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	// Playwright's Chromium exposes showSaveFilePicker, so the save path
	// correctly prefers it — and it never resolves headlessly, so no download
	// event would ever fire. Removing it forces the anchor-download fallback,
	// which is the path a browser without the File System Access API takes.
	// This substitutes the save mechanism only; the converted bytes under test
	// are untouched.
	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});

	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const download = await downloadPromise;

	const outputPath = join(work, "converted.mp4");
	await download.saveAs(outputPath);

	// Independent extraction of both video streams, by a tool that had no part
	// in the conversion.
	const sourceH264 = join(work, "source.h264");
	const outputH264 = join(work, "output.h264");
	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-i",
			"e2e/fixtures/sample.mkv",
			"-c:v",
			"copy",
			"-an",
			"-f",
			"h264",
			sourceH264,
		],
		{ stdio: "ignore" },
	);
	execFileSync(
		"ffmpeg",
		["-y", "-i", outputPath, "-c:v", "copy", "-an", "-f", "h264", outputH264],
		{ stdio: "ignore" },
	);

	const sourceBytes = execFileSync("shasum", ["-a", "256", sourceH264])
		.toString()
		.split(" ")[0];
	const outputBytes = execFileSync("shasum", ["-a", "256", outputH264])
		.toString()
		.split(" ")[0];

	expect(
		outputBytes,
		"the H.264 stream in the MP4 must be byte-identical to the one in the MKV — a re-encode would change it",
	).toBe(sourceBytes);
});

test("the output is a real MP4 that a decoder accepts", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-remux-valid-"));

	await page.goto("/video/mkv-to-mp4");
	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.mkv");
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	// Playwright's Chromium exposes showSaveFilePicker, so the save path
	// correctly prefers it — and it never resolves headlessly, so no download
	// event would ever fire. Removing it forces the anchor-download fallback,
	// which is the path a browser without the File System Access API takes.
	// This substitutes the save mechanism only; the converted bytes under test
	// are untouched.
	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});

	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const outputPath = join(work, "converted.mp4");
	await (await downloadPromise).saveAs(outputPath);

	// Byte-identical streams inside a malformed container would still be
	// useless, so check the container actually parses and carries both tracks.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,codec_type",
		"-of",
		"csv=p=0",
		outputPath,
	]).toString();

	expect(probed).toContain("h264,video");
	expect(probed).toContain("aac,audio");
});
