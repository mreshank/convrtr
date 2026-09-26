import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertPsuToZip, parsePsuContainer } from "../parser";

function makeSyntheticPsu(): Uint8Array {
	// 512 (dir) + 512 (.) + 512 (..) + (512 + 1024 for icon.sys) + (512 + 1024 for save.bin) = 4096 bytes
	const buffer = new Uint8Array(4096);
	const view = new DataView(buffer.buffer);

	// 1. Root directory entry (offset 0)
	view.setUint16(0, 0x2784, true); // Directory
	view.setUint32(4, 2, true); // 2 files
	// Created date: 45s, 30m, 12h, 26d, 10m, 2004y
	buffer[8] = 45;
	buffer[9] = 30;
	buffer[10] = 12;
	buffer[11] = 26;
	buffer[12] = 10;
	view.setUint16(13, 2004, true);

	// Name: "BASLUS-20000GTA"
	buffer.set(new TextEncoder().encode("BASLUS-20000GTA"), 0x40);

	// 2. "." entry (offset 512)
	view.setUint16(512, 0x2784, true);
	buffer.set(new TextEncoder().encode("."), 512 + 0x40);

	// 3. ".." entry (offset 1024)
	view.setUint16(1024, 0x2784, true);
	buffer.set(new TextEncoder().encode(".."), 1024 + 0x40);

	// 4. File 1: "icon.sys" (offset 1536)
	view.setUint16(1536, 0x8497, true); // File
	view.setUint32(1536 + 4, 128, true); // 128 bytes size
	buffer.set(new TextEncoder().encode("icon.sys"), 1536 + 0x40);
	// Payload at 1536 + 512 = 2048 (128 bytes)
	for (let i = 0; i < 128; i++) buffer[2048 + i] = 0xaa;

	// 5. File 2: "save.bin" (offset 2048 + 1024 = 3072)
	view.setUint16(3072, 0x8497, true); // File
	view.setUint32(3072 + 4, 64, true); // 64 bytes size
	buffer.set(new TextEncoder().encode("save.bin"), 3072 + 0x40);
	// Payload at 3072 + 512 = 3584 (64 bytes)
	for (let i = 0; i < 64; i++) buffer[3584 + i] = 0xbb;

	return buffer;
}

describe("PlayStation 2 EMS / uLaunchELF Save Container Carver", () => {
	it("parses directory name, timestamps, and files", () => {
		const raw = makeSyntheticPsu();
		const info = parsePsuContainer(raw);

		expect(info.directoryName).toBe("BASLUS-20000GTA");
		expect(info.createdIso).toContain("2004-10-26");
		expect(info.files).toHaveLength(2);

		const iconSys = info.files[0];
		expect(iconSys).toBeDefined();
		if (iconSys) {
			expect(iconSys.name).toBe("icon.sys");
			expect(iconSys.size).toBe(128);
			expect(iconSys.data).toHaveLength(128);
		}

		const saveBin = info.files[1];
		expect(saveBin).toBeDefined();
		if (saveBin) {
			expect(saveBin.name).toBe("save.bin");
			expect(saveBin.size).toBe(64);
			expect(saveBin.data).toHaveLength(64);
		}
	});

	it("exports structured manifest JSON when requested", () => {
		const raw = makeSyntheticPsu();
		const zipBytes = convertPsuToZip(raw, { json: true });
		const parsed = JSON.parse(new TextDecoder("utf-8").decode(zipBytes));

		expect(parsed.directoryName).toBe("BASLUS-20000GTA");
		expect(parsed.totalFiles).toBe(2);
		expect(parsed.files[0].name).toBe("icon.sys");
		expect(parsed.files[1].name).toBe("save.bin");
	});

	it("carves files into a valid ZIP archive preserving folder structure", () => {
		const raw = makeSyntheticPsu();
		const zipBuffer = convertPsuToZip(raw);
		expect(zipBuffer.length).toBeGreaterThan(0);

		const unzipped = unzipSync(zipBuffer);
		expect(unzipped["BASLUS-20000GTA/icon.sys"]).toBeDefined();
		expect(unzipped["BASLUS-20000GTA/save.bin"]).toBeDefined();
		expect(unzipped["manifest.json"]).toBeDefined();
		expect(unzipped["README.md"]).toBeDefined();
	});
});
