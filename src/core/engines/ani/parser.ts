import { zipSync } from "fflate";
import { encodeRgbaToPng } from "../dds/parser";

/**
 * Windows Animated Cursor (.ani) RIFF container and frame extractor.
 * Parses ACON RIFF containers, anih headers, rate/sequence tables,
 * decodes ICO/CUR DIBs (1-bit, 4-bit, 8-bit, 24-bit, 32-bit, PNG),
 * and bundles transparent PNG frames + timing metadata JSON into a ZIP.
 */

export interface AniStep {
	stepIndex: number;
	frameIndex: number;
	frameFile: string;
	jiffies: number;
	durationMs: number;
}

export interface AniHeader {
	cFrames: number;
	cSteps: number;
	cx: number;
	cy: number;
	cBitCount: number;
	cPlanes: number;
	jifRate: number;
	flags: number;
	title?: string;
	author?: string;
}

export interface DecodedFrame {
	index: number;
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
	pngData: Uint8Array;
}

export interface AniExtractionResult {
	header: AniHeader;
	steps: AniStep[];
	frames: DecodedFrame[];
	totalDurationMs: number;
	metadataJson: string;
	manifestMarkdown: string;
}

/**
 * Calculate DIB scanline stride padded to 4-byte boundaries.
 */
function getDibRowStride(width: number, bitCount: number): number {
	return Math.floor((width * bitCount + 31) / 32) * 4;
}

/**
 * Decodes a Windows ICO/CUR image payload (or raw DIB) into an RGBA PNG.
 */
