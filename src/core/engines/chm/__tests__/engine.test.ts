import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { chmToZipEngine } from "../index";
import { parseChm, readEncInt } from "../parser";

function writeEncInt(val: number): Uint8Array {
	if (val < 128) {
		return new Uint8Array([val]);
	}
	const bytes: number[] = [];
	let temp = val;
	bytes.push(temp & 0x7f);
	temp >>>= 7;
	while (temp > 0) {
		bytes.unshift(0x80 | (temp & 0x7f));
		temp >>>= 7;
	}
	return new Uint8Array(bytes);
}

describe("Microsoft Compiled HTML Help (CHM) Parser & Engine", () => {
	it("reads ENCINT variable length encoded numbers accurately", () => {
		expect(readEncInt(new Uint8Array([0]), { pos: 0 })).toBe(0);
		expect(readEncInt(new Uint8Array([42]), { pos: 0 })).toBe(42);
		expect(readEncInt(new Uint8Array([127]), { pos: 0 })).toBe(127);
		// 128 in ENCINT: 0x81, 0x00 -> (1 << 7) | 0 = 128
		expect(readEncInt(new Uint8Array([0x81, 0x00]), { pos: 0 })).toBe(128);
	});

	it("parses valid ITSF CHM file and extracts uncompressed HTML articles", () => {
		const htmlContent = "<html><body><h1>User Manual</h1></body></html>";
		const htmlBytes = new TextEncoder().encode(htmlContent);

		const cssContent = "body { color: black; }";
		const cssBytes = new TextEncoder().encode(cssContent);

		const totalDataLength = htmlBytes.length + cssBytes.length;

		// Layout offsets:
		// 0..95: ITSF header (96 bytes)
		// 96..179: ITSP directory header (84 bytes)
		// 180..435: PMGL chunk (256 bytes)
		// 500..500 + totalDataLength: Data stream
		const itsfHeaderLen = 96;
		const itspHeaderLen = 84;
		const blockLen = 256;
		const dirOffset = itsfHeaderLen;
		const pmglOffset = dirOffset + itspHeaderLen;
		const dataOffset = 500;

		const totalFileSize = dataOffset + totalDataLength;
		const fileBytes = new Uint8Array(totalFileSize);
		const view = new DataView(fileBytes.buffer);

		// 1. ITSF Header
		fileBytes[0] = 0x49; // 'I'
		fileBytes[1] = 0x54; // 'T'
		fileBytes[2] = 0x53; // 'S'
		fileBytes[3] = 0x46; // 'F'
		view.setInt32(4, 3, true); // Version 3
		view.setInt32(8, itsfHeaderLen, true);
		// Directory offset (dirOffset = 96)
		view.setUint32(56, dirOffset, true);
		view.setUint32(60, 0, true);
		// Data offset (dataOffset = 500)
		view.setUint32(72, dataOffset, true);
		view.setUint32(76, 0, true);

		// 2. ITSP Header at dirOffset (96)
		fileBytes[dirOffset] = 0x49; // 'I'
		fileBytes[dirOffset + 1] = 0x54; // 'T'
		fileBytes[dirOffset + 2] = 0x53; // 'S'
		fileBytes[dirOffset + 3] = 0x50; // 'P'
		view.setInt32(dirOffset + 4, 1, true); // Version 1
		view.setInt32(dirOffset + 8, itspHeaderLen, true); // Header len 84
		view.setUint32(dirOffset + 16, blockLen, true); // Block len 256
		view.setInt32(dirOffset + 32, 0, true); // First PMGL = 0
		view.setInt32(dirOffset + 36, 0, true); // Last PMGL = 0
		view.setUint32(dirOffset + 44, 1, true); // Num blocks = 1

		// 3. PMGL block at pmglOffset (180)
		fileBytes[pmglOffset] = 0x50; // 'P'
		fileBytes[pmglOffset + 1] = 0x4d; // 'M'
		fileBytes[pmglOffset + 2] = 0x47; // 'G'
		fileBytes[pmglOffset + 3] = 0x4c; // 'L'
		view.setUint32(pmglOffset + 4, 20, true); // free space = 20

		// Write entries starting at pmglOffset + 20
		let curPos = pmglOffset + 20;

		// Entry 1: "/index.html", section 0, offset 0, length htmlBytes.length
		const name1 = new TextEncoder().encode("/index.html");
		fileBytes.set(writeEncInt(name1.length), curPos);
		curPos += writeEncInt(name1.length).length;
		fileBytes.set(name1, curPos);
		curPos += name1.length;
		fileBytes.set(writeEncInt(0), curPos); // section 0
		curPos += 1;
		fileBytes.set(writeEncInt(0), curPos); // offset 0
		curPos += 1;
		fileBytes.set(writeEncInt(htmlBytes.length), curPos); // length
		curPos += writeEncInt(htmlBytes.length).length;

		// Entry 2: "/style.css", section 0, offset htmlBytes.length, length cssBytes.length
		const name2 = new TextEncoder().encode("/style.css");
		fileBytes.set(writeEncInt(name2.length), curPos);
		curPos += writeEncInt(name2.length).length;
		fileBytes.set(name2, curPos);
		curPos += name2.length;
		fileBytes.set(writeEncInt(0), curPos); // section 0
		curPos += 1;
		fileBytes.set(writeEncInt(htmlBytes.length), curPos); // offset
		curPos += writeEncInt(htmlBytes.length).length;
		fileBytes.set(writeEncInt(cssBytes.length), curPos); // length
		curPos += writeEncInt(cssBytes.length).length;

		// 4. Data stream at dataOffset (500)
		fileBytes.set(htmlBytes, dataOffset);
		fileBytes.set(cssBytes, dataOffset + htmlBytes.length);

		const result = parseChm(fileBytes);
		expect(result.version).toBe(3);
		expect(result.extractedFilesCount).toBe(2);

		const unzipped = unzipSync(result.zipBytes);
		expect(unzipped["index.html"]).toBeDefined();
		expect(unzipped["style.css"]).toBeDefined();
		expect(unzipped["CHM_MANIFEST.md"]).toBeDefined();

		const htmlStr = new TextDecoder().decode(
			unzipped["index.html"] as Uint8Array,
		);
		expect(htmlStr).toContain("User Manual");

		const cssStr = new TextDecoder().decode(
			unzipped["style.css"] as Uint8Array,
		);
		expect(cssStr).toContain("color: black;");
	});

	it("throws on invalid ITSF magic signature", () => {
		const badBytes = new Uint8Array(120);
		expect(() => parseChm(badBytes)).toThrow(/Expected 'ITSF'/);
	});

	it("runs conversion through chmToZipEngine", async () => {
		// Mock minimal valid ITSF file with 0 entries
		const fileBytes = new Uint8Array(300);
		fileBytes[0] = 0x49;
		fileBytes[1] = 0x54;
		fileBytes[2] = 0x53;
		fileBytes[3] = 0x46;
		const view = new DataView(fileBytes.buffer);
		view.setInt32(4, 3, true);
		view.setInt32(8, 96, true);
		view.setUint32(56, 96, true); // dir offset 96
		view.setUint32(72, 200, true); // data offset 200

		// ITSP
		fileBytes[96] = 0x49;
		fileBytes[97] = 0x54;
		fileBytes[98] = 0x53;
		fileBytes[99] = 0x50;
		view.setInt32(96 + 8, 84, true);
		view.setUint32(96 + 16, 100, true);

		expect(await chmToZipEngine.probe()).toBe(true);

		let progress = 0;
		const outputBuffer = await chmToZipEngine.run(
			fileBytes.buffer as ArrayBuffer,
			{},
			(p) => {
				progress = p;
			},
		);

		expect(progress).toBe(1.0);
		const unzipped = unzipSync(new Uint8Array(outputBuffer));
		expect(unzipped["CHM_MANIFEST.md"]).toBeDefined();
	});
});
