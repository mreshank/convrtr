import { describe, expect, it } from "vitest";
import { webArchiveToHtmlEngine } from "../index";
import { parseWebArchive } from "../parser";

/**
 * Constructs a minimal valid binary bplist00 containing WebMainResource and WebSubresources.
 */
function buildMockWebArchive(): Uint8Array {
	const objects: Uint8Array[] = [];

	// Helper to create ASCII string object
	const makeString = (str: string): Uint8Array => {
		const len = str.length;
		if (len < 15) {
			const bytes = new Uint8Array(1 + len);
			bytes[0] = 0x50 | len;
			for (let i = 0; i < len; i++) {
				bytes[1 + i] = str.charCodeAt(i);
			}
			return bytes;
		}
		const bytes = new Uint8Array(1 + 1 + 2 + len);
		bytes[0] = 0x5f;
		bytes[1] = 0x11; // 2-byte integer length
		bytes[2] = (len >> 8) & 0xff;
		bytes[3] = len & 0xff;
		for (let i = 0; i < len; i++) {
			bytes[4 + i] = str.charCodeAt(i);
		}
		return bytes;
	};

	// Helper to create Data object
	const makeData = (dataBytes: Uint8Array): Uint8Array => {
		const len = dataBytes.length;
		if (len < 15) {
			const bytes = new Uint8Array(1 + len);
			bytes[0] = 0x40 | len;
			bytes.set(dataBytes, 1);
			return bytes;
		}
		const bytes = new Uint8Array(1 + 1 + 2 + len);
		bytes[0] = 0x4f;
		bytes[1] = 0x11; // 2-byte integer length
		bytes[2] = (len >> 8) & 0xff;
		bytes[3] = len & 0xff;
		bytes.set(dataBytes, 4);
		return bytes;
	};

	// Object 0: Root Dict (2 pairs: WebMainResource, WebSubresources)
	// Keys: [makeString("WebMainResource"), makeString("WebSubresources")]
	// Values: [ref to MainResourceDict, ref to SubresourcesArray]
	// Marker: 0xD2 (Dict with 2 entries), followed by key refs (1 byte each) and val refs (1 byte each)
	// Let's lay out all objects and assign indexes:
	// Obj 0: Root Dict -> refs: keys [1, 2], vals [3, 4]
	// Obj 1: String "WebMainResource"
	// Obj 2: String "WebSubresources"
	// Obj 3: Dict MainResource -> keys [5, 6, 7], vals [8, 9, 10]
	// Obj 4: Array Subresources -> [11]
	// Obj 5: String "WebResourceData"
	// Obj 6: String "WebResourceURL"
	// Obj 7: String "WebResourceMIMEType"
	// Obj 8: Data (HTML)
	// Obj 9: String "https://example.com/page.html"
	// Obj 10: String "text/html"
	// Obj 11: Dict ImageResource -> keys [5, 6, 7], vals [12, 13, 14]
	// Obj 12: Data (PNG bytes)
	// Obj 13: String "https://example.com/logo.png"
	// Obj 14: String "image/png"

	const htmlStr =
		'<html><head><title>Test</title></head><body><h1>Hello World</h1><img src="https://example.com/logo.png"></body></html>';
	const htmlBytes = new TextEncoder().encode(htmlStr);
	const pngBytes = new Uint8Array([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);

	// Obj 0: Root Dict
	objects.push(new Uint8Array([0xd2, 1, 2, 3, 4]));
	// Obj 1
	objects.push(makeString("WebMainResource"));
	// Obj 2
	objects.push(makeString("WebSubresources"));
	// Obj 3: MainResource Dict
	objects.push(new Uint8Array([0xd3, 5, 6, 7, 8, 9, 10]));
	// Obj 4: Array Subresources (1 item -> Obj 11)
	objects.push(new Uint8Array([0xa1, 11]));
	// Obj 5
	objects.push(makeString("WebResourceData"));
	// Obj 6
	objects.push(makeString("WebResourceURL"));
	// Obj 7
	objects.push(makeString("WebResourceMIMEType"));
	// Obj 8: HTML Data
	objects.push(makeData(htmlBytes));
	// Obj 9
	objects.push(makeString("https://example.com/page.html"));
	// Obj 10
	objects.push(makeString("text/html"));
	// Obj 11: ImageResource Dict
	objects.push(new Uint8Array([0xd3, 5, 6, 7, 12, 13, 14]));
	// Obj 12: PNG Data
	objects.push(makeData(pngBytes));
	// Obj 13
	objects.push(makeString("https://example.com/logo.png"));
	// Obj 14
	objects.push(makeString("image/png"));

	// Calculate object offsets
	const offsets: number[] = [];
	let currentOffset = 8; // Header "bplist00" is 8 bytes
	for (const obj of objects) {
		offsets.push(currentOffset);
		currentOffset += obj.length;
	}

	const offsetTableStart = currentOffset;
	const offsetTableSize = offsets.length * 2; // 2 bytes per offset
	const totalSize = offsetTableStart + offsetTableSize + 32;

	const fullBytes = new Uint8Array(totalSize);
	const view = new DataView(fullBytes.buffer);

	// Header: "bplist00"
	const magic = "bplist00";
	for (let i = 0; i < 8; i++) fullBytes[i] = magic.charCodeAt(i);

	// Objects
	let pos = 8;
	for (const obj of objects) {
		fullBytes.set(obj, pos);
		pos += obj.length;
	}

	// Offset Table (uint16 BE)
	for (let i = 0; i < offsets.length; i++) {
		view.setUint16(offsetTableStart + i * 2, offsets[i] ?? 0, false);
	}

	// 32-byte Trailer at (totalSize - 32)
	const trailerPos = totalSize - 32;
	// bytes 0-5: unused (0)
	fullBytes[trailerPos + 6] = 2; // offsetIntSize = 2
	fullBytes[trailerPos + 7] = 1; // objectRefSize = 1
	// numObjects (uint64 BE)
	view.setUint32(trailerPos + 8, 0, false);
	view.setUint32(trailerPos + 12, objects.length, false);
	// topObject (uint64 BE = 0)
	view.setUint32(trailerPos + 16, 0, false);
	view.setUint32(trailerPos + 20, 0, false);
	// offsetTableOffset (uint64 BE)
	view.setUint32(trailerPos + 24, 0, false);
	view.setUint32(trailerPos + 28, offsetTableStart, false);

	return fullBytes;
}

describe("webArchiveToHtmlEngine & WebArchive Parser", () => {
	it("probes successfully", async () => {
		const supported = await webArchiveToHtmlEngine.probe();
		expect(supported).toBe(true);
	});

	it("parses binary WebArchive and inlines subresources as Data URLs", () => {
		const webarchiveBytes = buildMockWebArchive();
		const result = parseWebArchive(webarchiveBytes);

		expect(result.mainResource).toBeDefined();
		expect(result.mainResource.mimeType).toBe("text/html");
		expect(result.mainResource.url).toBe("https://example.com/page.html");

		expect(result.subresources).toHaveLength(1);
		const [sub] = result.subresources;
		expect(sub).toBeDefined();
		if (!sub) return;
		expect(sub.mimeType).toBe("image/png");
		expect(sub.url).toBe("https://example.com/logo.png");

		// HTML verification
		expect(result.standaloneHtml).toContain("Hello World");
		expect(result.standaloneHtml).toContain("data:image/png;base64,");
		// The original remote URL in <img src="..."> should be replaced with the data URL
		expect(result.standaloneHtml).not.toContain(
			'src="https://example.com/logo.png"',
		);
		expect(result.standaloneHtml).toContain('src="data:image/png;base64,');
	});

	it("runs end-to-end via engine producing valid HTML ArrayBuffer", async () => {
		const webarchiveBytes = buildMockWebArchive();
		const progress: string[] = [];

		const result = await webArchiveToHtmlEngine.run(
			webarchiveBytes.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const htmlText = new TextDecoder("utf-8").decode(result);
		expect(htmlText).toContain("<h1>Hello World</h1>");
		expect(htmlText).toContain("data:image/png;base64,");

		expect(progress).toContain("PARSING_WEBARCHIVE");
		expect(progress).toContain("INLINING_RESOURCES");
		expect(progress).toContain("DONE");
	});

	it("rejects non-bplist files", () => {
		const invalid = new TextEncoder().encode("Not a bplist00 file!");
		expect(() => parseWebArchive(invalid)).toThrow(/Invalid bplist/i);
	});
});
