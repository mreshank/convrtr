import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { bspToZipEngine } from "../index";
import { parseBsp } from "../parser";

describe("Valve BSP Map Parser & Engine", () => {
	it("parses Source Engine VBSP map and extracts embedded pakfile ZIP", () => {
		// Create a mock pakfile ZIP containing a material and model file
		const innerFiles: Record<string, Uint8Array> = {
			"materials/models/props/crate.vmt": new TextEncoder().encode(
				`"VertexLitGeneric" { "$basetexture" "models/props/crate" }`,
			),
			"models/props/crate.mdl": new Uint8Array([0x49, 0x44, 0x53, 0x54, 48]), // IDST header
		};
		const innerPakZip = zipSync(innerFiles);

		// Build a minimal VBSP header: 8 bytes magic + version, followed by 64 lumps (16 bytes each = 1024 bytes)
		const headerSize = 8 + 64 * 16;
		const entitiesText = new TextEncoder().encode(
			'{\n"classname" "worldspawn"\n"skyname" "sky_day01_01"\n}\n',
		);

		const entOffset = headerSize;
		const entLength = entitiesText.length;

		const pakOffset = entOffset + entLength;
		const pakLength = innerPakZip.length;

		const bspBytes = new Uint8Array(pakOffset + pakLength);
		const view = new DataView(bspBytes.buffer);

		// Magic "VBSP"
		bspBytes[0] = 0x56;
		bspBytes[1] = 0x42;
		bspBytes[2] = 0x53;
		bspBytes[3] = 0x50;
		// Version 20 (Half-Life 2 / TF2)
		view.setInt32(4, 20, true);

		// Lump 0 (LUMP_ENTITIES): offset 8 in header
		view.setInt32(8, entOffset, true);
		view.setInt32(12, entLength, true);

		// Lump 40 (LUMP_PAKFILE): offset 8 + 40 * 16 = 648
		const lump40Offset = 8 + 40 * 16;
		view.setInt32(lump40Offset, pakOffset, true);
		view.setInt32(lump40Offset + 4, pakLength, true);

		// Copy lump contents
		bspBytes.set(entitiesText, entOffset);
		bspBytes.set(innerPakZip, pakOffset);

		const result = parseBsp(bspBytes);
		expect(result.engineType).toBe("source");
		expect(result.version).toBe(20);
		expect(result.extractedFilesCount).toBe(3); // 2 inner files + entities.txt

		// Check output zip
		const unzipped = unzipSync(result.zipBytes);
		expect(unzipped["materials/models/props/crate.vmt"]).toBeDefined();
		expect(unzipped["models/props/crate.mdl"]).toBeDefined();
		expect(unzipped["maps/entities.txt"]).toBeDefined();
		expect(unzipped["MAP_MANIFEST.md"]).toBeDefined();

		const manifestText = new TextDecoder().decode(
			unzipped["MAP_MANIFEST.md"] as Uint8Array,
		);
		expect(manifestText).toContain("Valve Source Engine BSP (v20)");
		expect(manifestText).toContain("crate.vmt");
	});

	it("parses GoldSrc Engine (v30) BSP map and extracts embedded textures", () => {
		// Header size: 4 bytes version + 15 lumps * 8 bytes = 124 bytes
		const headerSize = 124;

		// Entities lump
		const entitiesText = new TextEncoder().encode(
			'{\n"classname" "info_player_start"\n"origin" "0 0 0"\n}\n',
		);
		const entOffset = headerSize;
		const entLength = entitiesText.length;

		// Miptex texture lump
		const texLumpOffset = entOffset + entLength;

		// Construct 1 texture: 4x4 pixels, paletted, name "{glass" (masked transparent)
		const texWidth = 4;
		const texHeight = 4;
		const pixelCount = 16; // 4x4
		const mip1 = 4; // 2x2
		const mip2 = 1; // 1x1
		const mip3 = 0;

		const miptexStructSize = 40;
		const dataStart = miptexStructSize;
		const paletteOffset = dataStart + pixelCount + mip1 + mip2 + mip3 + 2;
		const texEntryTotal = paletteOffset + 768; // 256 * 3 palette

		// Texture lump has: 4 bytes numTextures (1) + 4 bytes relative offset + texEntryTotal
		const texLumpLength = 8 + texEntryTotal;

		const bspBytes = new Uint8Array(texLumpOffset + texLumpLength);
		const view = new DataView(bspBytes.buffer);

		// GoldSrc version 30
		view.setInt32(0, 30, true);

		// Lump 0 (Entities)
		view.setInt32(4, entOffset, true);
		view.setInt32(8, entLength, true);

		// Lump 2 (Textures): offset 4 + 2 * 8 = 20
		view.setInt32(20, texLumpOffset, true);
		view.setInt32(24, texLumpLength, true);

		bspBytes.set(entitiesText, entOffset);

		// Fill texture lump
		view.setUint32(texLumpOffset, 1, true); // 1 texture
		view.setInt32(texLumpOffset + 4, 8, true); // relative offset = 8

		const miptexAbs = texLumpOffset + 8;
		// Write name "{glass"
		const nameBytes = new TextEncoder().encode("{glass");
		bspBytes.set(nameBytes, miptexAbs);

		view.setUint32(miptexAbs + 16, texWidth, true);
		view.setUint32(miptexAbs + 20, texHeight, true);
		view.setUint32(miptexAbs + 24, mip0Offset(), true); // offset to mip 0

		function mip0Offset() {
			return 40;
		}

		// Fill palette: 256 colors of 3 bytes (R, G, B)
		// Color 0: (200, 200, 200)
		// Color 255: (0, 0, 255) - transparent blue in GoldSrc
		const palAbs = miptexAbs + paletteOffset;
		bspBytes[palAbs] = 200;
		bspBytes[palAbs + 1] = 200;
		bspBytes[palAbs + 2] = 200;

		bspBytes[palAbs + 255 * 3] = 0;
		bspBytes[palAbs + 255 * 3 + 1] = 0;
		bspBytes[palAbs + 255 * 3 + 2] = 255;

		// Fill pixels: first 8 pixels are index 0, next 8 pixels are index 255
		for (let p = 0; p < 8; p++) {
			bspBytes[miptexAbs + dataStart + p] = 0;
		}
		for (let p = 8; p < 16; p++) {
			bspBytes[miptexAbs + dataStart + p] = 255;
		}

		const result = parseBsp(bspBytes);
		expect(result.engineType).toBe("goldsrc");
		expect(result.version).toBe(30);

		const unzipped = unzipSync(result.zipBytes);
		expect(unzipped["maps/entities.txt"]).toBeDefined();
		expect(unzipped["textures/_glass.png"]).toBeDefined();
		expect(unzipped["MAP_MANIFEST.md"]).toBeDefined();
	});

	it("throws on corrupted or unsupported magic bytes", () => {
		const badBytes = new Uint8Array(200);
		expect(() => parseBsp(badBytes)).toThrow(/Unrecognized or unsupported BSP/);
	});

	it("runs conversion through bspToZipEngine", async () => {
		// Mock minimal IBSP
		const ibspBytes = new Uint8Array(150);
		ibspBytes[0] = 0x49; // 'I'
		ibspBytes[1] = 0x42; // 'B'
		ibspBytes[2] = 0x53; // 'S'
		ibspBytes[3] = 0x50; // 'P'
		const view = new DataView(ibspBytes.buffer);
		view.setInt32(4, 38, true); // version 38
		view.setInt32(8, 100, true); // lump 0 offset
		view.setInt32(12, 20, true); // lump 0 length
		ibspBytes.set(new TextEncoder().encode("mock entity string!"), 100);

		expect(await bspToZipEngine.probe()).toBe(true);

		let progress = 0;
		const outputBuffer = await bspToZipEngine.run(
			ibspBytes.buffer as ArrayBuffer,
			{},
			(p) => {
				progress = p;
			},
		);

		expect(progress).toBe(1.0);
		expect(outputBuffer.byteLength).toBeGreaterThan(100);
		const unzipped = unzipSync(new Uint8Array(outputBuffer));
		expect(unzipped["maps/entities.txt"]).toBeDefined();
		expect(unzipped["MAP_MANIFEST.md"]).toBeDefined();
	});
});
