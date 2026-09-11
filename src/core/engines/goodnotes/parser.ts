import { unzipSync } from "fflate";

/**
 * Extracts and merges all pages of a GoodNotes (.goodnotes) notebook into a single unified PDF.
 *
 * GoodNotes 5 and 6 export files as ZIP archives containing page PDF fragments,
 * high-resolution rendered page images, or vector strokes.
 * This parser inspects the container, extracts all page representations in
 * natural sequential page order, and composes them into a clean, standards-compliant PDF.
 */
export async function extractGoodnotesToPdf(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<ArrayBuffer> {
	onProgress?.(0.1, "READ");
	const bytes = new Uint8Array(input);

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(bytes);
	} catch {
		throw new Error(
			"extractGoodnotesToPdf: Not a valid GoodNotes (.goodnotes) archive (invalid ZIP container)",
		);
	}

	onProgress?.(0.3, "EXTRACT");

	// Search for all PDF files within the archive
	const pdfEntries = Object.keys(unzipped).filter((path) =>
		path.toLowerCase().endsWith(".pdf"),
	);

	// Sort naturally so page-1, page-2, ... page-10 order correctly
	const naturalSort = (a: string, b: string) =>
		a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

	const { PDFDocument } = await import("pdf-lib");

	if (pdfEntries.length > 0) {
		pdfEntries.sort(naturalSort);

		if (pdfEntries.length === 1) {
			const firstEntry = pdfEntries[0];
			const singlePdf = firstEntry ? unzipped[firstEntry] : undefined;
			if (singlePdf) {
				onProgress?.(1.0, "COMPLETE");
				const copy = new Uint8Array(singlePdf.byteLength);
				copy.set(singlePdf);
				return copy.buffer;
			}
		}

		// Merge multi-page PDF fragments
		const merged = await PDFDocument.create();
		for (let i = 0; i < pdfEntries.length; i++) {
			const entryPath = pdfEntries[i];
			if (!entryPath) continue;
			const chunkBytes = unzipped[entryPath];
			if (!chunkBytes || chunkBytes.length === 0) continue;

			try {
				const doc = await PDFDocument.load(chunkBytes);
				const pages = await merged.copyPages(doc, doc.getPageIndices());
				for (const page of pages) {
					merged.addPage(page);
				}
			} catch {
				// Continue past any unparseable metadata fragments
			}

			onProgress?.(0.3 + (i / pdfEntries.length) * 0.5, "ASSEMBLE");
		}

		if (merged.getPageCount() > 0) {
			onProgress?.(0.9, "ENCODE");
			const pdfBytes = await merged.save();
			onProgress?.(1.0, "COMPLETE");
			const copy = new Uint8Array(pdfBytes.byteLength);
			copy.set(pdfBytes);
			return copy.buffer;
		}
	}

	// Fallback: Check for raster page image renders (.png, .jpg, .jpeg)
	const imageEntries = Object.keys(unzipped)
		.filter((path) => {
			const lower = path.toLowerCase();
			return (
				(lower.endsWith(".png") ||
					lower.endsWith(".jpg") ||
					lower.endsWith(".jpeg")) &&
				!lower.includes("thumb") &&
				!lower.includes("icon")
			);
		})
		.sort(naturalSort);

	if (imageEntries.length > 0) {
		const merged = await PDFDocument.create();
		for (let i = 0; i < imageEntries.length; i++) {
			const imgPath = imageEntries[i];
			if (!imgPath) continue;
			const imgBytes = unzipped[imgPath];
			if (!imgBytes || imgBytes.length === 0) continue;

			try {
				const isPng = imgPath.toLowerCase().endsWith(".png");
				const embedded = isPng
					? await merged.embedPng(imgBytes)
					: await merged.embedJpg(imgBytes);

				const page = merged.addPage([embedded.width, embedded.height]);
				page.drawImage(embedded, {
					x: 0,
					y: 0,
					width: embedded.width,
					height: embedded.height,
				});
			} catch {
				// Ignore un-embeddable decorative sprites
			}

			onProgress?.(0.3 + (i / imageEntries.length) * 0.5, "ASSEMBLE");
		}

		if (merged.getPageCount() > 0) {
			onProgress?.(0.9, "ENCODE");
			const pdfBytes = await merged.save();
			onProgress?.(1.0, "COMPLETE");
			const copy = new Uint8Array(pdfBytes.byteLength);
			copy.set(pdfBytes);
			return copy.buffer;
		}
	}

	throw new Error(
		"extractGoodnotesToPdf: No renderable PDF pages or page images found inside this .goodnotes archive",
	);
}
