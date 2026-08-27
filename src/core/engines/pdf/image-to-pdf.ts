import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Wraps an image in a PDF **without re-encoding it**.
 *
 * pdf-lib embeds JPEG and PNG streams directly, because PDF's imaging model
 * already understands both — a JPEG becomes a DCTDecode stream carrying the
 * original bytes. So the photo inside the PDF is byte-identical to the one
 * that went in. Tools that rasterise the image first, or route it through a
 * canvas, silently re-compress it: the user asked for a container change and
 * quietly received a quality loss.
 *
 * Only JPEG and PNG can be embedded this way. Anything else would have to be
 * transcoded first, which is a decision the user should make explicitly by
 * converting to JPEG or PNG themselves — so this engine refuses rather than
 * silently doing it for them.
 */

/** ISO 216 A4 at 72 dpi, PDF's default user-space unit. */
const A4 = { width: 595.28, height: 841.89 } as const;

type PageMode = "fit" | "actual";

function detectFormat(bytes: Uint8Array): "jpeg" | "png" | undefined {
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
	if (
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return "png";
	}
	return undefined;
}

export const imageToPdfEngine: Engine = {
	id: "pdf:image-to-pdf",

	async probe() {
		// Pure JS — no WASM, no platform APIs.
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const bytes = new Uint8Array(input);
		const format = detectFormat(bytes);
		if (!format) {
			throw new Error(
				"image-to-pdf: only JPEG and PNG can be embedded without re-encoding. Convert to one of those first rather than having the image silently re-compressed.",
			);
		}

		onProgress(0.2, "EMBED");
		const { PDFDocument } = await import("pdf-lib");
		const pdf = await PDFDocument.create();

		// The original bytes go in untouched — this is the whole point.
		const image =
			format === "jpeg" ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);

		onProgress(0.7, "LAYOUT");
		const mode = (String(params.pageMode ?? "fit") as PageMode) ?? "fit";

		if (mode === "actual") {
			// One page exactly the image's pixel dimensions: no margins, no
			// scaling, nothing added. Right for scans and screenshots.
			const page = pdf.addPage([image.width, image.height]);
			page.drawImage(image, {
				x: 0,
				y: 0,
				width: image.width,
				height: image.height,
			});
		} else {
			// Fit to A4 preserving aspect ratio, centred. `scaleToFit` never
			// enlarges beyond the box, so a small image stays its own size
			// rather than being blown up and made blurry.
			const page = pdf.addPage([A4.width, A4.height]);
			const scaled = image.scaleToFit(A4.width, A4.height);
			page.drawImage(image, {
				x: (A4.width - scaled.width) / 2,
				y: (A4.height - scaled.height) / 2,
				width: scaled.width,
				height: scaled.height,
			});
		}

		onProgress(0.9, "WRITE");
		const saved = await pdf.save();
		onProgress(1, "WRITE");
		return saved.buffer.slice(
			saved.byteOffset,
			saved.byteOffset + saved.byteLength,
		) as ArrayBuffer;
	},
};
