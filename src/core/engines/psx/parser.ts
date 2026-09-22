import { zipSync } from "fflate";
import { encodeRgbaToPng } from "../dds/parser";

export interface PsxSaveFile {
	index: number;
	startBlock: number;
	blockCount: number;
	fileSize: number;
	productCode: string;
	title: string;
	directoryFrame: Uint8Array;
	saveData: Uint8Array;
	iconPng: Uint8Array | null;
}

export interface PsxMemoryCard {
	headerValid: boolean;
	totalBlocks: number;
	usedBlocks: number;
	freeBlocks: number;
	saves: PsxSaveFile[];
}

function decodeShiftJis(bytes: Uint8Array): string {
	try {
		return new TextDecoder("shift-jis").decode(bytes).replace(/\0/g, "").trim();
	} catch {
		return new TextDecoder("latin1").decode(bytes).replace(/\0/g, "").trim();
	}
}

export function parsePsxMemoryCard(inputBytes: Uint8Array): PsxMemoryCard {
	// Skip 64-byte DexDrive header if present (starts with "123-456-STD")
	let raw = inputBytes;
	if (raw.length === 131136) {
		const magicDex = new TextDecoder("ascii").decode(raw.subarray(0, 11));
		if (magicDex === "123-456-STD") {
			raw = raw.subarray(64);
		}
	}

	if (raw.length < 131072) {
		throw new Error(
			`Invalid PS1 Memory Card: expected 131,072 bytes (128 KB), received ${raw.length} bytes.`,
		);
	}

	// Verify Header frame (Block 0, Frame 0)
	if (raw[0] !== 0x4d || raw[1] !== 0x43) {
		throw new Error(
			"Invalid PS1 Memory Card: missing 'MC' header signature at offset 0.",
		);
	}

	const BLOCK_SIZE = 8192;
	const DIR_ENTRY_SIZE = 128;
	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

	const saves: PsxSaveFile[] = [];
	let usedBlocks = 0;

	// Frames 1..15 in Block 0 are directory entries for Blocks 1..15
	for (let b = 1; b <= 15; b++) {
		const dirOffset = b * DIR_ENTRY_SIZE;
		const allocState = raw[dirOffset] ?? 0;

		// 0x51 marks the initial block of an allocated save file
		if (allocState === 0x51) {
			const declaredSize = view.getUint32(dirOffset + 0x04, true);
			const codeBytes = raw.subarray(dirOffset + 0x0a, dirOffset + 0x0a + 64);
			const productCode = new TextDecoder("ascii")
				.decode(codeBytes)
				.replace(/\0/g, "")
				.trim();

			// Trace block chain
			const chainedBlocks: number[] = [b];
			let curBlock = b;
			while (chainedBlocks.length < 15) {
				const nextPtr = view.getUint16(curBlock * DIR_ENTRY_SIZE + 0x08, true);
				if (nextPtr >= 1 && nextPtr <= 15 && !chainedBlocks.includes(nextPtr)) {
					chainedBlocks.push(nextPtr);
					curBlock = nextPtr;
				} else {
					break;
				}
			}

			const blockCount = Math.max(
				1,
				Math.ceil(
					declaredSize > 0 ? declaredSize / BLOCK_SIZE : chainedBlocks.length,
				),
			);
			usedBlocks += blockCount;

			// Gather block data
			const fullSaveData = new Uint8Array(chainedBlocks.length * BLOCK_SIZE);
			for (let i = 0; i < chainedBlocks.length; i++) {
				const blkIdx = chainedBlocks[i] ?? b;
				const blkStart = blkIdx * BLOCK_SIZE;
				fullSaveData.set(
					raw.subarray(blkStart, blkStart + BLOCK_SIZE),
					i * BLOCK_SIZE,
				);
			}

			// Extract save block metadata (SC header at offset 0 of block 1)
			let title = productCode;
			let iconPng: Uint8Array | null = null;

			if (
				fullSaveData.length >= 512 &&
				fullSaveData[0] === 0x53 &&
				fullSaveData[1] === 0x43
			) {
				// Title (64 bytes Shift-JIS at offset 0x04)
				const titleBytes = fullSaveData.subarray(0x04, 0x04 + 64);
				const decodedTitle = decodeShiftJis(titleBytes);
				if (decodedTitle) title = decodedTitle;

				// 16-color CLUT palette (32 bytes at offset 0x60)
				const clut: Array<[number, number, number, number]> = [];
				for (let c = 0; c < 16; c++) {
					const col = view.getUint16(b * BLOCK_SIZE + 0x60 + c * 2, true);
					const red = Math.round(((col & 0x1f) * 255) / 31);
					const green = Math.round((((col >> 5) & 0x1f) * 255) / 31);
					const blue = Math.round((((col >> 10) & 0x1f) * 255) / 31);
					const alpha = c === 0 && col === 0 ? 0 : 255;
					clut.push([red, green, blue, alpha]);
				}

				// 16x16 4-bpp icon bitmap (128 bytes at offset 0x80)
				const rgba = new Uint8Array(16 * 16 * 4);
				for (let byteIdx = 0; byteIdx < 128; byteIdx++) {
					const byteVal = fullSaveData[0x80 + byteIdx] ?? 0;
					const p1 = byteVal & 0x0f;
					const p2 = (byteVal >> 4) & 0x0f;

					const color1 = clut[p1] ?? [0, 0, 0, 0];
					const color2 = clut[p2] ?? [0, 0, 0, 0];

					const px1Offset = byteIdx * 2 * 4;
					rgba[px1Offset] = color1[0];
					rgba[px1Offset + 1] = color1[1];
					rgba[px1Offset + 2] = color1[2];
					rgba[px1Offset + 3] = color1[3];

					const px2Offset = (byteIdx * 2 + 1) * 4;
					rgba[px2Offset] = color2[0];
					rgba[px2Offset + 1] = color2[1];
					rgba[px2Offset + 2] = color2[2];
					rgba[px2Offset + 3] = color2[3];
				}

				try {
					iconPng = encodeRgbaToPng(16, 16, rgba);
				} catch {
					iconPng = null;
				}
			}

			const directoryFrame = raw.subarray(
				dirOffset,
				dirOffset + DIR_ENTRY_SIZE,
			);

			saves.push({
				index: saves.length + 1,
				startBlock: b,
				blockCount,
				fileSize: declaredSize > 0 ? declaredSize : fullSaveData.length,
				productCode,
				title,
				directoryFrame,
				saveData: fullSaveData,
				iconPng,
			});
		}
	}

	return {
		headerValid: true,
		totalBlocks: 15,
		usedBlocks,
		freeBlocks: Math.max(0, 15 - usedBlocks),
		saves,
	};
}

