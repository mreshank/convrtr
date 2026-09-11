import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { convertCbzToPdf, naturalSort } from "../index";

describe("Comic Book CBZ to PDF Engine", () => {
	it("correctly sorts filenames naturally", () => {
		const files = [
			"page_10.jpg",
			"page_1.jpg",
			"page_2.jpg",
			"cover.jpg",
			"page_20.jpg",
		];
		const sorted = [...files].sort(naturalSort);
		expect(sorted).toEqual([
			"cover.jpg",
			"page_1.jpg",
			"page_2.jpg",
			"page_10.jpg",
			"page_20.jpg",
		]);
	});

	it("converts a CBZ archive with multiple PNG pages into a PDF", async () => {
		const page1 = encodeRgbaToPng(8, 8, new Uint8Array(8 * 8 * 4).fill(255));
		const page2 = encodeRgbaToPng(8, 8, new Uint8Array(8 * 8 * 4).fill(128));
		const page10 = encodeRgbaToPng(8, 8, new Uint8Array(8 * 8 * 4).fill(64));

		const zipData: Record<string, Uint8Array> = {
			"page_10.png": page10,
			"page_1.png": page1,
			"page_2.png": page2,
			"ComicInfo.xml": new TextEncoder().encode(
				"<ComicInfo><Title>Test</Title></ComicInfo>",
			),
			"__MACOSX/._page_1.png": new Uint8Array([0, 0, 0, 0]),
		};

		const cbzBytes = zipSync(zipData);
		const result = await convertCbzToPdf(cbzBytes);

		expect(result.pageCount).toBe(3);
		expect(result.totalPagesFound).toBe(3);
		expect(result.pdfBytes.length).toBeGreaterThan(0);

		// Validate PDF header: %PDF- (0x25, 0x50, 0x44, 0x46)
		expect(result.pdfBytes[0]).toBe(0x25);
		expect(result.pdfBytes[1]).toBe(0x50);
		expect(result.pdfBytes[2]).toBe(0x44);
		expect(result.pdfBytes[3]).toBe(0x46);
	});

	it("throws error when no image pages exist in archive", async () => {
		const zipData: Record<string, Uint8Array> = {
			"readme.txt": new TextEncoder().encode("Not a comic"),
			"metadata.json": new TextEncoder().encode("{}"),
		};
		const emptyCbz = zipSync(zipData);
		await expect(convertCbzToPdf(emptyCbz)).rejects.toThrow(
			/No valid comic page images/,
		);
	});

	it("throws error on invalid ZIP container", async () => {
		const corrupted = new Uint8Array([1, 2, 3, 4, 5]);
		await expect(convertCbzToPdf(corrupted)).rejects.toThrow(
			/Invalid CBZ archive/,
		);
	});
});
