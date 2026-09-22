import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertIsoToZip, parseIso } from "../parser";

// ---- minimal ISO 9660 builder ----

function bothEndian32(n: number): Uint8Array {
	const out = new Uint8Array(8);
	const v = new DataView(out.buffer);
	v.setUint32(0, n, true);
	v.setUint32(4, n, false);
	return out;
}

interface PlannedFile {
	name: string;
	content: Uint8Array;
}

function makeRecord(
	location: number,
	length: number,
	flags: number,
	id: Uint8Array,
): Uint8Array {
	const rec = new Uint8Array(33 + id.length + 1);
	rec[0] = rec.length;
	rec.set(bothEndian32(location), 2);
	rec.set(bothEndian32(length), 10);
	rec[25] = flags;
	rec[32] = id.length;
	rec.set(id, 33);
	return rec;
}

function dotRecord(location: number, length: number, id: number): Uint8Array {
	const rec = new Uint8Array(34);
	rec[0] = 34;
	rec.set(bothEndian32(location), 2);
	rec.set(bothEndian32(length), 10);
	rec[25] = 0x02;
	rec[32] = 1;
	rec[33] = id;
	return rec;
}

/**
 * Builds a minimal single-track ISO 9660 image:
 *  - sector 16: Primary Volume Descriptor
 *  - sector 17: terminator
 *  - sector 18: root dir (contains the given files + the DOCS/ dir)
 *  - sector 19: DOCS/ dir (contains README.TXT = docsReadme)
 *  - sectors 20+: file data
 */
function buildIso(files: PlannedFile[], docsReadme: Uint8Array): ArrayBuffer {
	const sectorSize = 2048;
	const rootLoc = 18;
	const docsLoc = 19;
	const dataStart = 20;

	const totalFiles = files.length + 1; // +1 for DOCS/README.TXT
	const totalSectors = dataStart + totalFiles;
	const image = new Uint8Array(totalSectors * sectorSize);

	// PVD at sector 16
	const pvd = 16;
	image[pvd * sectorSize] = 0x01;
	image.set(new TextEncoder().encode("CD001"), pvd * sectorSize + 1);
	image[pvd * sectorSize + 6] = 1;
	image.set(
		new TextEncoder().encode("TESTVOLUME".padEnd(32, " ")),
		pvd * sectorSize + 40,
	);
	image.set(
		new TextEncoder().encode("convrtr-test".padEnd(128, " ")),
		pvd * sectorSize + 574,
	);
	image.set(dotRecord(rootLoc, sectorSize, 0x00), pvd * sectorSize + 156);

	// terminator at sector 17
	const term = 17;
	image[term * sectorSize] = 0xff;
	image.set(new TextEncoder().encode("CD001"), term * sectorSize + 1);
	image[term * sectorSize + 6] = 1;

	// file data, one sector each
	const rootRecords: Uint8Array[] = [
		dotRecord(rootLoc, sectorSize, 0x00),
		dotRecord(rootLoc, sectorSize, 0x01),
		makeRecord(docsLoc, sectorSize, 0x02, new TextEncoder().encode("DOCS")),
	];
	let nextSector = dataStart;
	for (const f of files) {
		image.set(f.content, nextSector * sectorSize);
		rootRecords.push(
			makeRecord(
				nextSector,
				f.content.length,
				0x00,
				new TextEncoder().encode(f.name),
			),
		);
		nextSector++;
	}
	image.set(docsReadme, nextSector * sectorSize);
	const docsRecords: Uint8Array[] = [
		dotRecord(docsLoc, sectorSize, 0x00),
		dotRecord(docsLoc, sectorSize, 0x01),
		makeRecord(
			nextSector,
			docsReadme.length,
			0x00,
			new TextEncoder().encode("README.TXT"),
		),
	];

	function packDirectory(records: Uint8Array[]): Uint8Array {
		const totalLen = records.reduce((a, r) => a + r.length, 0) + 1;
		const out = new Uint8Array(totalLen);
		let off = 0;
		for (const r of records) {
			out.set(r, off);
			off += r.length;
		}
		out[totalLen - 1] = 0; // terminating zero-length record
		return out;
	}

	const rootBytes = packDirectory(rootRecords);
	image.set(rootBytes.subarray(0, sectorSize), rootLoc * sectorSize);
	const docsBytes = packDirectory(docsRecords);
	image.set(docsBytes.subarray(0, sectorSize), docsLoc * sectorSize);

	return image.buffer.slice(
		image.byteOffset,
		image.byteOffset + image.byteLength,
	) as ArrayBuffer;
}

describe("parseIso", () => {
	it("extracts files bit-exact from a minimal ISO", () => {
		const bin = new TextEncoder().encode("\x00\x01\x02\x03 binary-ish");
		const readme = new TextEncoder().encode("hello iso\n");
		const buf = buildIso(
			[
				{ name: "FILE.BIN", content: bin },
				{ name: "DATA.TXT", content: new TextEncoder().encode("data here") },
			],
			readme,
		);
		const parsed = parseIso(new Uint8Array(buf));
		expect(parsed.volumeLabel).toBe("TESTVOLUME");
		expect(parsed.applicationId).toBe("convrtr-test");
		expect(parsed.joliet).toBe(false);
		expect(parsed.extractedFilesCount).toBe(3);

		const out = unzipSync(new Uint8Array(convertIsoToZip(buf, () => {})));
		expect(out["FILE.BIN"]).toEqual(bin);
		expect(out["DATA.TXT"]).toEqual(new TextEncoder().encode("data here"));
		expect(out["DOCS/README.TXT"]).toEqual(readme);
		expect(new TextDecoder().decode(out["_README.txt"])).toContain(
			"**Volume label:** TESTVOLUME",
		);
	});

	it("throws for a non-ISO byte blob", () => {
		const buf = new Uint8Array(20 * 2048).fill(0);
		expect(() => parseIso(buf)).toThrow(
			/No ISO 9660 Primary Volume Descriptor/,
		);
	});

	it("throws for a UDF image (NSR0 boot magic)", () => {
		const buf = new Uint8Array(20 * 2048).fill(0);
		buf.set(new TextEncoder().encode("NSR0"), 32769);
		expect(() => parseIso(buf)).toThrow(/UDF, which is out of scope/);
	});

	it("throws for a tiny non-sector blob", () => {
		const buf = new Uint8Array(100).fill(0);
		expect(() => parseIso(buf)).toThrow(/smaller than one/);
	});
});

describe("convertIsoToZip", () => {
	it("returns a zip whose _README.txt explains extraction", () => {
		const buf = buildIso(
			[{ name: "A.TXT", content: new TextEncoder().encode("a") }],
			new TextEncoder().encode("b"),
		);
		const out = unzipSync(new Uint8Array(convertIsoToZip(buf, () => {})));
		expect(out["A.TXT"]).toEqual(new TextEncoder().encode("a"));
		expect(out["DOCS/README.TXT"]).toEqual(new TextEncoder().encode("b"));
		expect(new TextDecoder().decode(out["_README.txt"])).toContain(
			"# ISO 9660 Extraction",
		);
		expect(new TextDecoder().decode(out["_README.txt"])).toMatch(
			/\*\*Files extracted:\*\* \d+/,
		);
	});
});