export function decodeIconOrDibToPng(frameBytes: Uint8Array): {
	pngData: Uint8Array;
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
} {
	if (frameBytes.length < 4) {
		throw new Error("Icon frame data is too small");
	}

	// Case 1: Frame is already an embedded PNG
	if (
		frameBytes[0] === 0x89 &&
		frameBytes[1] === 0x50 &&
		frameBytes[2] === 0x4e &&
		frameBytes[3] === 0x47
	) {
		// Read width and height from PNG IHDR chunk if present
		let w = 32;
		let h = 32;
		if (frameBytes.length >= 24) {
			const view = new DataView(
				frameBytes.buffer,
				frameBytes.byteOffset,
				frameBytes.byteLength,
			);
			w = view.getUint32(16, false);
			h = view.getUint32(20, false);
		}
		return {
			pngData: frameBytes,
			width: w,
			height: h,
			hotspotX: 0,
			hotspotY: 0,
		};
	}

	const view = new DataView(
		frameBytes.buffer,
		frameBytes.byteOffset,
		frameBytes.byteLength,
	);
	let dibOffset = 0;
	let hotspotX = 0;
	let hotspotY = 0;

	// Case 2: Standard ICO or CUR container header (6-byte header + 16-byte directory)
	const idReserved = view.getUint16(0, true);
	const idType = view.getUint16(2, true);
	const idCount = view.getUint16(4, true);

	if (idReserved === 0 && (idType === 1 || idType === 2) && idCount >= 1) {
		if (frameBytes.length >= 22) {
			if (idType === 2) {
				// CUR format: wPlanes is xHotspot, wBitCount is yHotspot
				hotspotX = view.getUint16(10, true);
				hotspotY = view.getUint16(12, true);
			}
			dibOffset = view.getUint32(18, true);

			// Check if payload at dibOffset is an embedded PNG
			if (
				dibOffset + 8 <= frameBytes.length &&
				frameBytes[dibOffset] === 0x89 &&
				frameBytes[dibOffset + 1] === 0x50 &&
				frameBytes[dibOffset + 2] === 0x4e &&
				frameBytes[dibOffset + 3] === 0x47
			) {
				const pngSlice = frameBytes.subarray(dibOffset);
				let w = 32;
				let h = 32;
				if (pngSlice.length >= 24) {
					const pv = new DataView(
						pngSlice.buffer,
						pngSlice.byteOffset,
						pngSlice.byteLength,
					);
					w = pv.getUint32(16, false);
					h = pv.getUint32(20, false);
				}
				return {
					pngData: pngSlice,
					width: w,
					height: h,
					hotspotX,
					hotspotY,
				};
			}
		}
	}

	// Case 3: Parse BITMAPINFOHEADER (DIB)
	if (dibOffset + 40 > frameBytes.length) {
		dibOffset = 0; // Fallback to start if offset was invalid
	}

	if (dibOffset + 40 > frameBytes.length) {
		throw new Error("Invalid DIB frame: truncated BITMAPINFOHEADER");
	}

	const biSize = view.getUint32(dibOffset, true);
	const biWidth = view.getInt32(dibOffset + 4, true);
	const biHeight = view.getInt32(dibOffset + 8, true);
	const biBitCount = view.getUint16(dibOffset + 14, true);
	const biClrUsed = view.getUint32(dibOffset + 32, true);

	const width = Math.abs(biWidth);
	// In icon DIBs, biHeight is 2 * image height (XOR image + AND mask)
	const height = Math.abs(Math.floor(biHeight / 2)) || width || 32;

	const colorTableOffset = dibOffset + biSize;
	let numColors = 0;
	if (biBitCount <= 8) {
		numColors = biClrUsed > 0 ? biClrUsed : 1 << biBitCount;
	}

	// Read color palette if present
	const palette: [number, number, number][] = [];
	for (let i = 0; i < numColors; i++) {
		const cPos = colorTableOffset + i * 4;
		if (cPos + 3 <= frameBytes.length) {
			const b = frameBytes[cPos] ?? 0;
			const g = frameBytes[cPos + 1] ?? 0;
			const r = frameBytes[cPos + 2] ?? 0;
			palette.push([r, g, b]);
		} else {
			palette.push([0, 0, 0]);
		}
	}

	const xorOffset = colorTableOffset + numColors * 4;
	const xorRowStride = getDibRowStride(width, biBitCount);
	const andOffset = xorOffset + xorRowStride * height;
	const andRowStride = getDibRowStride(width, 1);

	const rgba = new Uint8Array(width * height * 4);

	// First pass for 32-bit: check if any genuine non-zero alpha values exist
	let has32BitAlpha = false;
	if (biBitCount === 32) {
		for (let y = 0; y < height && !has32BitAlpha; y++) {
			const rowStart = xorOffset + (height - 1 - y) * xorRowStride;
			for (let x = 0; x < width; x++) {
				const aPos = rowStart + x * 4 + 3;
				if ((frameBytes[aPos] ?? 0) > 0) {
					has32BitAlpha = true;
					break;
				}
			}
		}
	}

	for (let y = 0; y < height; y++) {
		// DIB scanlines are bottom-up
		const xorRowStart = xorOffset + (height - 1 - y) * xorRowStride;
		const andRowStart = andOffset + (height - 1 - y) * andRowStride;

		for (let x = 0; x < width; x++) {
			const outPos = (y * width + x) * 4;
			let r = 0;
			let g = 0;
			let b = 0;
			let a = 255;

			if (biBitCount === 32) {
				const p = xorRowStart + x * 4;
				b = frameBytes[p] ?? 0;
				g = frameBytes[p + 1] ?? 0;
				r = frameBytes[p + 2] ?? 0;
				a = has32BitAlpha ? (frameBytes[p + 3] ?? 255) : 255;
			} else if (biBitCount === 24) {
				const p = xorRowStart + x * 3;
				b = frameBytes[p] ?? 0;
				g = frameBytes[p + 1] ?? 0;
				r = frameBytes[p + 2] ?? 0;
			} else if (biBitCount === 8) {
				const colorIndex = frameBytes[xorRowStart + x] ?? 0;
				const entry = palette[colorIndex] ?? [0, 0, 0];
				r = entry[0];
				g = entry[1];
				b = entry[2];
			} else if (biBitCount === 4) {
				const byteVal = frameBytes[xorRowStart + Math.floor(x / 2)] ?? 0;
				const colorIndex = x % 2 === 0 ? (byteVal >> 4) & 0x0f : byteVal & 0x0f;
				const entry = palette[colorIndex] ?? [0, 0, 0];
				r = entry[0];
				g = entry[1];
				b = entry[2];
			} else if (biBitCount === 1) {
				const byteVal = frameBytes[xorRowStart + Math.floor(x / 8)] ?? 0;
				const colorIndex = (byteVal >> (7 - (x % 8))) & 1;
				const entry = palette[colorIndex] ?? [0, 0, 0];
				r = entry[0];
				g = entry[1];
				b = entry[2];
			}

			// Apply 1-bit AND mask transparency if 32-bit alpha is not already active
			if (!has32BitAlpha && andRowStart < frameBytes.length) {
				const maskByte = frameBytes[andRowStart + Math.floor(x / 8)] ?? 0;
				const isTransparent = ((maskByte >> (7 - (x % 8))) & 1) === 1;
				if (isTransparent) {
					a = 0;
				}
			}

			rgba[outPos] = r;
			rgba[outPos + 1] = g;
			rgba[outPos + 2] = b;
			rgba[outPos + 3] = a;
		}
	}

	const pngData = encodeRgbaToPng(width, height, rgba);
	return { pngData, width, height, hotspotX, hotspotY };
}

