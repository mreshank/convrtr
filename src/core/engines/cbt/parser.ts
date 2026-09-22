import { gunzipSync } from "fflate";
import type { PDFImage } from "pdf-lib";

export interface CbtExtractionResult {
	pageCount: number;
	totalPagesFound: number;
	pdfBytes: Uint8Array;
}

export function naturalSort(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function isPngImage(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	);
}

function isJpgImage(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 3 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff
	);
}

/**
 * Reads a POSIX tar (ustar) archive into name → bytes, honouring GNU longname
 * (`L`) entries and skipping pax headers, directories and sparse markers.
 */
export function parseTar(fileBytes: Uint8Array): Record<string, Uint8Array> {
	const out: Record<string, Uint8Array> = {};
	let offset = 0;
	let longName: string | null = null;

	const readString = (at: number, len: number): string => {
		const slice = fileBytes.subarray(at, at + len);
		const nul = slice.indexOf(0);
		return new TextDecoder().decode(
			nul === -1 ? slice : slice.subarray(0, nul),
		);
	};

	while (offset + 512 <= fileBytes.length) {
		const header = fileBytes.subarray(offset, offset + 512);
		if (header.every((b) => b === 0)) break; // end-of-archive padding

		const name = readString(offset, 100);
		const prefix = readString(offset + 345, 155);
		const sizeOct =
			(readString(offset + 124, 12)
				.trim()
				.split(" ")[0] ??
				"") ||
			"0";
		const size = Number.parseInt(sizeOct, 8);
		const typeflag = String.fromCharCode(header[156] ?? 0);
		const fullName = longName ?? (prefix ? `${prefix}/${name}` : name);
		longName = null;

		if (!Number.isFinite(size) || size < 0) {
			throw new Error("Invalid CBT archive: corrupt tar size field.");
		}
		const dataStart = offset + 512;
		const dataEnd = dataStart + size;
		if (dataEnd > fileBytes.length) {
			throw new Error("Invalid CBT archive: entry overruns end of file.");
		}

		if (typeflag === "L") {
			longName = readString(dataStart, size);
		} else if (
			typeflag === "0" ||
			typeflag === "\0" ||
			typeflag === "" ||
			typeflag === "7"
		) {
			if (fullName && !fullName.endsWith("/")) {
				out[fullName] = fileBytes.slice(dataStart, dataEnd);
			}
		}
		// Directories (5), pax headers (x/g), links (1/2) carry no page bytes.
		offset = dataEnd + ((512 - (size % 512)) % 512);
	}
	return out;
}

/**
 * Converts a Comic Book TAR (.cbt) archive into a single bound PDF document.
 * Same page pipeline as CBZ: natural-sorted image pages embedded at native
 * resolution via pdf-lib — only the container reader differs (ustar vs ZIP).
 */
export async function convertCbtToPdf(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<CbtExtractionResult> {
	onProgress?.(0.05, "READ");
	let bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	// Tolerate .tgz content under a .cbt name.
	if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
		try {
			bytes = gunzipSync(bytes);
		} catch {
			throw new Error("Invalid CBT archive: gzip payload is corrupt.");
		}
	}

	let entries: Record<string, Uint8Array>;
	try {
		entries = parseTar(bytes);
	} catch (err) {
		throw new Error(
			`Invalid CBT archive: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	onProgress?.(0.2, "SCAN");
	const supportedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
	const pagePaths = Object.keys(entries)
		.filter((path) => {
			const lower = path.toLowerCase();
			if (lower.startsWith("__macosx") || lower.includes("/.ds_store")) {
				return false;
			}
			return supportedExtensions.some((ext) => lower.endsWith(ext));
		})
		.sort(naturalSort);

	if (pagePaths.length === 0) {
		throw new Error(
			"No valid comic page images (.jpg, .png, .webp) found inside this .cbt archive.",
		);
	}

	onProgress?.(0.3, "ASSEMBLE");
	const { PDFDocument } = await import("pdf-lib");
	const pdfDoc = await PDFDocument.create();
	pdfDoc.setProducer("convrtr (100% In-Browser Comic Converter)");

	let pagesAdded = 0;
	for (let i = 0; i < pagePaths.length; i++) {
		const path = pagePaths[i];
		if (!path) continue;
		const imgBytes = entries[path];
		if (!imgBytes || imgBytes.length === 0) continue;

		try {
			let embeddedImage: PDFImage;
			if (isPngImage(imgBytes)) {
				embeddedImage = await pdfDoc.embedPng(imgBytes);
			} else if (isJpgImage(imgBytes)) {
				embeddedImage = await pdfDoc.embedJpg(imgBytes);
			} else {
				embeddedImage = path.toLowerCase().endsWith(".png")
					? await pdfDoc.embedPng(imgBytes)
					: await pdfDoc.embedJpg(imgBytes);
			}
			const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
			page.drawImage(embeddedImage, {
				x: 0,
				y: 0,
				width: embeddedImage.width,
				height: embeddedImage.height,
			});
			pagesAdded++;
		} catch {
			// Skip un-embeddable pages without aborting the comic.
		}
		onProgress?.(0.3 + (i / pagePaths.length) * 0.5, "ASSEMBLE");
	}

	if (pagesAdded === 0) {
		throw new Error(
			"Failed to embed any comic pages: images could not be parsed into PDF format.",
		);
	}

	onProgress?.(0.9, "ENCODE");
	const pdfBytes = await pdfDoc.save();
	onProgress?.(1.0, "COMPLETE");
	return { pageCount: pagesAdded, totalPagesFound: pagePaths.length, pdfBytes };
}
