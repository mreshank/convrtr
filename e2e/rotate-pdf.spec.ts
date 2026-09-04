import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { degrees, PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Proves rotation changes the rotation and nothing else.
 *
 * Two failure modes matter and neither is obvious from looking at the output. A
 * tool can rasterise the page to turn it — the result looks right and has lost
 * all its text — and a tool can *set* the rotation rather than adding to it,
 * which works on upright documents and mangles the scanned ones people are
 * actually trying to fix.
 *
 * So the fixture carries real text and one page that is already rotated, and
 * the test checks the resulting angles arithmetically as well as confirming the
 * text survived.
 */

function qpdfAvailable(): boolean {
	try {
		execFileSync("qpdf", ["--version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/** Page 1 upright, page 2 already at 90°, both with extractable text. */
async function makePdf(dir: string): Promise<string> {
	const document = await PDFDocument.create();
	const font = await document.embedFont(StandardFonts.Helvetica);

	const first = document.addPage([300, 300]);
	first.drawText("FIRST PAGE MARKER", { x: 20, y: 150, size: 14, font });

	const second = document.addPage([300, 300]);
	second.drawText("SECOND PAGE MARKER", { x: 20, y: 150, size: 14, font });
	// Already sideways, as a scan usually is.
	second.setRotation(degrees(90));

	const path = join(dir, "source.pdf");
	writeFileSync(path, await document.save());
	return path;
}

async function rotateThroughUi(
	page: import("@playwright/test").Page,
	source: string,
	output: string,
	angle?: "180" | "270",
): Promise<void> {
	await page.goto("/document/rotate-pdf");
	await page.setInputFiles("input[type=file]", source);

	if (angle) {
		await page.getByRole("button", { name: /ADVANCED/i }).click();
		await page.getByLabel("Turn by").selectOption(angle);
	}

	await page.getByRole("button", { name: /^CONVERT/ }).click();
	await expect(page.getByTestId("result")).toBeVisible({ timeout: 120_000 });

	await page.evaluate(() => {
		Reflect.deleteProperty(window, "showSaveFilePicker");
	});
	const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
	await page.getByRole("button", { name: /^SAVE/ }).first().click();
	await (await downloadPromise).saveAs(output);
}

test("adds the rotation, and keeps the text", async ({ page }) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-rot-"));
	const source = await makePdf(work);
	const output = join(work, "rotated.pdf");

	await rotateThroughUi(page, source, output);

	// It noticed the already-rotated page, rather than quietly overwriting it.
	await expect(page.getByTestId("notices")).toContainText(/already rotated/i);

	const parsed = await PDFDocument.load(new Uint8Array(readFileSync(output)));
	const angles = parsed.getPages().map((p) => p.getRotation().angle);

	// 0 + 90 = 90, and 90 + 90 = 180. A tool that assigned rather than added
	// would produce [90, 90] — right on the first page, wrong on the second.
	expect(angles, `angles were ${angles.join(", ")}`).toEqual([90, 180]);

	// And the text is still text.
	//
	// Searching the raw file finds nothing either way: pdf-lib Flate-compresses
	// content streams, so the markers are not literal bytes in the source
	// either — my first version of this assertion was simply wrong. qpdf
	// decompresses them, and took no part in the conversion, so it is an
	// independent reading rather than the implementation agreeing with itself.
	test.skip(!qpdfAvailable(), "needs qpdf to read compressed content streams");

	const readable = join(work, "readable.pdf");
	execFileSync(
		"qpdf",
		["--qdf", "--object-streams=disable", output, readable],
		{
			stdio: "ignore",
		},
	);
	const text = readFileSync(readable, "latin1");

	expect(
		text.includes("FIRST PAGE MARKER"),
		"the page text must survive a rotation — a rasterising tool would leave an image here",
	).toBe(true);
	expect(text.includes("SECOND PAGE MARKER")).toBe(true);

	// Stronger still: the drawing instructions must be identical to the
	// source's, so rotation really did change nothing but the rotation.
	const readableSource = join(work, "readable-source.pdf");
	execFileSync(
		"qpdf",
		["--qdf", "--object-streams=disable", source, readableSource],
		{ stdio: "ignore" },
	);
	const sourceText = readFileSync(readableSource, "latin1");

	const drawingOps = (content: string) =>
		[...content.matchAll(/BT\s[\s\S]*?ET/g)].map((match) => match[0]);

	expect(
		drawingOps(text),
		"the text-drawing operations must be byte-identical to the source's",
	).toEqual(drawingOps(sourceText));
});

test("honours a 180 degree choice rather than defaulting to 90", async ({
	page,
}) => {
	const work = mkdtempSync(join(tmpdir(), "convrtr-rot-180-"));
	const source = await makePdf(work);
	const output = join(work, "rotated.pdf");

	await rotateThroughUi(page, source, output, "180");

	const parsed = await PDFDocument.load(new Uint8Array(readFileSync(output)));
	const angles = parsed.getPages().map((p) => p.getRotation().angle);

	// The select control hands its value over as a string, so an engine reading
	// only numbers falls back to 90 and every choice but the default is
	// silently ignored — 90 would still look correct here.
	expect(angles, `angles were ${angles.join(", ")}`).toEqual([180, 270]);
});
