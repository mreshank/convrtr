import { unzipSync, zipSync } from "fflate";

/**
 * Previews a modern Apple iWork (.pages / .key) document by pulling the
 * embedded renders out of the container and repackaging them.
 *
 * Since 2013 every Pages/Keynote/Numbers file is a standard ZIP whose real
 * content is an `Index/*.iwa` protobuf — which nothing but the apps can
 * reliably read — but which ships with what the apps themselves need to
 * display thumbnails, Open Recent, Quick Look, and Spotlight: a full-page
 * `preview.*` render and a Quick Look `Preview.pdf` / `Thumbnail.png`.
 *
 * That render is exactly what a stranded iWork user needs. The tool extracts
 * it bit-exact and re-zips it as `preview.<ext>` plus the Quick Look pair
 * (renamed to `quicklook.pdf` / `thumbnail.png` so the names stop being
 * path-dependent) and a `_README.txt` that says plainly what the archive
 * holds and what it cannot: the paper's body is a private protobuf, not a
 * text format, and needs Pages/Keynote itself. Honest about the boundary
 * rather than pretending a `.pages` is a document that can be "converted".
 */
export interface IworkPreviewResult {
	entries: Record<string, Uint8Array>;
	previewExt: string;
	found: string[];
}

const PREVIEW_CANDIDATES = [
	"preview.jpg",
	"preview.jpeg",
	"preview.png",
	"preview.tiff",
	"preview.tif",
	"preview.pdf",
];

const QUICKLOOK_CANDIDATES = [
	"quicklook/preview.pdf",
	"quicklook/thumbnail.png",
];

function lowerPaths(entries: Record<string, Uint8Array>): Map<string, string> {
	const lower = new Map<string, string>();
	for (const path of Object.keys(entries)) {
		const key = path.toLowerCase();
		if (!lower.has(key)) lower.set(key, path);
	}
	return lower;
}

export function parseIworkPreviews(fileBytes: Uint8Array): IworkPreviewResult {
	if (fileBytes.length < 16) {
		throw new Error("Invalid iWork file: file is smaller than a ZIP header.");
	}
	if (
		fileBytes[0] !== 0x50 ||
		fileBytes[1] !== 0x4b ||
		fileBytes[2] !== 0x03 ||
		fileBytes[3] !== 0x04
	) {
		throw new Error(
			"Invalid iWork file: missing PKZIP container signature. A modern .pages / .key file is a ZIP archive starting with PK\\x03\\x04.",
		);
	}

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(fileBytes);
	} catch (err) {
		throw new Error(
			`Failed to unpack iWork ZIP container: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	const lower = lowerPaths(unzipped);
	const found: string[] = [];

	let previewKey: string | undefined;
	for (const candidate of PREVIEW_CANDIDATES) {
		const real = lower.get(candidate);
		if (real && unzipped[real]?.length) {
			previewKey = real;
			found.push(real);
			break;
		}
	}
	for (const candidate of QUICKLOOK_CANDIDATES) {
		const real = lower.get(candidate);
		if (real && unzipped[real]?.length) {
			found.push(real);
		}
	}

	if (!previewKey) {
		throw new Error(
			"No embedded preview found in this iWork archive. Open and re-save it in Pages or Keynote, then try again.",
		);
	}

	const entries: Record<string, Uint8Array> = {};
	{
		const dot = previewKey.lastIndexOf(".");
		const ext = dot === -1 ? "bin" : previewKey.slice(dot + 1).toLowerCase();
		entries[`preview.${ext}`] = unzipped[previewKey] as Uint8Array;
	}
	const thumbnailKey = lower.get("quicklook/thumbnail.png");
	if (thumbnailKey && unzipped[thumbnailKey]?.length) {
		entries["thumbnail.png"] = unzipped[thumbnailKey] as Uint8Array;
	}
	const quicklookPdfKey = lower.get("quicklook/preview.pdf");
	if (quicklookPdfKey && unzipped[quicklookPdfKey]?.length) {
		entries["quicklook.pdf"] = unzipped[quicklookPdfKey] as Uint8Array;
	}

	const ext = previewKey.toLowerCase().endsWith(".pdf") ? "PDF" : "image";
	entries["_README.txt"] = new TextEncoder().encode(
		[
			"Apple iWork (.pages / .key) preview extraction",
			"",
			`This archive carries the embedded render (${ext}) from the source file, extracted`,
			`bit-exact. It is the page preview Pages/Keynote themselves display in Open`,
			`Recent, Quick Look and Spotlight.`,
			"",
			`- preview.*     the full-page embedded render`,
			`- quicklook.pdf  Quick Look vector render (when present)`,
			`- thumbnail.png  Quick Look thumbnail (when present)`,
			"",
			`The document body lives in Index/*.iwa, Apple's private protobuf container, and`,
			`can only be fully opened by Pages/Keynote. This extractor does not pretend a`,
			`.pages is a convertable document — it hands you the preview those apps render.`,
			"",
			"Nothing was uploaded; extraction ran entirely in your browser.",
		].join("\n"),
	);

	return {
		entries,
		previewExt: ext,
		found,
	};
}

export function convertIworkToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Opening iWork container...");
	const parsed = parseIworkPreviews(new Uint8Array(input));
	onProgress?.(0.6, "Extracting embedded previews...");
	const zipped = zipSync(parsed.entries);
	onProgress?.(1.0, "COMPLETE");
	const buf = zipped.buffer.slice(
		zipped.byteOffset,
		zipped.byteOffset + zipped.byteLength,
	);
	return buf as ArrayBuffer;
}