export function formatPsxSummary(card: PsxMemoryCard): string {
	const lines: string[] = [
		"# PlayStation 1 Memory Card Contents\n",
		`Total Blocks: ${card.totalBlocks} | Used: ${card.usedBlocks} | Free: ${card.freeBlocks}\n`,
		"| # | Product Code | Title | Start Block | Blocks | Size (Bytes) |",
		"|---|---|---|---|---|---|",
	];

	for (const s of card.saves) {
		lines.push(
			`| ${s.index} | \`${s.productCode}\` | ${s.title.replace(/\|/g, "/")} | Block ${s.startBlock} | ${s.blockCount} | ${s.fileSize.toLocaleString()} |`,
		);
	}

	return `${lines.join("\n")}\n`;
}

export function convertMcrToZip(
	input: ArrayBuffer,
	asJson = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing PlayStation 1 Memory Card blocks...");
	const raw = new Uint8Array(input);
	const card = parsePsxMemoryCard(raw);

	if (asJson) {
		const jsonSummary = {
			totalBlocks: card.totalBlocks,
			usedBlocks: card.usedBlocks,
			freeBlocks: card.freeBlocks,
			saves: card.saves.map((s) => ({
				index: s.index,
				productCode: s.productCode,
				title: s.title,
				startBlock: s.startBlock,
				blockCount: s.blockCount,
				fileSize: s.fileSize,
			})),
		};
		return new TextEncoder().encode(JSON.stringify(jsonSummary, null, 2))
			.buffer as ArrayBuffer;
	}

	onProgress?.(0.6, `Carving ${card.saves.length} game saves and icons...`);
	const zipFiles: Record<string, Uint8Array> = {};

	// Manifest and Markdown summary
	zipFiles["README.md"] = new TextEncoder().encode(formatPsxSummary(card));
	zipFiles["manifest.json"] = new TextEncoder().encode(
		JSON.stringify(
			card.saves.map((s) => ({
				index: s.index,
				productCode: s.productCode,
				title: s.title,
				startBlock: s.startBlock,
				blockCount: s.blockCount,
				fileSize: s.fileSize,
			})),
			null,
			2,
		),
	);

	// Export each save as .mcs (standard 128-byte dir header + blocks) and raw payload
	for (const s of card.saves) {
		const safeCode =
			s.productCode.replace(/[^A-Za-z0-9_-]/g, "_") || `save_${s.index}`;

		// 1. Standard single save (.mcs): 128-byte directory frame + data blocks
		const mcsData = new Uint8Array(128 + s.saveData.length);
		mcsData.set(s.directoryFrame, 0);
		mcsData.set(s.saveData, 128);
		zipFiles[`saves/${safeCode}.mcs`] = mcsData;

		// 2. Raw block payload (.raw)
		zipFiles[`saves/${safeCode}.raw`] = s.saveData;

		// 3. Extracted 16x16 Icon PNG if available
		if (s.iconPng) {
			zipFiles[`icons/${safeCode}.png`] = s.iconPng;
		}
	}

	onProgress?.(0.9, "Compressing ZIP archive...");
	const zipBuffer = zipSync(zipFiles);
	onProgress?.(1.0, "Complete");
	return zipBuffer.buffer as ArrayBuffer;
}
