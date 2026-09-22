import { zipSync } from "fflate";
import { encodeRgbaToPng } from "../dds/parser";

export interface GciSave {
	gameCode: string;
	companyCode: string;
	filename: string;
	modTime: string;
	blockCount: number;
	comment1: string;
	comment2: string;
	dataSize: number;
	rawGci: Uint8Array;
	iconPng: Uint8Array | null;
}

const NINTENDO_COMPANIES: Record<string, string> = {
	"01": "Nintendo",
	"08": "Capcom",
	"41": "Ubisoft",
	"51": "Acclaim",
	"52": "Activision",
	"57": "LucasArts",
	"5d": "Midway",
	"64": "Lucasfilm",
	"69": "Electronic Arts",
	"70": "Atari / Infogrames",
	"78": "THQ",
	"8p": "Sega",
	"99": "Marvelous",
	a4: "Konami",
	af: "Namco",
	b2: "Bandai",
	eb: "Atlus",
};

function decodeShiftJis(bytes: Uint8Array): string {
	try {
		return new TextDecoder("shift-jis").decode(bytes).replace(/\0/g, "").trim();
	} catch {
		return new TextDecoder("latin1").decode(bytes).replace(/\0/g, "").trim();
	}
}

/**
 * Decodes a GameCube RGB5A3 16-bit big-endian color into [R, G, B, A].
 */
function decodeRgb5a3(val: number): [number, number, number, number] {
	if ((val & 0x8000) !== 0) {
		// RGB555 format (opaque)
		const r = Math.round((((val >> 10) & 0x1f) * 255) / 31);
		const g = Math.round((((val >> 5) & 0x1f) * 255) / 31);
		const b = Math.round(((val & 0x1f) * 255) / 31);
		return [r, g, b, 255];
	}
	// ARGB3444 format (translucent)
	const a = Math.round((((val >> 12) & 0x07) * 255) / 7);
	const r = Math.round((((val >> 8) & 0x0f) * 255) / 15);
	const g = Math.round((((val >> 4) & 0x0f) * 255) / 15);
	const b = Math.round(((val & 0x0f) * 255) / 15);
	return [r, g, b, a];
}

export function parseSingleGci(data: Uint8Array): GciSave {
	if (data.length < 64) {
		throw new Error("Invalid GCI file: header is smaller than 64 bytes.");
	}

	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

	// 0x00: Game code (4 bytes ASCII)
	const gameCode = new TextDecoder("ascii")
		.decode(data.subarray(0, 4))
		.replace(/\0/g, "")
		.trim();

	// 0x04: Company code (2 bytes ASCII)
	const companyCode = new TextDecoder("ascii")
		.decode(data.subarray(4, 6))
		.replace(/\0/g, "")
		.trim();

	// 0x08: Internal filename (32 bytes)
	const filename = new TextDecoder("ascii")
		.decode(data.subarray(8, 40))
		.replace(/\0/g, "")
		.trim();

	// 0x28: Modification time (seconds since 2000-01-01 00:00:00 UTC)
	const modSeconds = view.getUint32(0x28, false);
	const baseDate = Date.UTC(2000, 0, 1, 0, 0, 0);
	const dateObj = new Date(baseDate + modSeconds * 1000);
	const modTime = Number.isNaN(dateObj.getTime())
		? "2000-01-01T00:00:00Z"
		: dateObj.toISOString();

	// 0x32: Block count (each block is 8192 bytes)
	const blockCount = view.getUint16(0x32, false);

	// 0x38..0x57: Comment line 1 (32 bytes Shift-JIS)
	// 0x58..0x77: Comment line 2 (32 bytes Shift-JIS)
	let comment1 = "";
	let comment2 = "";
	if (data.length >= 0x78) {
		comment1 = decodeShiftJis(data.subarray(0x38, 0x58));
		comment2 = decodeShiftJis(data.subarray(0x58, 0x78));
	}

	// Try extracting icon if present (standard 24x24 or 32x32)
	let iconPng: Uint8Array | null = null;
	if (data.length >= 0x80 + 32 * 32 * 2) {
		try {
			// Look for RGB5A3 32x32 icon block at 0x80
			const rgba = new Uint8Array(32 * 32 * 4);
			for (let i = 0; i < 32 * 32; i++) {
				const colVal = view.getUint16(0x80 + i * 2, false);
				const [r, g, b, a] = decodeRgb5a3(colVal);
				const px = i * 4;
				rgba[px] = r;
				rgba[px + 1] = g;
				rgba[px + 2] = b;
				rgba[px + 3] = a;
			}
			iconPng = encodeRgbaToPng(32, 32, rgba);
		} catch {
			iconPng = null;
		}
	}

	return {
		gameCode,
		companyCode,
		filename,
		modTime,
		blockCount: blockCount > 0 ? blockCount : Math.ceil(data.length / 8192),
		comment1,
		comment2,
		dataSize: data.length,
		rawGci: data,
		iconPng,
	};
}

