import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves extracted artwork is the embedded bytes, not a re-encode of them.
 *
 * The check is a byte comparison against the image that was embedded in the
 * first place, which is only possible because the test embeds it. A test that
 * merely opened the output and confirmed it was a valid JPEG would pass just as
 * happily for a re-encoded one — and a re-encode is the failure mode here,
 * because it degrades the picture invisibly while looking like success.
 *
 * The PNG case is the one that motivated reporting the output type from the
 * engine: embedded art is usually JPEG, so a tool that assumed so would misname
 * real files without ever being obviously wrong.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to embed artwork to extract");

/** A small image with enough structure that a re-encode would alter its bytes. */
function makeArtwork(dir: string, ext: "jpg" | "png"): string {
	const path = join(dir, `art.${ext}`);
	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-f",
			"lavfi",
			"-i",
			"testsrc=size=240x240:rate=1",
			"-frames:v",
			"1",
			path,
		],
		{ stdio: "ignore" },
	);
	return path;
}

async function extractThroughUi(
	page: import("@playwright/test").Page,
	toolPath: string,
	input: string,
	saveTo: string,
): Promise<string> {
	await page.goto(toolPath);
	await page.setInputFiles("input[type=file]", input);
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const download = await downloadPromise;
	await download.saveAs(saveTo);
	return download.suggestedFilename();
}

test("extracts MP3 artwork byte-for-byte", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-cover-"));
	const art = makeArtwork(work, "jpg");
	const tagged = join(work, "tagged.mp3");

	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-i",
			"e2e/fixtures/sample.wav",
			"-i",
			art,
			"-map",
			"0:a",
			"-map",
			"1:v",
			"-c:a",
			"libmp3lame",
			"-c:v",
			"copy",
			"-id3v2_version",
			"3",
			"-metadata:s:v",
			"title=Album cover",
			tagged,
		],
		{ stdio: "ignore" },
	);

	const output = join(work, "cover.jpg");
	const suggested = await extractThroughUi(
		page,
		"/audio/mp3-cover-art",
		tagged,
		output,
	);

	await expect(page.getByTestId("notices")).toContainText(
		/copied out exactly as it was stored/i,
	);
	expect(suggested.endsWith(".jpg"), `named ${suggested}`).toBe(true);

	// The embedded image, recovered independently, must match ours exactly.
	const reference = join(work, "reference.jpg");
	execFileSync(
		"ffmpeg",
		["-y", "-i", tagged, "-an", "-c:v", "copy", reference],
		{
			stdio: "ignore",
		},
	);

	expect(
		readFileSync(output).equals(readFileSync(reference)),
		"the extracted artwork must be the embedded bytes, not a re-encode of them",
	).toBe(true);
});

test("names a PNG cover a .png rather than assuming JPEG", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-cover-png-"));
	const art = makeArtwork(work, "png");
	const tagged = join(work, "tagged.flac");

	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-i",
			"e2e/fixtures/sample.wav",
			"-i",
			art,
			"-map",
			"0:a",
			"-map",
			"1:v",
			"-c:a",
			"flac",
			"-c:v",
			"copy",
			"-disposition:v",
			"attached_pic",
			tagged,
		],
		{ stdio: "ignore" },
	);

	const output = join(work, "cover.png");
	const suggested = await extractThroughUi(
		page,
		"/audio/flac-cover-art",
		tagged,
		output,
	);

	// The tool declares .jpg; the engine reported PNG from the bytes. Without
	// that channel this file would have been saved under the wrong extension.
	expect(
		suggested.endsWith(".png"),
		`a PNG cover must be named .png, was ${suggested}`,
	).toBe(true);

	const bytes = readFileSync(output);
	expect(Array.from(bytes.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
	expect(bytes.equals(readFileSync(art))).toBe(true);
});
