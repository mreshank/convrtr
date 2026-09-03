import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves trimming copies packets instead of re-encoding them.
 *
 * Every browser trimmer re-encodes, because the obvious implementation does:
 * mediabunny's own `Conversion` re-encodes whenever the clip starts anywhere
 * but the beginning of the file. This tool reads packets out and writes them
 * back untouched, which is why the proof is a byte comparison rather than a
 * quality metric — a re-encode at any bitrate would fail it.
 *
 * The check is that the trimmed video's compressed stream appears *verbatim
 * and contiguously* inside the source's. That is a stronger statement than
 * comparing sizes or hashes of the whole file: it says these exact bytes came
 * out of that exact file, in that order, untouched.
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

/** Longer than the fixture, with keyframes far enough apart to force a shift. */
function makeClip(dir: string): string {
	const path = join(dir, "clip.mp4");
	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-f",
			"lavfi",
			"-i",
			"testsrc=size=320x240:rate=15",
			"-f",
			"lavfi",
			"-i",
			"sine=frequency=440",
			"-t",
			"8",
			"-c:v",
			"libx264",
			"-preset",
			"ultrafast",
			// A keyframe every 4 seconds, so a cut at 3s must move back to 0 and
			// the tool has something real to disclose.
			"-g",
			"60",
			"-keyint_min",
			"60",
			"-sc_threshold",
			"0",
			"-c:a",
			"aac",
			path,
		],
		{ stdio: "ignore" },
	);
	return path;
}

function h264Of(source: string, destination: string): Buffer {
	execFileSync(
		"ffmpeg",
		["-y", "-i", source, "-c:v", "copy", "-an", "-f", "h264", destination],
		{ stdio: "ignore" },
	);
	return readFileSync(destination);
}

test("trimming copies the packets, and says where the cut really landed", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-trim-"));
	const fixture = makeClip(work);

	await page.goto("/video/trim-mp4");
	await expect(
		page.getByRole("heading", { name: "Trim an MP4" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", fixture);

	// The range control only becomes meaningful once the file has been probed
	// for its duration, since that is what bounds it.
	await page.getByRole("button", { name: /ADVANCED/i }).click();
	const startHandle = page.getByRole("slider", { name: /start/i });
	await expect(startHandle).toBeVisible();
	await expect(startHandle).toHaveAttribute("max", /^[1-9]/, {
		timeout: 30_000,
	});

	// Ask for a cut at 5s. Keyframes are at 0s and 4s, so this snaps back to 4 —
	// a genuine mid-file cut, which means the copied packets must appear at a
	// non-zero offset inside the source. Asking for 3s instead would snap to 0
	// and copy the whole file, which passes a substring check while proving
	// nothing about trimming at all.
	await startHandle.fill("5");
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	// The shift has to be disclosed. A trimmer that silently moved the cut by
	// three seconds would be worse than one that re-encoded.
	const notices = page.getByTestId("notices");
	await expect(notices).toBeVisible();
	await expect(notices).toContainText(/nearest keyframe/i);

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const trimmed = join(work, "trimmed.mp4");
	await (await downloadPromise).saveAs(trimmed);

	const sourceStream = h264Of(fixture, join(work, "source.h264"));
	const trimmedStream = h264Of(trimmed, join(work, "trimmed.h264"));

	// Asserted explicitly, because an empty extraction otherwise slips through
	// everything below it: `indexOf` of an empty buffer is 0, and zero is less
	// than any source length. A falsification run produced exactly that — an
	// unreadable output that satisfied both checks by being nothing at all.
	expect(
		trimmedStream.length,
		"the trimmed file must contain real video — an empty or unreadable stream trivially satisfies the checks below",
	).toBeGreaterThan(1000);

	expect(
		trimmedStream.length,
		"a trim must produce less video than it started with",
	).toBeLessThan(sourceStream.length);

	expect(
		sourceStream.indexOf(trimmedStream),
		"the trimmed video's compressed stream must appear verbatim inside the source's — a re-encode would produce different bytes at every frame",
	).toBeGreaterThan(0);

	// And a real file, not just the right bytes in a broken container.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,codec_type",
		"-of",
		"csv=p=0",
		trimmed,
	]).toString();
	expect(probed).toContain("h264,video");
	expect(probed).toContain("aac,audio");
});