export function parseGameCubeSaves(data: Uint8Array): GciSave[] {
	// If it's a raw memory card dump (512KB, 2MB, 8MB, or 16MB)
	// Check for raw card size (524288, 2097152, 8388608, 16777216)
	if (data.length >= 524288 && data.length % 524288 === 0) {
		const saves: GciSave[] = [];
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		const BLOCK_SIZE = 8192;

		// Directory is located in Block 1 (offset 8192)
		const dirOffset = 8192;
		for (let entry = 0; entry < 127; entry++) {
			const entryOffset = dirOffset + entry * 64;
			const code = new TextDecoder("ascii").decode(
				data.subarray(entryOffset, entryOffset + 4),
			);

			// Empty entries start with 0xFFFFFFFF or null
			if (code.charCodeAt(0) === 0xff || code.charCodeAt(0) === 0x00) continue;

			const startBlock = view.getUint16(entryOffset + 0x30, false);
			const blockCount = view.getUint16(entryOffset + 0x32, false);
			if (startBlock < 2 || blockCount === 0) continue;

			const saveOffset = startBlock * BLOCK_SIZE;
			const saveLen = blockCount * BLOCK_SIZE;
			if (saveOffset + saveLen <= data.length) {
				// Construct standard .gci: 64-byte directory header + save block data
				const gciData = new Uint8Array(64 + saveLen);
				gciData.set(data.subarray(entryOffset, entryOffset + 64), 0);
				gciData.set(data.subarray(saveOffset, saveOffset + saveLen), 64);
				saves.push(parseSingleGci(gciData));
			}
		}

		if (saves.length > 0) return saves;
	}

	// Otherwise treat as a single .gci save file
	return [parseSingleGci(data)];
}

export function formatGciSummary(saves: GciSave[]): string {
	const lines: string[] = [
		"# Nintendo GameCube Save Summary\n",
		`Total Saves: ${saves.length}\n`,
		"| # | Game Code | Company | Filename | Comments | Blocks | Saved Date |",
		"|---|---|---|---|---|---|---|",
	];

	for (let i = 0; i < saves.length; i++) {
		const s = saves[i];
		if (!s) continue;
		const company =
			NINTENDO_COMPANIES[s.companyCode.toLowerCase()] ?? s.companyCode;
		const comment = [s.comment1, s.comment2].filter(Boolean).join(" / ") || "—";
		lines.push(
			`| ${i + 1} | \`${s.gameCode}\` | ${company} | \`${s.filename}\` | ${comment.replace(/\|/g, "/")} | ${s.blockCount} | ${s.modTime.substring(0, 10)} |`,
		);
	}

	return `${lines.join("\n")}\n`;
}

export function convertGci(
	input: ArrayBuffer,
	asZip = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing GameCube save file headers...");
	const raw = new Uint8Array(input);
	const saves = parseGameCubeSaves(raw);

	if (saves.length === 0) {
		throw new Error("No GameCube save blocks found in file.");
	}

	if (asZip) {
		onProgress?.(0.6, `Packaging ${saves.length} save files into ZIP...`);
		const zipFiles: Record<string, Uint8Array> = {};

		zipFiles["README.md"] = new TextEncoder().encode(formatGciSummary(saves));
		zipFiles["manifest.json"] = new TextEncoder().encode(
			JSON.stringify(
				saves.map((s) => ({
					gameCode: s.gameCode,
					company:
						NINTENDO_COMPANIES[s.companyCode.toLowerCase()] ?? s.companyCode,
					filename: s.filename,
					modTime: s.modTime,
					blockCount: s.blockCount,
					comment1: s.comment1,
					comment2: s.comment2,
				})),
				null,
				2,
			),
		);

		for (const s of saves) {
			const safeName = `${s.gameCode}_${s.filename}`.replace(
				/[^A-Za-z0-9_-]/g,
				"_",
			);
			zipFiles[`saves/${safeName}.gci`] = s.rawGci;
			if (s.iconPng) {
				zipFiles[`icons/${safeName}.png`] = s.iconPng;
			}
		}

		onProgress?.(0.9, "Compressing ZIP archive...");
		return zipSync(zipFiles).buffer as ArrayBuffer;
	}

	onProgress?.(0.7, "Formatting JSON metadata...");
	const jsonOut = JSON.stringify(
		{
			saveCount: saves.length,
			saves: saves.map((s) => ({
				gameCode: s.gameCode,
				company:
					NINTENDO_COMPANIES[s.companyCode.toLowerCase()] ?? s.companyCode,
				filename: s.filename,
				modTime: s.modTime,
				blockCount: s.blockCount,
				comment1: s.comment1,
				comment2: s.comment2,
				dataSizeBytes: s.dataSize,
			})),
		},
		null,
		2,
	);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(jsonOut).buffer as ArrayBuffer;
}
