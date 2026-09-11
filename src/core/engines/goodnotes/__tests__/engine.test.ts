import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { goodnotesToPdfEngine } from "../index";

describe("goodnotesToPdfEngine", () => {
	it("probes successfully in all environments", async () => {
		expect(await goodnotesToPdfEngine.probe()).toBe(true);
	});

	it("extracts a single PDF file directly from .goodnotes zip", async () => {
		const doc = await PDFDocument.create();
		doc.addPage([200, 200]);
		const pdfBytes = await doc.save();

		const zipData = zipSync({
			"document.pdf": pdfBytes,
			"metadata.json": new TextEncoder().encode('{"version": 1}'),
		});

		const result = await goodnotesToPdfEngine.run(zipData.buffer, {}, () => {});
		expect(result.byteLength).toBeGreaterThan(0);

		const parsed = await PDFDocument.load(result);
		expect(parsed.getPageCount()).toBe(1);
	});

	it("merges multiple ordered PDF page fragments into one document", async () => {
		const doc1 = await PDFDocument.create();
		doc1.addPage([100, 100]);
		const pdf1 = await doc1.save();

		const doc2 = await PDFDocument.create();
		doc2.addPage([200, 200]);
		const pdf2 = await doc2.save();

		const zipData = zipSync({
			"pages/page-0.pdf": pdf1,
			"pages/page-1.pdf": pdf2,
		});

		const result = await goodnotesToPdfEngine.run(zipData.buffer, {}, () => {});
		const parsed = await PDFDocument.load(result);
		expect(parsed.getPageCount()).toBe(2);
	});

	it("rejects non-zip files", async () => {
		const badBytes = new TextEncoder().encode("NOT_A_VALID_ZIP_FILE");
		await expect(
			goodnotesToPdfEngine.run(badBytes.buffer, {}, () => {}),
		).rejects.toThrow(/invalid ZIP container/i);
	});

	it("rejects goodnotes archives with no pages", async () => {
		const emptyZip = zipSync({
			"metadata.json": new TextEncoder().encode("{}"),
		});
		await expect(
			goodnotesToPdfEngine.run(emptyZip.buffer, {}, () => {}),
		).rejects.toThrow(/no renderable pdf pages/i);
	});
});