/**
 * Parse an animated cursor file (.ani) and extract all frames and animation metadata.
 */
export function parseAni(fileBytes: Uint8Array): AniExtractionResult {
	if (fileBytes.length < 12) {
		throw new Error(
			"Invalid .ani file: File too small to be a valid RIFF container.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const riffSig = String.fromCharCode(
		fileBytes[0] ?? 0,
		fileBytes[1] ?? 0,
		fileBytes[2] ?? 0,
		fileBytes[3] ?? 0,
	);
	if (riffSig !== "RIFF") {
		throw new Error(`Invalid .ani file: Header '${riffSig}' is not 'RIFF'.`);
	}

	const formType = String.fromCharCode(
		fileBytes[8] ?? 0,
		fileBytes[9] ?? 0,
		fileBytes[10] ?? 0,
		fileBytes[11] ?? 0,
	);
	if (formType !== "ACON") {
		throw new Error(
			`Invalid .ani file: Form type '${formType}' is not 'ACON'.`,
		);
	}

	let offset = 12;
	let parsedHeader: AniHeader | null = null;
	const rateTable: number[] = [];
	const seqTable: number[] = [];
	const rawFrames: Uint8Array[] = [];
	let aniTitle = "";
	let aniAuthor = "";

	while (offset + 8 <= fileBytes.length) {
		const chunkId = String.fromCharCode(
			fileBytes[offset] ?? 0,
			fileBytes[offset + 1] ?? 0,
			fileBytes[offset + 2] ?? 0,
			fileBytes[offset + 3] ?? 0,
		);
		const chunkSize = view.getUint32(offset + 4, true);
		const chunkDataOffset = offset + 8;
		const nextOffset = chunkDataOffset + ((chunkSize + 1) & ~1);

		if (chunkId === "anih" && chunkSize >= 36) {
			const cFrames = view.getUint32(chunkDataOffset + 4, true);
			const cSteps = view.getUint32(chunkDataOffset + 8, true);
			const cx = view.getUint32(chunkDataOffset + 12, true);
			const cy = view.getUint32(chunkDataOffset + 16, true);
			const cBitCount = view.getUint32(chunkDataOffset + 20, true);
			const cPlanes = view.getUint32(chunkDataOffset + 24, true);
			const jifRate = view.getUint32(chunkDataOffset + 28, true);
			const flags = view.getUint32(chunkDataOffset + 32, true);

			parsedHeader = {
				cFrames,
				cSteps: cSteps || cFrames,
				cx,
				cy,
				cBitCount,
				cPlanes,
				jifRate: jifRate || 10,
				flags,
			};
		} else if (chunkId === "rate") {
			const numRates = Math.floor(chunkSize / 4);
			for (let i = 0; i < numRates; i++) {
				rateTable.push(view.getUint32(chunkDataOffset + i * 4, true));
			}
		} else if (chunkId === "seq ") {
			const numSeq = Math.floor(chunkSize / 4);
			for (let i = 0; i < numSeq; i++) {
				seqTable.push(view.getUint32(chunkDataOffset + i * 4, true));
			}
		} else if (chunkId === "LIST" && chunkSize >= 4) {
			const listType = String.fromCharCode(
				fileBytes[chunkDataOffset] ?? 0,
				fileBytes[chunkDataOffset + 1] ?? 0,
				fileBytes[chunkDataOffset + 2] ?? 0,
				fileBytes[chunkDataOffset + 3] ?? 0,
			);

			if (listType === "INFO") {
				// Parse metadata
				let subPos = chunkDataOffset + 4;
				const listEnd = chunkDataOffset + chunkSize;
				while (subPos + 8 <= listEnd) {
					const subId = String.fromCharCode(
						fileBytes[subPos] ?? 0,
						fileBytes[subPos + 1] ?? 0,
						fileBytes[subPos + 2] ?? 0,
						fileBytes[subPos + 3] ?? 0,
					);
					const subLen = view.getUint32(subPos + 4, true);
					const strStart = subPos + 8;
					const strEnd = Math.min(listEnd, strStart + subLen);

					const chars: string[] = [];
					for (let k = strStart; k < strEnd; k++) {
						const byte = fileBytes[k] ?? 0;
						if (byte === 0) break;
						chars.push(String.fromCharCode(byte));
					}
					const text = chars.join("").trim();

					if (subId === "INAM") aniTitle = text;
					if (subId === "IART") aniAuthor = text;

					subPos += 8 + ((subLen + 1) & ~1);
				}
			} else if (listType === "fram") {
				// Parse icon frames
				let subPos = chunkDataOffset + 4;
				const listEnd = Math.min(fileBytes.length, chunkDataOffset + chunkSize);
				while (subPos + 8 <= listEnd) {
					const subLen = view.getUint32(subPos + 4, true);
					const frameStart = subPos + 8;
					const frameEnd = Math.min(listEnd, frameStart + subLen);

					if (frameStart < frameEnd) {
						rawFrames.push(fileBytes.slice(frameStart, frameEnd));
					}

					subPos += 8 + ((subLen + 1) & ~1);
				}
			}
		}

		offset = nextOffset;
	}

	if (!parsedHeader) {
		throw new Error("Invalid .ani file: Missing 'anih' header chunk.");
	}

	if (aniTitle) parsedHeader.title = aniTitle;
	if (aniAuthor) parsedHeader.author = aniAuthor;

	// Decode all unique frames
	const decodedFrames: DecodedFrame[] = [];
	for (let i = 0; i < rawFrames.length; i++) {
		const raw = rawFrames[i];
		if (!raw) continue;
		try {
			const decoded = decodeIconOrDibToPng(raw);
			decodedFrames.push({
				index: i,
				width: decoded.width,
				height: decoded.height,
				hotspotX: decoded.hotspotX,
				hotspotY: decoded.hotspotY,
				pngData: decoded.pngData,
			});
		} catch {
			// Skip corrupted single frame
		}
	}

	if (decodedFrames.length === 0) {
		throw new Error(
			"No valid cursor frames could be extracted from .ani file.",
		);
	}

	// Build animation steps sequence
	const numSteps = parsedHeader.cSteps || decodedFrames.length;
	const steps: AniStep[] = [];
	let totalDurationMs = 0;

	for (let s = 0; s < numSteps; s++) {
		const frameIdx = seqTable[s] ?? s % decodedFrames.length;
		const safeFrameIdx = frameIdx % decodedFrames.length;
		const targetFrame = decodedFrames[safeFrameIdx];
		if (!targetFrame) continue;

		// 1 jiffy = 1/60th second = ~16.6667ms
		const jiffies = rateTable[s] ?? parsedHeader.jifRate ?? 10;
		const durationMs = Math.round((jiffies * 1000) / 60);
		totalDurationMs += durationMs;

		steps.push({
			stepIndex: s,
			frameIndex: safeFrameIdx,
			frameFile: `frame_${String(safeFrameIdx).padStart(3, "0")}.png`,
			jiffies,
			durationMs,
		});
	}

	const metadata = {
		title: parsedHeader.title ?? "Animated Cursor",
		author: parsedHeader.author ?? "Unknown",
		width: decodedFrames[0]?.width ?? parsedHeader.cx ?? 32,
		height: decodedFrames[0]?.height ?? parsedHeader.cy ?? 32,
		hotspot: {
			x: decodedFrames[0]?.hotspotX ?? 0,
			y: decodedFrames[0]?.hotspotY ?? 0,
		},
		uniqueFramesCount: decodedFrames.length,
		animationStepsCount: steps.length,
		defaultJifRate: parsedHeader.jifRate,
		totalDurationMs,
		steps,
	};

	const metadataJson = JSON.stringify(metadata, null, 2);

	const manifestMarkdown = [
		`# Windows Animated Cursor (.ani) Extraction Report`,
		``,
		`- **Title**: ${metadata.title}`,
		`- **Author**: ${metadata.author}`,
		`- **Dimensions**: ${metadata.width} × ${metadata.height} px`,
		`- **Hotspot Coordinates**: (${metadata.hotspot.x}, ${metadata.hotspot.y})`,
		`- **Unique Frames Extracted**: ${decodedFrames.length}`,
		`- **Animation Steps**: ${steps.length}`,
		`- **Total Loop Duration**: ${(totalDurationMs / 1000).toFixed(2)} seconds`,
		``,
		`## Unique Frames Inventory`,
		``,
		`| Frame # | Filename | Dimensions | Hotspot |`,
		`|---|---|---|---|`,
		...decodedFrames.map(
			(f) =>
				`| ${f.index} | \`frame_${String(f.index).padStart(3, "0")}.png\` | ${f.width} × ${f.height} px | (${f.hotspotX}, ${f.hotspotY}) |`,
		),
		``,
		`## CSS Web Implementation`,
		``,
		`Use the first frame directly in CSS cursor property:`,
		`\`\`\`css`,
		`.custom-cursor {`,
		`  cursor: url('frame_000.png') ${metadata.hotspot.x} ${metadata.hotspot.y}, auto;`,
		`}`,
		`\`\`\``,
		``,
		`Or animate through frames using CSS keyframes and the timings in \`ANIMATION_METADATA.json\`.`,
		``,
		`---`,
		`*Extracted 100% locally in your browser with zero server uploads.*`,
	].join("\n");

	return {
		header: parsedHeader,
		steps,
		frames: decodedFrames,
		totalDurationMs,
		metadataJson,
		manifestMarkdown,
	};
}

/**
 * Converts a Windows Animated Cursor (.ani) into a structured ZIP archive.
 */
export function convertAniToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "PARSING_ANI_RIFF");
	const result = parseAni(new Uint8Array(input));

	onProgress?.(0.5, "PACKING_FRAMES");
	const zipFiles: Record<string, Uint8Array> = {};

	for (const frame of result.frames) {
		const filename = `frame_${String(frame.index).padStart(3, "0")}.png`;
		zipFiles[filename] = frame.pngData;
	}

	onProgress?.(0.8, "BUILD_METADATA");
	zipFiles["ANIMATION_METADATA.json"] = new TextEncoder().encode(
		result.metadataJson,
	);
	zipFiles["ANI_MANIFEST.md"] = new TextEncoder().encode(
		result.manifestMarkdown,
	);

	onProgress?.(0.9, "COMPRESS_ZIP");
	const zipped = zipSync(zipFiles);

	onProgress?.(1.0, "DONE");
	return zipped.buffer as ArrayBuffer;
}
