import { execFileSync } from "node:child_process";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the GIF actually animates the requested section.
 *
 * "A GIF came out" would pass for a one-frame still, for an animation of the
 * wrong part of the video, or for one playing at the wrong speed — all
 * plausible failures and none obvious from the file alone. The fixture is
 * built with one solid colour per second, so ffprobe can be asked what colours
 * appear across the frames and in what order, which pins down both the section
 * and the direction of time without knowing anything about the encoder.
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

const SECONDS = ["red", "lime", "blue", "yellow"] as const;

function makeColourClip(dir: string): string {
	const path = join(dir, "colours.mp4");
	const inputs = SECONDS.flatMap((name) => [
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

/** Average colour of each frame of a GIF, via ffmpeg's signalstats. */
function frameColours(gif: string): [number, number, number][] {
	const raw = execFileSync("ffmpeg", [
		"-y",
		"-i",
		gif,
		"-vf",
		"scale=1:1",
		"-f",
		"rawvideo",
		"-pix_fmt",
		"rgb24",
		"-",
	]);
	const out: [number, number, number][] = [];
	for (let i = 0; i + 2 < raw.length; i += 3) {
		out.push([raw[i] ?? 0, raw[i + 1] ?? 0, raw[i + 2] ?? 0]);
	}
	return out;
}

/** Which of red/green/blue dominates — enough to identify these fixtures. */
function dominant(pixel: [number, number, number]): string {
	const [r, g, b] = pixel;
	if (r > 150 && g > 150) return "yellow";
	if (r > 120 && r > g && r > b) return "red";
	if (g > 120 && g > r && g > b) return "lime";
	if (b > 120 && b > r && b > g) return "blue";
	return "other";
}

test("animates the chosen section, in order, at a real frame rate", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-gif-"));
	const fixture = makeColourClip(work);

	await page.goto("/video/mp4-to-gif");
	await expect(
		page.getByRole("heading", { name: "Convert MP4 to GIF" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", fixture);
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 180_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "out.gif");
	await (await downloadPromise).saveAs(output);

	expect(
		statSync(output).size,
		"the GIF must not be empty, or every check below is measuring nothing",
	).toBeGreaterThan(0);

	const probed = execFileSync("ffprobe", [
		"-v",
		"error",
		"-show_entries",
		"stream=codec_name,width",
		"-of",
		"csv=p=0",
		output,
	]).toString();
	expect(probed).toContain("gif");

	const colours = frameColours(output).map(dominant);

	// More than one frame: a still image is the easiest way for this to be
	// quietly broken, and it would satisfy every check above.
	expect(
		colours.length,
		`the GIF must animate, but it had ${colours.length} frame(s)`,
	).toBeGreaterThan(10);

	// The clip covers the whole 4-second fixture by default, so all four
	// colours must appear, in the order they occur in the source. That pins
	// down both which section was taken and that time runs forwards.
	const sequence = colours.filter(
		(colour, index) => colour !== colours[index - 1],
	);
	expect(
		sequence.filter((c) => c !== "other"),
		`expected the four fixture colours in order, saw: ${sequence.join(" -> ")}`,
	).toEqual(["red", "lime", "blue", "yellow"]);
});
