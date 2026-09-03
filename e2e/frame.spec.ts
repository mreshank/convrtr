import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the frame extracted is the frame that was asked for.
 *
 * Asserting "a PNG came out" would pass for a tool that always returned the
 * first frame, which is a plausible way to get seeking wrong and an easy one
 * to miss by eye. So the fixture is built with one solid colour per second:
 * the colour of the extracted image then says which second it came from, and
 * the check needs no knowledge of how either decoder works.
 *
 * Colours are compared with a tolerance because video is stored as YUV. The
 * round trip through YUV and back is not exactly reversible, so pure red
 * returns as something very close to red rather than #FF0000 — near enough to
 * identify the frame beyond doubt, which is all this needs.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to build a colour-coded fixture");

/** One solid colour per second, so a frame's colour identifies its second. */
const SECONDS = [
	{ name: "red", rgb: [255, 0, 0] },
	{ name: "lime", rgb: [0, 255, 0] },
	{ name: "blue", rgb: [0, 0, 255] },
	{ name: "yellow", rgb: [255, 255, 0] },
] as const;

function makeColourClip(dir: string): string {
	const path = join(dir, "colours.mp4");
	const inputs = SECONDS.flatMap(({ name }) => [
		"-f",
		"lavfi",
		"-i",
		`color=c=${name}:s=320x240:r=15:d=1`,
	]);
	execFileSync(
		"ffmpeg",
		[
			"-y",
			...inputs,
			"-filter_complex",
			`[0:v][1:v][2:v][3:v]concat=n=${SECONDS.length}:v=1[out]`,
			"-map",
			"[out]",
			"-c:v",
			"libx264",
			"-preset",
			"ultrafast",
			"-pix_fmt",
			"yuv420p",
			path,
		],
		{ stdio: "ignore" },
	);
	return path;
}

/** The centre pixel of a PNG, read out via ffmpeg so no image library is needed. */
function centrePixel(png: string, dir: string): [number, number, number] {
	const raw = join(dir, "frame.raw");
	execFileSync(
		"ffmpeg",
		["-y", "-i", png, "-f", "rawvideo", "-pix_fmt", "rgb24", raw],
		{ stdio: "ignore" },
	);
	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-select_streams",
		"v",
		"-show_entries",
		"stream=width,height",
		"-of",
		"csv=p=0",
		png,
	])
		.toString()
		.trim();
	const [width, height] = probed.split(",").map(Number);
	if (!width || !height) throw new Error(`could not size ${png}: ${probed}`);

	const bytes = readFileSync(raw);
	const offset = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 3;
	return [
		bytes[offset] ?? -1,
		bytes[offset + 1] ?? -1,
		bytes[offset + 2] ?? -1,
	];
}

function distance(
	a: readonly [number, number, number],
	b: readonly [number, number, number],
): number {
	return Math.sqrt(
		(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
	);
}

test("extracts the frame at the chosen moment, not simply the first", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-frame-"));
	const fixture = makeColourClip(work);

	await page.goto("/video/frame-to-png");
	await expect(
		page.getByRole("heading", { name: "Extract a video frame as PNG" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", fixture);
	await page.getByRole("button", { name: /ADVANCED/i }).click();

	const handle = page.getByRole("slider", { name: "Frame at" });
	// The control is bounded by the probed duration, so a usable max is proof
	// the probe resolved before the frame is chosen.
	await expect(handle).toHaveAttribute("max", /^[1-9]/, { timeout: 30_000 });

	// 2.5s falls inside the third second, which is blue.
	await handle.fill("2.5");
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "frame.png");
	await (await downloadPromise).saveAs(output);

	const pixel = centrePixel(output, work);
	const expected = SECONDS[2].rgb;
	const others = [SECONDS[0].rgb, SECONDS[1].rgb, SECONDS[3].rgb];

	// Nearest to the expected colour, and by a wide margin — an exact match is
	// not available through a YUV round trip, but a *closest* match is
	// unambiguous when the candidates are this far apart.
	expect(
		distance(pixel, expected),
		`the frame at 2.5s should be ${SECONDS[2].name}, but the centre pixel was rgb(${pixel.join(", ")})`,
	).toBeLessThan(60);
	for (const other of others) {
		expect(distance(pixel, expected)).toBeLessThan(distance(pixel, other));
	}
});
