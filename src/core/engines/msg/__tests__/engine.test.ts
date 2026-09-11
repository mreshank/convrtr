import { describe, expect, it } from "vitest";
import { msgToEmlEngine } from "../index";

function buildMockMsg(subject: string, body: string): Uint8Array {
	const sectorSize = 512;
	// Header (512) + Sector 0 (FAT: 512) + Sector 1 (Dir: 512) + Sector 2 (Subj: 512) + Sector 3 (Body: 512)
	const totalSize = sectorSize * 5;
	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	// OLE magic
	u8.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
	view.setUint16(30, 9, true); // sector shift 9 = 512
	view.setUint16(32, 6, true); // mini sector shift 6 = 64
	view.setUint32(44, 1, true); // 1 FAT sector
	view.setUint32(48, 1, true); // Dir starts at sector 1
	view.setUint32(60, 0xfffffffe, true); // No mini FAT
	view.setUint32(76, 0, true); // FAT sector is sector 0

	// Sector 0: FAT (byte offset 512)
	const fatOffset = 512;
	view.setUint32(fatOffset + 0 * 4, 0xfffffffd, true); // FAT[0] = FAT sector
	view.setUint32(fatOffset + 1 * 4, 0xfffffffe, true); // FAT[1] = Dir end of chain
	view.setUint32(fatOffset + 2 * 4, 0xfffffffe, true); // FAT[2] = Subj end of chain
	view.setUint32(fatOffset + 3 * 4, 0xfffffffe, true); // FAT[3] = Body end of chain

	// Sector 1: Directory (byte offset 1024)
	const dirOffset = 1024;

	// Entry 0: Root Entry
	const rootName = "Root Entry\0";
	for (let i = 0; i < rootName.length; i++) {
		view.setUint16(dirOffset + i * 2, rootName.charCodeAt(i), true);
	}
	view.setUint16(dirOffset + 64, rootName.length * 2, true);
	u8[dirOffset + 66] = 5; // Root storage
	view.setUint32(dirOffset + 116, 0xfffffffe, true);

	// Entry 1: Subject stream __substg1.0_0037001E
	const entry1Offset = dirOffset + 128;
	const subjName = "__substg1.0_0037001E\0";
	for (let i = 0; i < subjName.length; i++) {
		view.setUint16(entry1Offset + i * 2, subjName.charCodeAt(i), true);
	}
	view.setUint16(entry1Offset + 64, subjName.length * 2, true);
	u8[entry1Offset + 66] = 2; // Stream
	view.setUint32(entry1Offset + 116, 2, true); // Sector 2
	const subjBytes = new TextEncoder().encode(subject);
	view.setUint32(entry1Offset + 120, subjBytes.length, true);

	// Entry 2: Body stream __substg1.0_1000001E
	const entry2Offset = dirOffset + 256;
	const bodyName = "__substg1.0_1000001E\0";
	for (let i = 0; i < bodyName.length; i++) {
		view.setUint16(entry2Offset + i * 2, bodyName.charCodeAt(i), true);
	}
	view.setUint16(entry2Offset + 64, bodyName.length * 2, true);
	u8[entry2Offset + 66] = 2; // Stream
	view.setUint32(entry2Offset + 116, 3, true); // Sector 3
	const bodyBytes = new TextEncoder().encode(body);
	view.setUint32(entry2Offset + 120, bodyBytes.length, true);

	// Sector 2: Subject payload (offset 512 * 3 = 1536)
	u8.set(subjBytes, 1536);

	// Sector 3: Body payload (offset 512 * 4 = 2048)
	u8.set(bodyBytes, 2048);

	return u8;
}

describe("msgToEmlEngine", () => {
	it("probes successfully", async () => {
		expect(await msgToEmlEngine.probe()).toBe(true);
	});

	it("converts Outlook .msg file to RFC 822 .eml document", async () => {
		const mock = buildMockMsg(
			"Urgent Project Update",
			"The quarterly conversion report is ready.",
		);
		const result = await msgToEmlEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const emlText = new TextDecoder().decode(result);

		expect(emlText).toContain("Subject: Urgent Project Update");
		expect(emlText).toContain("The quarterly conversion report is ready.");
		expect(emlText).toContain("MIME-Version: 1.0");
		expect(emlText).toContain("Content-Type: multipart/mixed;");
	});

	it("rejects non-CFB files or truncated inputs", async () => {
		const tooSmall = new Uint8Array([1, 2, 3]);
		await expect(
			msgToEmlEngine.run(tooSmall.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/too small/i);

		const invalidMagic = new Uint8Array(600).fill(0x55);
		await expect(
			msgToEmlEngine.run(invalidMagic.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/Not a valid Microsoft Compound File/i);
	});
});
