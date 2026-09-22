import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { convertVms, parseVmsSave } from "../parser";

function makeSyntheticVmsSave(): Uint8Array {
	// Total size: 128 (header) + 512 (icon 1) + 512 (icon 2) + 32 (eyecatch pal) + 2016 (eyecatch data) + 64 (payload) = 3264 bytes
	const buffer = new Uint8Array(3264);
	const view = new DataView(buffer.buffer);

	// 1. Description (16 bytes)
	const desc = new TextEncoder().encode("SONIC_ADV");
	buffer.set(desc, 0);

	// 2. Comment (32 bytes)
	const comment = new TextEncoder().encode("CHAO_GARDEN_01");
	buffer.set(comment, 16);

	// 3. Creator App (16 bytes)
	const creator = new TextEncoder().encode("SONICTEAM");
	buffer.set(creator, 48);

	// 4. Header metadata
	view.setUint16(0x40, 2, true); // numIcons = 2
	view.setUint16(0x42, 10, true); // animation speed
	view.setUint16(0x44, 1, true); // eyecatchType = 1 (16-color)
	view.setUint16(0x46, 0xa5b6, true); // CRC
	view.setUint32(0x48, 64, true); // payloadSize = 64

	// 5. Palette (16 entries at 0x60)
	// Entry 0: transparent (0x0000)
	// Entry 1: Solid blue (0xF00F)
	// Entry 2: Solid yellow (0xFFF0)
	view.setUint16(0x60, 0x0000, true);
	view.setUint16(0x62, 0xf00f, true);
	view.setUint16(0x64, 0xfff0, true);

	// 6. Icon frame 1 (512 bytes at 0x80)
	// Fill with pattern
	for (let i = 0; i < 512; i++) {
		buffer[0x80 + i] = (i % 2 === 0 ? 0x12 : 0x21);
	}

	// 7. Icon frame 2 (512 bytes at 0x80 + 512)
	for (let i = 0; i < 512; i++) {
		buffer[0x80 + 512 + i] = (i % 2 === 0 ? 0x22 : 0x11);
	}

	// 8. Eyecatch (32-byte palette + 2016 bytes data at 0x80 + 1024)
	const ecOffset = 0x80 + 1024;
	view.setUint16(ecOffset, 0x0000, true);
	view.setUint16(ecOffset + 2, 0xf0f0, true); // Green
	for (let i = 0; i < 2016; i++) {
		buffer[ecOffset + 32 + i] = 0x11;
	}

	// 9. Payload (64 bytes)
	const payloadOffset = ecOffset + 32 + 2016;
	for (let i = 0; i < 64; i++) {
		buffer[payloadOffset + i] = i + 1;
	}

	return buffer;
}

describe("Dreamcast VMU Save & Icon Decoder", () => {
	it("parses header, description, comments, and icon frames", () => {
		const raw = makeSyntheticVmsSave();
		const info = parseVmsSave(raw);

		expect(info.description).toBe("SONIC_ADV");
		expect(info.comment).toBe("CHAO_GARDEN_01");
		expect(info.creatorApp).toBe("SONICTEAM");
		expect(info.numIcons).toBe(2);
		expect(info.animationSpeed).toBe(10);
		expect(info.eyecatchType).toBe(1);
		expect(info.crc).toBe(0xa5b6);
		expect(info.payloadSize).toBe(64);
		expect(info.icons).toHaveLength(2);
		expect(info.eyecatchPng).not.toBeNull();
		expect(info.payloadBytes).toHaveLength(64);
	});

	it("decodes primary icon to a valid PNG image", () => {
		const raw = makeSyntheticVmsSave();
		const pngBytes = convertVms(raw);

		expect(pngBytes.length).toBeGreaterThan(0);
		// PNG signature: 0x89 'P' 'N' 'G'
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(pngBytes[2]).toBe(0x4e);
		expect(pngBytes[3]).toBe(0x47);
	});

	it("exports structured manifest JSON when requested", () => {
		const raw = makeSyntheticVmsSave();
		const jsonBytes = convertVms(raw, { json: true });
		const parsed = JSON.parse(new TextDecoder("utf-8").decode(jsonBytes));

		expect(parsed.description).toBe("SONIC_ADV");
		expect(parsed.comment).toBe("CHAO_GARDEN_01");
		expect(parsed.numIcons).toBe(2);
		expect(parsed.hasEyecatch).toBe(true);
		expect(parsed.crcHex).toBe("0xA5B6");
	});

	it("carves icons, eyecatch, and raw save payload into ZIP package", () => {
		const raw = makeSyntheticVmsSave();
		const zipBuffer = convertVms(raw, { zip: true });
		expect(zipBuffer.length).toBeGreaterThan(0);

		const unzipped = unzipSync(zipBuffer);
		expect(unzipped["icons/icon_00.png"]).toBeDefined();
		expect(unzipped["icons/icon_01.png"]).toBeDefined();
		expect(unzipped["eyecatch.png"]).toBeDefined();
		expect(unzipped["raw/SONIC_ADV.bin"]).toBeDefined();
		expect(unzipped["manifest.json"]).toBeDefined();
		expect(unzipped["README.md"]).toBeDefined();
	});
});
