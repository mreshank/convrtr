import { unzipSync, zipSync } from "fflate";
import { encodeRgbaToPng } from "../dds/parser";

export interface BspMetadata {
	engineType: "source" | "goldsrc" | "quake" | "unknown";
	formatName: string;
	version: number;
	extractedFilesCount: number;
	assetNames: string[];
	zipBytes: Uint8Array;
}

interface LumpSource {
	offset: number;
	length: number;
	version: number;
	fourCC: number;
}

interface LumpGoldSrc {
	offset: number;
	length: number;
}

/**
 * Parses Valve Source (VBSP), GoldSrc (v30), and idTech (Q1/Q2/Q3) BSP game maps
 * and extracts all embedded custom textures, materials, models, scripts, and entities into a ZIP archive.
 */
export function parseBsp(fileBytes: Uint8Array): BspMetadata {
	if (fileBytes.length < 128) {
		throw new Error(
			"Invalid BSP file: Size is too small to contain a valid map header.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const magic0 = fileBytes[0] ?? 0;
	const magic1 = fileBytes[1] ?? 0;
	const magic2 = fileBytes[2] ?? 0;
	const magic3 = fileBytes[3] ?? 0;

	const magicStr = String.fromCharCode(magic0, magic1, magic2, magic3);
	let version = view.getInt32(4, true);

	const outputFiles: Record<string, Uint8Array> = {};
	let engineType: "source" | "goldsrc" | "quake" | "unknown" = "unknown";
	let formatName = "Unknown BSP";
	const assetNames: string[] = [];

	if (magicStr === "VBSP") {
		// Source Engine BSP (VBSP)
		engineType = "source";
		formatName = `Valve Source Engine BSP (v${version})`;

		const HEADER_LUMPS = 64;
		const LUMP_ENTITIES = 0;
		const LUMP_PAKFILE = 40;

		const lumps: LumpSource[] = [];
		let lumpOffset = 8;
		for (let i = 0; i < HEADER_LUMPS; i++) {
			if (lumpOffset + 16 > fileBytes.length) {
				break;
			}
			lumps.push({
				offset: view.getInt32(lumpOffset, true),
				length: view.getInt32(lumpOffset + 4, true),
				version: view.getInt32(lumpOffset + 8, true),
				fourCC: view.getInt32(lumpOffset + 12, true),
			});
			lumpOffset += 16;
		}

		// 1. Extract Lump 40: LUMP_PAKFILE (PKZIP archive containing custom materials/models/textures)
		const pakLump = lumps[LUMP_PAKFILE];
		if (pakLump && pakLump.length > 0) {
			const pakStart = pakLump.offset;
			const pakEnd = pakStart + pakLump.length;
			if (pakStart >= 0 && pakEnd <= fileBytes.length) {
				const pakBytes = fileBytes.subarray(pakStart, pakEnd);
				// Check if it starts with PK zip signature
				if (
					pakBytes.length >= 4 &&
					pakBytes[0] === 0x50 &&
					pakBytes[1] === 0x4b
				) {
					try {
						const unzipped = unzipSync(pakBytes);
						for (const [rawPath, content] of Object.entries(unzipped)) {
							// Normalize zip paths
							const normalized = rawPath.replace(/\\/g, "/");
							outputFiles[normalized] = content;
							assetNames.push(normalized);
						}
					} catch {
						// Fallback: save pakfile as standalone zip
						outputFiles["pakfile.zip"] = pakBytes;
						assetNames.push("pakfile.zip");
					}
				} else {
					outputFiles["pakfile.bin"] = pakBytes;
					assetNames.push("pakfile.bin");
				}
			}
		}

		// 2. Extract Lump 0: LUMP_ENTITIES (Text entity specifications)
		const entLump = lumps[LUMP_ENTITIES];
		if (entLump && entLump.length > 0) {
			const entStart = entLump.offset;
			const entEnd = entStart + entLump.length;
			if (entStart >= 0 && entEnd <= fileBytes.length) {
				const entBytes = fileBytes.subarray(entStart, entEnd);
				outputFiles["maps/entities.txt"] = entBytes;
				assetNames.push("maps/entities.txt");
			}
		}
	} else if (view.getInt32(0, true) === 30 || view.getInt32(0, true) === 29) {
		// GoldSrc (v30) or Quake 1 (v29)
		const bspVer = view.getInt32(0, true);
		version = bspVer;
		engineType = bspVer === 30 ? "goldsrc" : "quake";
		formatName =
			bspVer === 30
				? "GoldSrc Engine BSP (Half-Life 1 / CS 1.6)"
				: "Quake 1 Engine BSP";

		const HEADER_LUMPS = 15;
		const LUMP_ENTITIES = 0;
		const LUMP_TEXTURES = 2;

		const lumps: LumpGoldSrc[] = [];
		let lumpOffset = 4;
		for (let i = 0; i < HEADER_LUMPS; i++) {
			if (lumpOffset + 8 > fileBytes.length) {
				break;
			}
			lumps.push({
				offset: view.getInt32(lumpOffset, true),
				length: view.getInt32(lumpOffset + 4, true),
			});
			lumpOffset += 8;
		}

		// 1. Extract Lump 0: LUMP_ENTITIES
		const entLump = lumps[LUMP_ENTITIES];
		if (entLump && entLump.length > 0) {
			const entStart = entLump.offset;
			const entEnd = entStart + entLump.length;
			if (entStart >= 0 && entEnd <= fileBytes.length) {
				outputFiles["maps/entities.txt"] = fileBytes.subarray(entStart, entEnd);
				assetNames.push("maps/entities.txt");
			}
		}

		// 2. Extract Lump 2: Embedded Miptex Textures
		const texLump = lumps[LUMP_TEXTURES];
		if (texLump && texLump.length > 4) {
			const texBase = texLump.offset;
			const numTextures = view.getUint32(texBase, true);

			for (let i = 0; i < numTextures; i++) {
				const offsetPos = texBase + 4 + i * 4;
				if (offsetPos + 4 > fileBytes.length) break;

				const relativeOffset = view.getInt32(offsetPos, true);
				if (relativeOffset < 0) continue;

				const miptexOffset = texBase + relativeOffset;
				if (miptexOffset + 40 > fileBytes.length) continue;

				// Read 16-byte null-terminated texture name
				let name = "";
				for (let c = 0; c < 16; c++) {
					const byte = fileBytes[miptexOffset + c] ?? 0;
					if (byte === 0) break;
					name += String.fromCharCode(byte);
				}
				name = name.trim() || `texture_${i}`;

				const texWidth = view.getUint32(miptexOffset + 16, true);
				const texHeight = view.getUint32(miptexOffset + 20, true);
				const mip0Offset = view.getUint32(miptexOffset + 24, true);

				// If mip0Offset is 0 or exceeds lump, it was an external WAD reference
				if (mip0Offset > 0 && texWidth > 0 && texHeight > 0) {
					const dataStart = miptexOffset + mip0Offset;
					const pixelCount = texWidth * texHeight;
					const mip1Count =
						Math.floor(texWidth / 2) * Math.floor(texHeight / 2);
					const mip2Count =
						Math.floor(texWidth / 4) * Math.floor(texHeight / 4);
					const mip3Count =
						Math.floor(texWidth / 8) * Math.floor(texHeight / 8);
					const paletteOffset =
						dataStart + pixelCount + mip1Count + mip2Count + mip3Count + 2;

					if (
						dataStart + pixelCount <= fileBytes.length &&
						paletteOffset + 768 <= fileBytes.length
					) {
						// Decode 8-bit paletted texture to 32-bit RGBA PNG
						const rgba = new Uint8Array(pixelCount * 4);
						const isTransparent = name.startsWith("{");

						for (let p = 0; p < pixelCount; p++) {
							const palIndex = fileBytes[dataStart + p] ?? 0;
							const pr = fileBytes[paletteOffset + palIndex * 3] ?? 0;
							const pg = fileBytes[paletteOffset + palIndex * 3 + 1] ?? 0;
							const pb = fileBytes[paletteOffset + palIndex * 3 + 2] ?? 0;

							// If name starts with '{' and palette index is 255, it's transparent in GoldSrc
							const pa = isTransparent && palIndex === 255 ? 0 : 255;

							const dest = p * 4;
							rgba[dest] = pr;
							rgba[dest + 1] = pg;
							rgba[dest + 2] = pb;
							rgba[dest + 3] = pa;
						}

						const pngBytes = encodeRgbaToPng(texWidth, texHeight, rgba);
						const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
						const outPath = `textures/${safeName}.png`;
						outputFiles[outPath] = pngBytes;
						assetNames.push(outPath);
					}
				}
			}
		}
	} else if (magicStr === "IBSP") {
		// idTech IBSP (Quake 2 / Quake 3)
		engineType = "quake";
		formatName = `idTech IBSP (Quake 2/3 v${version})`;

		const entLumpOffset = view.getInt32(8, true);
		const entLumpLength = view.getInt32(12, true);
		if (
			entLumpOffset > 0 &&
			entLumpLength > 0 &&
			entLumpOffset + entLumpLength <= fileBytes.length
		) {
			outputFiles["maps/entities.txt"] = fileBytes.subarray(
				entLumpOffset,
				entLumpOffset + entLumpLength,
			);
			assetNames.push("maps/entities.txt");
		}
	} else {
		throw new Error(
			`Unrecognized or unsupported BSP format (magic: '${magicStr}', version: ${version}). Supported formats: Valve Source (VBSP), GoldSrc (v30), Quake 1 (v29), and idTech (IBSP).`,
		);
	}

	// Generate MAP_MANIFEST.md report
	const manifestContent = [
		"# BSP Map Asset Manifest",
		"",
		`**Engine / Format:** ${formatName}`,
		`**BSP Version:** ${version}`,
		`**Extracted Assets:** ${assetNames.length} items`,
		"",
		"## Extracted Files",
		assetNames.length > 0
			? assetNames.map((n) => `- ${n}`).join("\n")
			: "*No embedded custom textures or pakfile assets found in this map.*",
		"",
		"## Asset Usage Instructions",
		"- **Source VBSP:** Materials (`.vmt` / `.vtf`) and models (`.mdl`) can be opened directly with VTFEdit, Crowbar, Blender (SourceIO addon), SFM, or Hammer.",
		"- **GoldSrc Textures:** Extracted textures are lossless 32-bit PNG images with transparency enabled for masked textures (`{...`). Ready for trenchbroom, J.A.C.K., or modern 3D engines.",
		"- **Entities:** `maps/entities.txt` contains the raw level entity definitions (spawns, lights, triggers, targets).",
		"",
		"---",
		"Extracted cleanly in-browser via convrtr (Zero-Server Guarantee).",
	].join("\n");

	outputFiles["MAP_MANIFEST.md"] = new TextEncoder().encode(manifestContent);

	const zipBytes = zipSync(outputFiles, { level: 6 });

	return {
		engineType,
		formatName,
		version,
		extractedFilesCount: assetNames.length,
		assetNames,
		zipBytes,
	};
}

/**
 * Main conversion entry point for BSP map file asset extraction.
 */
export function convertBspToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading BSP map header & lump directory...");
	const bytes = new Uint8Array(input);
	const parsed = parseBsp(bytes);

	onProgress?.(
		0.6,
		`Extracted ${parsed.extractedFilesCount} assets from ${parsed.formatName}...`,
	);
	onProgress?.(0.9, "Compressing extracted assets into ZIP package...");

	onProgress?.(1.0, "Complete");
	return parsed.zipBytes.buffer.slice(
		parsed.zipBytes.byteOffset,
		parsed.zipBytes.byteOffset + parsed.zipBytes.byteLength,
	) as ArrayBuffer;
}
