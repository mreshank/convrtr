import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Proves the waveform drawing reflects the audio underneath it.
 *
 * "A PNG of the right size came out" would pass for a blank image, for one
 * drawn from the wrong file, and for one that sampled a single value per column
 * and so missed every transient. The fixture is therefore built with a known
 * shape — loud, silent, loud — and the test reads the rendered pixels back to
 * confirm the picture has that shape in the right places.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to read the rendered pixels back");

/** Loud for a second, silent for a second, loud again. */
function makeShapedAudio(path: string): void {
	const sampleRate = 44100;
	const seconds = 3;
	const frames = sampleRate * seconds;
	const channels = 1;
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
		const second = frame / sampleRate;
		// The middle second is digital silence, so its columns must draw as a
		// flat line while the outer thirds draw tall.
		const loud = second < 1 || second >= 2;
		const value = loud
			? Math.round(Math.sin((2 * Math.PI * 440 * frame) / sampleRate) * 30000)
			: 0;
		buffer.writeInt16LE(value, 44 + frame * 2);
	}

	writeFileSync(path, buffer);
}

/** Every pixel of a PNG as raw RGBA, via ffmpeg. */
function pixelsOf(
	png: string,
	work: string,
): { data: Buffer; width: number; height: number } {
	const raw = join(work, "pixels.raw");
	execFileSync(
		"ffmpeg",
		["-y", "-i", png, "-f", "rawvideo", "-pix_fmt", "rgba", raw],
		{ stdio: "ignore" },
	);
	const probed = execSync(
		`ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "${png}"`,
		{ encoding: "utf8" },
	).trim();
	const [width, height] = probed.split(",").map(Number);
	if (!width || !height) throw new Error(`could not size ${png}: ${probed}`);
	return { data: readFileSync(raw), width, height };
}

test("draws the shape of the audio, not just an image of the right size", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-wave-"));
	const source = join(work, "shaped.wav");
	makeShapedAudio(source);

	await page.goto("/audio/wav-waveform");
	await expect(
		page.getByRole("heading", { name: "Draw a waveform from a WAV file" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", source);
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const output = join(work, "wave.png");
	await (await downloadPromise).saveAs(output);

	const { data, width, height } = pixelsOf(output, work);
	expect(width).toBe(1200);
	expect(height).toBe(300);

	/** How many rows in a column differ from the background. */
	const traceHeight = (column: number): number => {
		let count = 0;
		for (let y = 0; y < height; y++) {
			const at = (y * width + column) * 4;
			// The dark preset's background is near-black; the trace is bright.
			if ((data[at + 1] ?? 0) > 128) count++;
		}
		return count;
	};

	// A quarter of the way in and three quarters through are inside the loud
	// thirds; the middle is inside the silent second.
	const loudLeft = traceHeight(Math.floor(width * 0.15));
	const silent = traceHeight(Math.floor(width * 0.5));
	const loudRight = traceHeight(Math.floor(width * 0.85));

	expect(
		loudLeft,
		`the loud passage must draw tall, was ${loudLeft}px of ${height}`,
	).toBeGreaterThan(height * 0.5);
	expect(loudRight).toBeGreaterThan(height * 0.5);

	// Silence draws as a thin line at the centre — a few pixels, not zero and
	// not tall.
	expect(
		silent,
		`silence must draw as a flat line, was ${silent}px`,
	).toBeLessThan(6);
});
