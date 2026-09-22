import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { xdToPngEngine } from "../index";
import { convertXdToPng, parseXd } from "../parser";

describe("Adobe XD (.xd) Parser & Engine", () => {
	const art = encodeRgbaToPng(20, 10, new Uint8Array(20 * 10 * 4).fill(180));
	const thumb = encodeRgbaToPng(4, 4, new Uint8Array(4 * 4 * 4));

	function makeXd(files: Record<string, Uint8Array>): Uint8Array {
		return fflate.zipSync(files);
	}

	it("prefers full renditions over thumbnails", () => {
		const zipped = makeXd({
			"resources/layout.json": new TextEncoder().encode("{}"),
			"previews/preview.png": thumb,
			"renditions/artboard.png": art,
		});
		const result = parseXd(zipped);
		expect(result.width).toBe(20);
		expect(result.height).toBe(10);
		expect(result.source).toContain("rendition");
	});

	it("falls back to any PNG when standard paths are missing", () => {
		const zipped = makeXd({ "assets/screen.png": art });
		const result = parseXd(zipped);
		expect(result.width).toBe(20);
	});

	it("converts end-to-end through the engine", async () => {
		expect(await xdToPngEngine.probe()).toBe(true);
		const zipped = makeXd({ "previews/preview.png": art });
		const input = zipped.buffer.slice(
			zipped.byteOffset,
			zipped.byteOffset + zipped.byteLength,
		) as ArrayBuffer;
		const out = await convertXdToPng(input, () => {});
		expect(new Uint8Array(out)[0]).toBe(0x89);
	});

	it("throws on non-ZIP input and previewless archives", () => {
		expect(() => parseXd(new Uint8Array(20).fill(3))).toThrow("PKZIP");
		const empty = makeXd({ "document.json": new TextEncoder().encode("{}") });
		expect(() => parseXd(empty)).toThrow("No artboard preview");
	});
});
