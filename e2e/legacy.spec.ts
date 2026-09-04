import { execFileSync } from "node:child_process";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the ffmpeg.wasm tier converts a container no browser API can read,
 * asks before spending 31MB, and does not silently re-encode.
 *
 * The download gate is as much the subject here as the conversion. A converter
 * that quietly pulls 31MB on a metered connection would be a worse failure
 * than one that cannot read the format at all, so the test asserts nothing is
 * fetched until the gate is accepted.
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
	"needs ffmpeg to verify the output independently",
);

test("converts AVI to MP4, after asking to download the converter", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-legacy-"));

	// Track requests for the core so "nothing downloads before consent" is
	// measured rather than assumed.
	const coreRequests: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/ffmpeg/")) coreRequests.push(request.url());
	});

	await page.goto("/video/avi-to-mp4");
	await expect(
		page.getByRole("heading", { name: "Convert AVI to MP4" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", "e2e/fixtures/sample.avi");

	// The gate stands in place of the CONVERT button: there is no way to start
	// a conversion, and so no way to trigger the download, without passing it.
	const gate = page.getByTestId("download-gate");
	await expect(gate).toBeVisible();
	await expect(gate).toContainText("31MB");
	await expect(page.getByRole("button", { name: /^CONVERT/ })).toHaveCount(0);
	expect(
		coreRequests,
		"nothing from the ffmpeg core may be fetched before the user agrees",
	).toEqual([]);

	await page.getByRole("button", { name: /DOWNLOAD AND CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 300_000 });

	// AVI usually holds MPEG-4 and MP3, both legal in MP4, so this should be a
	// copy — and the tool should say so rather than leaving it implied.
	await expect(page.getByTestId("notices")).toContainText(
		/copied into the new container/i,
	);

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "out.mp4");
	await (await downloadPromise).saveAs(output);

	expect(statSync(output).size).toBeGreaterThan(0);

	// A real MP4 carrying both streams, checked by a tool that took no part in
	// the conversion.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,codec_type",
		"-of",
		"csv=p=0",
		output,
	]).toString();
	expect(probed).toContain("video");
	expect(probed).toContain("audio");

	// The core did get fetched, from our own origin — never a CDN. The privacy
	// claim depends on the whole conversion being local, and a third-party
	// script fetch would also break the offline story.
	expect(coreRequests.length).toBeGreaterThan(0);
	for (const url of coreRequests) {
		expect(new URL(url).origin).toBe(new URL(page.url()).origin);
	}
});
