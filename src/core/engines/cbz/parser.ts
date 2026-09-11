import { unzipSync } from "fflate";
import type { PDFImage } from "pdf-lib";
import type { CbzExtractionResult, CbzToPdfOptions } from "./types";

/**
 * Natural sort comparator for comic page filenames (e.g., page 2 before page 10).
 */
export function naturalSort(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Detects image format from magic bytes to prevent misnamed image crashes.
 */
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
 * Converts a Comic Book ZIP (.cbz / .zip) archive into a single bound PDF document.
 */
export async function convertCbzToPdf(
	input: ArrayBuffer | Uint8Array,
	_options: CbzToPdfOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): Promise<CbzExtractionResult> {
	onProgress?.(0.05, "READ");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(bytes);
	} catch {
		throw new Error(
			"Invalid CBZ archive: Unable to unpack ZIP container. File may be corrupted or encrypted.",
		);
	}

	onProgress?.(0.2, "SCAN");

	// Filter and sort image entries
	const supportedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
	const pagePaths = Object.keys(unzipped)
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
			"No valid comic page images (.jpg, .png, .webp) found inside this .cbz archive.",
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

		const imgBytes = unzipped[path];
		if (!imgBytes || imgBytes.length === 0) continue;

		try {
			let embeddedImage: PDFImage;

			if (isPngImage(imgBytes)) {
				const png = await pdfDoc.embedPng(imgBytes);
				embeddedImage = png;
			} else if (isJpgImage(imgBytes)) {
				const jpg = await pdfDoc.embedJpg(imgBytes);
				embeddedImage = jpg;
			} else {
				// Fallback to extension check
				const lower = path.toLowerCase();
				if (lower.endsWith(".png")) {
					embeddedImage = await pdfDoc.embedPng(imgBytes);
				} else {
					embeddedImage = await pdfDoc.embedJpg(imgBytes);
				}
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
			// Skip un-embeddable or corrupted page files without aborting the entire comic
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

	return {
		pageCount: pagesAdded,
		totalPagesFound: pagePaths.length,
		pdfBytes,
	};
}
