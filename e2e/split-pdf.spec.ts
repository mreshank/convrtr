import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

/**
 * Proves splitting copies pages rather than re-rendering them.
 *
 * The distinction is invisible in a viewer and enormous in practice: a
 * re-rendered page looks correct on screen, has no selectable text, and prints
 * badly. Several online splitters work that way.
 *
 * So the fixture embeds a distinct JPEG in each page, and the test requires
 * each split file to contain its own JPEG's bytes *verbatim* and none of the
 * others. That pins down page order and byte preservation at once — a
 * re-render would produce different bytes for every page, and a page-ordering
 * bug would put the wrong JPEG in the wrong file.
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

/**
 * Solid colours, one per page.
 *
 * The first version used `testsrc` with a different `decimals` setting per
 * page, which produces three byte-identical JPEGs at frame zero — the setting
 * only changes a timer readout that is not yet drawn. Every page then
 * "contained" every other page's image and the test failed while the splitter
 * was correct. Distinctness is asserted below rather than assumed.
 */
const PAGE_COLOURS = ["red", "lime", "blue"];
const PAGES = PAGE_COLOURS.length;

function makeJpegs(dir: string): Uint8Array[] {
	const images = PAGE_COLOURS.map((colour) => {
		const path = join(dir, `page-${colour}.jpg`);
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
		// `new Uint8Array(...)`, not the Buffer and not `Buffer.from`.
		//
		// pdf-lib 1.17.1's JPEG embedder reads from the underlying ArrayBuffer
		// and ignores byteOffset, and Node hands back small files as views into
		// a shared 8KB pool at a non-zero offset — so it read pool bytes and
		// reported "SOI not found in JPEG". `Buffer.from` does not help: it
		// re-pools, landing at another non-zero offset. Only a plain Uint8Array
		// starts at zero. Verified all three cases directly.
		//
		// The product is unaffected: engines receive an ArrayBuffer and wrap it
		// with `new Uint8Array(input)`, which is always offset zero.
		return new Uint8Array(readFileSync(path));
	});

	// The whole test rests on these being tellable apart, so check rather than
	// trust it.
	for (const [a, first] of images.entries()) {
		for (const [b, second] of images.entries()) {
			if (a === b) continue;
			expect(
				Buffer.from(first).includes(Buffer.from(second)),
				`fixture images ${a} and ${b} are not distinct, which would make every assertion below meaningless`,
			).toBe(false);
		}
	}

	return images;
}

async function buildPdf(dir: string, images: Uint8Array[]): Promise<string> {
	const document = await PDFDocument.create();
	for (const image of images) {
		// Embedded as a DCTDecode stream, so the JPEG's own bytes end up in the
		// PDF and can be looked for afterwards.
		const embedded = await document.embedJpg(image);
		const page = document.addPage([220, 220]);
		page.drawImage(embedded, { x: 10, y: 10, width: 200, height: 200 });
	}
	const path = join(dir, "source.pdf");
	writeFileSync(path, await document.save());
	return path;
}

test("splits into pages that keep their original content", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-split-"));
	const images = makeJpegs(work);
	const source = await buildPdf(work, images);

	await page.goto("/document/split-pdf");
	await expect(
		page.getByRole("heading", { name: "Split a PDF into separate pages" }),
	).toBeVisible();

	await page.setInputFiles("input[type=file]", source);
	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	await expect(page.getByTestId("notices")).toContainText(
		/copied rather than re-rendered/i,
	);

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	const archivePath = join(work, "pages.zip");
	await (await downloadPromise).saveAs(archivePath);

	const archive = unzipSync(new Uint8Array(readFileSync(archivePath)));
	const names = Object.keys(archive).sort();
	expect(names, `archive held ${names.join(", ")}`).toHaveLength(PAGES);

	for (const [index, name] of names.entries()) {
		const pageBytes = Buffer.from(archive[name] ?? new Uint8Array());
		const own = images[index];
		if (!own) throw new Error(`missing reference image ${index}`);

		// Its own image, byte for byte. A re-render would not contain these bytes
		// anywhere.
		expect(
			pageBytes.includes(Buffer.from(own)),
			`${name} must contain page ${index + 1}'s original JPEG verbatim`,
		).toBe(true);

		// And none of the others, which would mean the wrong page was copied.
		for (const [otherIndex, other] of images.entries()) {
			if (otherIndex === index) continue;
			expect(
				pageBytes.includes(Buffer.from(other)),
				`${name} must not contain page ${otherIndex + 1}'s image`,
			).toBe(false);
		}

		// Still a real, loadable PDF of exactly one page.
		const parsed = await PDFDocument.load(pageBytes);
		expect(parsed.getPageCount()).toBe(1);
	}
});
