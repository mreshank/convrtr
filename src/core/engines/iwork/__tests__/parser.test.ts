import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertIworkToZip, parseIworkPreviews } from "../parser";

const FAKE_JPG = new Uint8Array([
	0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
]);

const FAKE_PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
]);

const FAKE_PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
const FAKE_IWA = new TextEncoder().encode("IWA protobuf body payload");

function makeIwork(entries: Record<string, Uint8Array>): ArrayBuffer {
	const zipped = zipSync(entries);
	return zipped.buffer.slice(
		zipped.byteOffset,
		zipped.byteOffset + zipped.byteLength,
	) as ArrayBuffer;
}

describe("parseIworkPreviews", () => {
	it("throws on non-ZIP input", () => {
		expect(() =>
			parseIworkPreviews(
				new Uint8Array(new Array(32).fill(0).map((_, i) => (i === 31 ? 1 : 0))),
			),
		).toThrow(/missing PKZIP container signature/);
	});

	it("throws when the archive has no rendered preview", () => {
		const buf = makeIwork({ "Index/Document.iwa": FAKE_IWA });
		expect(() => parseIworkPreviews(new Uint8Array(buf))).toThrow(
			/No embedded preview found/,
		);
	});

	it("pulls preview.jpg and repackages it as preview.jpg", () => {
		const buf = makeIwork({
			"Index/Document.iwa": FAKE_IWA,
			"preview.jpg": FAKE_JPG,
			"QuickLook/Preview.pdf": FAKE_PDF,
			"QuickLook/Thumbnail.png": FAKE_PNG,
		});
		const result = parseIworkPreviews(new Uint8Array(buf));
		expect(result.entries["preview.jpg"]).toEqual(FAKE_JPG);
		expect(result.entries["quicklook.pdf"]).toEqual(FAKE_PDF);
		expect(result.entries["thumbnail.png"]).toEqual(FAKE_PNG);
		expect(result.entries["_README.txt"]).toBeDefined();
		expect(result.found).toContain("preview.jpg");
	});

	it("prefers png when no jpg preview exists", () => {
		const buf = makeIwork({
			"preview.png": FAKE_PNG,
			"Index/Document.iwa": FAKE_IWA,
		});
		const result = parseIworkPreviews(new Uint8Array(buf));
		expect(result.entries["preview.png"]).toEqual(FAKE_PNG);
		expect(result.entries["preview.jpg"]).toBeUndefined();
	});

	it("accepts preview.pdf as the render", () => {
		const buf = makeIwork({
			"preview.pdf": FAKE_PDF,
			"Index/Document.iwa": FAKE_IWA,
		});
		const result = parseIworkPreviews(new Uint8Array(buf));
		expect(result.entries["preview.pdf"]).toEqual(FAKE_PDF);
		expect(result.previewExt).toBe("PDF");
	});

	it("matches preview files regardless of path case", () => {
		const buf = makeIwork({
			"PREVIEW.JPG": FAKE_JPG,
			"QUICKLOOK/THUMBNAIL.PNG": FAKE_PNG,
		});
		const result = parseIworkPreviews(new Uint8Array(buf));
		expect(result.entries["preview.jpg"]).toEqual(FAKE_JPG);
		expect(result.entries["thumbnail.png"]).toEqual(FAKE_PNG);
	});
});

describe("convertIworkToZip", () => {
	it("returns a valid zip whose entries are the extracted previews", async () => {
		const buf = makeIwork({
			"Index/Document.iwa": FAKE_IWA,
			"preview.jpg": FAKE_JPG,
			"QuickLook/Thumbnail.png": FAKE_PNG,
		});
		const out = convertIworkToZip(buf, () => {});
		const files = unzipSync(new Uint8Array(out));
		expect(files["preview.jpg"]).toEqual(FAKE_JPG);
		expect(files["thumbnail.png"]).toEqual(FAKE_PNG);
		expect(files["_README.txt"]).toBeDefined();
	});
});
