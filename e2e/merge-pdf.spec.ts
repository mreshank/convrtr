import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

/**
 * Proves merging keeps every page, in the order given, with content intact.
 *
 * Three things can go wrong and only one is visible in a viewer: pages could be
 * dropped, reordered, or re-rendered. So each source PDF embeds a distinct
 * JPEG, and the merged file must contain all of them, in order, byte for byte.
 * Page order is checked by extracting each merged page separately and looking
 * for the image that belongs there.
 */

function ffmpegAvailable(): boolean {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

test.skip(!ffmpegAvailable(), "needs ffmpeg to build distinguishable pages");

const COLOURS = ["red", "lime", "blue"];

/**
 * Solid colours, so the images are genuinely distinct.
 *
 * `new Uint8Array(...)` rather than the Buffer: pdf-lib 1.17.1 ignores
 * byteOffset and Node pools small files at a non-zero offset, which fails with
 * "SOI not found in JPEG".
 */
function makeJpegs(dir: string): Uint8Array[] {
	const images = COLOURS.map((colour) => {
		const path = join(dir, `art-${colour}.jpg`);
		execFileSync(
			"ffmpeg",
			[
				"-y",
				"-f",
				"lavfi",
				"-i",
				`color=c=${colour}:size=200x200:rate=1`,
				"-frames:v",
				"1",
				"-q:v",
				"3",
				path,
			],
			{ stdio: "ignore" },
		);
		return new Uint8Array(readFileSync(path));
	});

	for (const [a, first] of images.entries()) {
		for (const [b, second] of images.entries()) {
			if (a === b) continue;
			expect(
				Buffer.from(first).includes(Buffer.from(second)),
				`fixture images ${a} and ${b} are not distinct`,
			).toBe(false);
		}
	}
	return images;
}

/** One single-page PDF per image. */
async function makePdfs(dir: string, images: Uint8Array[]): Promise<string[]> {
	const paths: string[] = [];
	for (const [index, image] of images.entries()) {
		const document = await PDFDocument.create();
		const embedded = await document.embedJpg(image);
		const page = document.addPage([220, 220]);
		page.drawImage(embedded, { x: 10, y: 10, width: 200, height: 200 });
		const path = join(dir, `source-${index}.pdf`);
		writeFileSync(path, await document.save());
		paths.push(path);
	}
	return paths;
}

test("merges several PDFs in order, keeping every page's content", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-merge-"));
	const images = makeJpegs(work);
	const sources = await makePdfs(work, images);

	await page.goto("/document/merge-pdf");
	await expect(
		page.getByRole("heading", { name: "Merge PDF files" }),
	).toBeVisible();

	// All three at once: the combining path, not the batch path.
	await page.setInputFiles("input[type=file]", sources);

	// The order is the page order, so it has to be visible before converting.
	const order = page.getByTestId("combine-order");
	await expect(order).toBeVisible();
	await expect(order).toContainText("1. source-0.pdf");
	await expect(order).toContainText("3. source-2.pdf");

	// And the batch table must not appear — that would mean three separate
	// conversions rather than one merge.
	await expect(page.getByTestId("batch-table")).toHaveCount(0);

	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });
	await expect(page.getByTestId("notices")).toContainText(
		/in the order you added them/i,
	);

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const merged = join(work, "merged.pdf");
	await (await downloadPromise).saveAs(merged);

	const mergedBytes = readFileSync(merged);
	const parsed = await PDFDocument.load(new Uint8Array(mergedBytes));
	expect(
		parsed.getPageCount(),
		"every source page must survive the merge",
	).toBe(images.length);

	// Every image present, byte for byte — a re-render would contain none of
	// them.
	for (const [index, image] of images.entries()) {
		expect(
			mergedBytes.includes(Buffer.from(image)),
			`the merged file must contain source ${index + 1}'s image verbatim`,
		).toBe(true);
	}

	// Order: page N must hold image N. Checked by pulling each page out on its
	// own, so a reordering bug cannot hide behind "all images are somewhere".
	for (const [index, image] of images.entries()) {
		const single = await PDFDocument.create();
		const [copied] = await single.copyPages(parsed, [index]);
		if (!copied) throw new Error(`could not extract merged page ${index}`);
		single.addPage(copied);
		const pageBytes = Buffer.from(await single.save());

		expect(
			pageBytes.includes(Buffer.from(image)),
			`merged page ${index + 1} must hold source ${index + 1}'s image`,
		).toBe(true);
	}
});

test("refuses a single file rather than pretending to merge it", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-merge-one-"));
	const images = makeJpegs(work);
	const sources = await makePdfs(work, images.slice(0, 1));

	await page.goto("/document/merge-pdf");
	await page.setInputFiles("input[type=file]", sources);

	// One file takes the ordinary single-file path, where the engine refuses —
	// handing back the input unchanged would suggest something happened.
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("error")).toBeVisible({ timeout: 120_000 });
	await page.getByRole("button", { name: /TECHNICAL DETAIL/ }).click();
	await expect(page.getByTestId("error")).toContainText(/at least two PDFs/i);
});
