import { execFileSync } from "node:child_process";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves a file too large to buffer converts without being buffered, and that
 * taking the streaming path costs nothing in fidelity.
 *
 * The unit tests cover the dangerous decision — commit on success, discard on
 * failure — but they stub the engine, so nothing there shows that mediabunny's
 * BlobSource and StreamTarget actually produce a valid file through a real
 * muxer in a real browser. That is what this covers.
 *
 * The fidelity claim is established transitively rather than by re-running
 * ffmpeg over the streamed output. `remux.spec.ts` already proves, with an
 * independent tool, that the buffered path leaves the H.264 stream
 * byte-identical to the source. So if the streamed output is byte-identical to
 * the buffered output of the same input, it inherits that proof — and the only
 * things that have to cross out of the browser are two hex digests instead of
 * 70MB.
 *
 * The fixture is generated rather than committed: it has to exceed the 64MB
 * threshold at which preflight switches strategy, and a 70MB binary does not
 * belong in git. It is noise-filtered and losslessly encoded because
 * synthetic video compresses far too well to reach that size otherwise.
 */

function toolAvailable(tool: string): boolean {
	try {
		execFileSync(tool, ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

const HAVE_FFMPEG = toolAvailable("ffmpeg");

test.skip(
	!HAVE_FFMPEG,
	"needs ffmpeg to generate a fixture larger than the streaming threshold",
);

/** Must exceed OPFS_THRESHOLD_BYTES (64MiB) for preflight to choose streaming. */
const THRESHOLD_BYTES = 64 * 1024 * 1024;

function makeLargeMkv(dir: string): string {
	const path = join(dir, "large.mkv");
	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-f",
			"lavfi",
			"-i",
			"testsrc=size=640x360:rate=30",
			"-f",
			"lavfi",
			"-i",
			"sine=frequency=440",
			"-t",
			"3",
			"-vf",
			"noise=alls=90:allf=t+u",
			"-c:v",
			"libx264",
			"-preset",
			"ultrafast",
			"-crf",
			"0",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			path,
		],
		{ stdio: "ignore" },
	);

	const { size } = statSync(path);
	// A fixture under the threshold would send the test down the buffered path
	// while still passing every assertion below — the test would then prove
	// nothing about streaming at all.
	expect(
		size,
		`fixture must exceed ${THRESHOLD_BYTES} bytes to trigger the streaming path`,
	).toBeGreaterThan(THRESHOLD_BYTES);

	return path;
}

test("a file over the streaming threshold is written straight to disk", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-stream-"));
	const fixture = makeLargeMkv(work);

	await page.goto("/video/mkv-to-mp4");

	// Point the save dialog at an OPFS file. A real picker cannot be driven
	// headlessly, and an OPFS handle is a genuine FileSystemFileHandle — it is
	// structured-cloneable, so it crosses to the worker and gets a real
	// writable there, exercising the same code path as a user-chosen file.
	await page.evaluate(() => {
		Object.defineProperty(window, "showSaveFilePicker", {
			configurable: true,
			writable: true,
			value: async () => {
				const root = await navigator.storage.getDirectory();
				return root.getFileHandle("streamed.mp4", { create: true });
			},
		});
	});

	await page.setInputFiles("input[type=file]", fixture);
	await page.getByRole("button", { name: /^CONVERT/ }).click();

	// The streamed readout, not the buffered one. If the app had fallen back to
	// buffering, `result` would appear instead and this would time out —
	// which is the point of asserting on the distinct testid.
	await expect(page.getByTestId("streamed")).toBeVisible({ timeout: 180_000 });
	await expect(page.getByTestId("streamed")).toContainText("SAVED TO DISK");

	// No SAVE button: the bytes are already on disk, and offering to save them
	// again would imply they were being held somewhere they are not.
	await expect(page.getByRole("button", { name: /^SAVE/ })).toHaveCount(0);

	// Pull the streamed file out of OPFS through a normal download rather than
	// a base64 string, so ~70MB does not have to cross as JS text. This reads
	// the file whole *in the test*, which the product path deliberately never
	// does — it is verification, not conversion.
	const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
	await page.evaluate(async () => {
		const root = await navigator.storage.getDirectory();
		const handle = await root.getFileHandle("streamed.mp4");
		const file = await handle.getFile();
		const url = URL.createObjectURL(file);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "streamed.mp4";
		anchor.click();
	});
	const streamedPath = join(work, "streamed.mp4");
	await (await downloadPromise).saveAs(streamedPath);

	// Only a sanity floor, so ffmpeg has something to parse and fails as an
	// assertion rather than a thrown subprocess error. The substantive size
	// claim is left to the payload comparison below: a stream whose bytes match
	// a 70MB source's cannot itself be small, and asserting a large size here
	// instead would fire first and report "file too small" when the real fault
	// was a re-encode — which is exactly what the falsification run showed.
	expect(statSync(streamedPath).size).toBeGreaterThan(1024);

	// The direct proof, by a tool that took no part in the conversion: the
	// compressed video inside the streamed MP4 is the same bytes as the video
	// inside the source MKV.
	//
	// Comparing whole files against the buffered path would not work and would
	// not mean anything: a seekable stream target lays the container out
	// differently from a buffer target — different moov placement and
	// interleaving — so the files legitimately differ while carrying identical
	// video. The payload is the thing being claimed about, so the payload is
	// what gets compared.
	const sourceH264 = join(work, "source.h264");
	const streamedH264 = join(work, "streamed.h264");
	execFileSync(
		"ffmpeg",
		["-y", "-i", fixture, "-c:v", "copy", "-an", "-f", "h264", sourceH264],
		{ stdio: "ignore" },
	);
	execFileSync(
		"ffmpeg",
		[
			"-y",
			"-i",
			streamedPath,
			"-c:v",
			"copy",
			"-an",
			"-f",
			"h264",
			streamedH264,
		],
		{ stdio: "ignore" },
	);

	const sourceHex = execFileSync("shasum", ["-a", "256", sourceH264])
		.toString()
		.split(" ")[0];
	const streamedHex = execFileSync("shasum", ["-a", "256", streamedH264])
		.toString()
		.split(" ")[0];

	expect(
		streamedHex,
		"the H.264 stream in the streamed MP4 must be byte-identical to the source's — streaming must not cost fidelity",
	).toBe(sourceHex);

	// And a real container, not just the right bytes in a broken box.
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,codec_type",
		"-of",
		"csv=p=0",
		streamedPath,
	]).toString();

	expect(probed).toContain("h264,video");
	expect(probed).toContain("aac,audio");
});
