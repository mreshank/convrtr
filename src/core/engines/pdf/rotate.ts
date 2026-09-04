import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Rotates every page of a PDF by changing one number per page.
 *
 * A PDF page carries a `/Rotate` entry saying how far to turn it when
 * displayed. Rotating a document therefore means editing that number and
 * leaving everything else alone: the content streams, the fonts, the embedded
 * images are all untouched, and the file is byte-for-byte the original apart
 * from the rotation entries.
 *
 * Tools that rasterise each page to rotate it produce a file that looks right
 * and has lost every piece of selectable text in the document. That is a large
 * price for a quarter turn.
 *
 * ## Rotation is added, not set
 *
 * Pages already rotated — very common in scans — must end up a quarter turn
 * further on, not reset to a quarter turn from upright. Scanned documents
 * frequently arrive at 90 or 270 degrees already, and a tool that assigned
 * rather than added would appear to work on ordinary files and silently do the
 * wrong thing on exactly the files people are trying to fix.
 */

/** PDF permits only right angles in `/Rotate`. */
const ALLOWED = [90, 180, 270];

function clampAngle(value: ParamValue | undefined): number {
	// A `select` control carries its value as a string — the registry's option
	// values are strings — so a number-only check would silently fall back to 90
	// for every choice, and 180 and 270 would appear to be ignored while 90
	// worked perfectly.
	const numeric =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseInt(value, 10)
				: Number.NaN;
	if (!Number.isFinite(numeric)) return 90;

	// Snapped to the nearest legal quarter turn rather than rejected: the select
	// cannot produce anything else, but a stale saved parameter could.
	const normalised = (((Math.round(numeric / 90) * 90) % 360) + 360) % 360;
	return ALLOWED.includes(normalised) ? normalised : 90;
}

export function createPdfRotateEngine(): Engine {
	return {
		id: "pdf:rotate",

		async probe() {
			return true;
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.1, "READ");
			const { PDFDocument, degrees } = await import("pdf-lib");

			const document = await PDFDocument.load(input, {
				ignoreEncryption: false,
			}).catch((error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				if (/encrypt/i.test(message)) {
					throw new Error(
						"This PDF is password-protected. Remove the password first — convrtr cannot rotate an encrypted document.",
					);
				}
				throw new Error(`This PDF could not be read: ${message}`);
			});

			const pages = document.getPages();
			if (pages.length === 0) throw new Error("This PDF has no pages.");

			const angle = clampAngle(params.angle);
			let alreadyRotated = 0;

			onProgress(0.4, "ROTATE");
			for (const page of pages) {
				const current = page.getRotation().angle;
				if (current !== 0) alreadyRotated++;
				// Added to whatever was there, and wrapped: 270 + 180 is 90, not 450.
				page.setRotation(degrees((current + angle) % 360));
			}

			if (alreadyRotated > 0) {
				onNotice?.(
					`${alreadyRotated} of ${pages.length} pages were already rotated, so the turn was added to what was there rather than replacing it — which is almost always what a scanned document needs.`,
				);
			}
			onNotice?.(
				`Rotated ${pages.length} pages by ${angle}°. Only the rotation entry changed: the text, fonts and images in the file are untouched, so nothing was re-rendered.`,
			);

			onProgress(0.8, "WRITE");
			const output = await document.save();
			onProgress(1, "WRITE");
			return output.slice().buffer as ArrayBuffer;
		},
	};
}
