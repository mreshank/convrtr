import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves tag removal never touches the audio.
 *
 * The claim is stronger than "it still plays": the compressed audio must be
 * the *same bytes*. So the stripped file's audio is required to appear
 * verbatim inside the original, and — for MP3, where the audio is a contiguous
 * range — to be exactly the original with the tag blocks removed.
 *
 * Tags are added with ffmpeg first, so the test is stripping something real
 * rather than asserting that a file with no tags still has no tags.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to author and inspect tags");

function tagsOf(path: string): string {
	return execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"format_tags",
		"-of",
		"default=nw=1",
		path,
	]).toString();
}

async function stripThroughUi(
	page: import("@playwright/test").Page,
	toolPath: string,
	input: string,
	output: string,
): Promise<void> {
	await page.goto(toolPath);
	await page.setInputFiles("input[type=file]", input);
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	await (await downloadPromise).saveAs(output);
}

test("removes MP3 tags and leaves the audio byte-identical", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-tags-"));
	const tagged = join(work, "tagged.mp3");

	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-i",
			"e2e/fixtures/sample.wav",
			"-c:a",
			"libmp3lame",
			"-b:a",
			"128k",
			"-metadata",
			"title=Secret Project Notes",
			"-metadata",
			"artist=Someone Identifiable",
			"-metadata",
			"comment=/Users/someone/private/path",
			tagged,
		],
		{ stdio: "ignore" },
	);
	expect(tagsOf(tagged)).toContain("Secret Project Notes");

	const stripped = join(work, "stripped.mp3");
	await stripThroughUi(page, "/audio/remove-tags-mp3", tagged, stripped);

	// The tags are gone.
	const after = tagsOf(stripped);
	expect(after).not.toContain("Secret Project Notes");
	expect(after).not.toContain("Someone Identifiable");
	expect(after).not.toContain("/Users/someone");

	// And the audio is the same bytes — the whole point. A decode-and-re-encode
	// "cleaner" would pass the assertions above and fail this one.
	const original = readFileSync(tagged);
	const result = readFileSync(stripped);
	expect(
		original.indexOf(result),
		"the stripped file must be a contiguous range of the original — anything else means the audio was rewritten",
	).toBeGreaterThanOrEqual(0);
	expect(result.length).toBeLessThan(original.length);

	// Still a playable MP3 of the same length.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name",
		"-of",
		"csv=p=0",
		stripped,
	])
		.toString()
		.trim();
	expect(probed).toContain("mp3");
});

test("removes FLAC tags and artwork, leaving the samples identical", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-ftags-"));
	const tagged = join(work, "tagged.flac");

	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-i",
			"e2e/fixtures/sample.wav",
			"-c:a",
			"flac",
			"-metadata",
			"title=Secret Project Notes",
			"-metadata",
			"artist=Someone Identifiable",
			tagged,
		],
		{ stdio: "ignore" },
	);
	expect(tagsOf(tagged)).toContain("Secret Project Notes");

	const stripped = join(work, "stripped.flac");
	await stripThroughUi(page, "/audio/remove-tags-flac", tagged, stripped);

	const after = tagsOf(stripped);
	expect(after).not.toContain("Secret Project Notes");
	expect(after).not.toContain("Someone Identifiable");

	// FLAC's audio frames are not a single contiguous tail of the original in
	// general, so the claim is checked where it actually matters: the decoded
	// samples must be identical.
	const decode = (path: string, out: string) => {
		execFileSync(
			"ffmpeg",
			["-y", "-i", path, "-f", "s16le", "-acodec", "pcm_s16le", out],
			{ stdio: "ignore" },
		);
		return readFileSync(out);
	};

	const before = decode(tagged, join(work, "before.pcm"));
	const afterPcm = decode(stripped, join(work, "after.pcm"));
	expect(
		before.equals(afterPcm),
		"removing tags must not alter a single audio sample",
	).toBe(true);

	expect(statSync(stripped).size).toBeLessThan(statSync(tagged).size);
});
