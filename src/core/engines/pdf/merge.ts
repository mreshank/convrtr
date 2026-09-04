import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Joins several PDFs into one, copying pages rather than re-rendering them.
 *
 * The same guarantee the splitter makes, for the same reason: `copyPages` moves
 * each page's content streams and the resources they point at into the new
 * document unchanged, so text stays selectable, fonts stay embedded and images
 * keep their exact bytes. Nothing is rasterised.
 *
 * ## What is not carried over, and why saying so matters
 *
 * A PDF holds more than pages. Bookmarks, form fields, annotations and
 * document-level metadata live in structures that reference pages rather than
 * belonging to them, and pdf-lib's page copy does not bring them along. Most
 * merges do not involve any of it, but a merged contract quietly losing its
 * signature fields would be a serious surprise — so the tool detects those
 * features and says what was dropped instead of leaving it to be discovered.
 */

export function createPdfMergeEngine(): Engine {
	return {
		id: "pdf:merge",

		async probe() {
			return true;
		},

		async run(input: ArrayBuffer) {
			// One file is not a merge. Returning it unchanged would be a plausible
			// convenience and a bad one: the user asked for something that did not
			// happen, and got a file back suggesting it did.
			void input;
			throw new Error(
				"Merging needs at least two PDFs. Add another file to combine.",
			);
		},

		async runMany(
			inputs: ArrayBuffer[],
			_params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			if (inputs.length < 2) {
				throw new Error(
					"Merging needs at least two PDFs. Add another file to combine.",
				);
			}

			onProgress(0.05, "READ");
			const { PDFDocument, PDFName } = await import("pdf-lib");
			const merged = await PDFDocument.create();

			let pageCount = 0;
			const withForms: number[] = [];
			const withOutlines: number[] = [];

			for (const [index, input] of inputs.entries()) {
				const source = await PDFDocument.load(input, {
					ignoreEncryption: false,
				}).catch((error: unknown) => {
					const message =
						error instanceof Error ? error.message : String(error);
					if (/encrypt/i.test(message)) {
						throw new Error(
							`File ${index + 1} is password-protected. Remove the password first — convrtr cannot merge an encrypted document.`,
						);
					}
					throw new Error(`File ${index + 1} could not be read: ${message}`);
				});

				const pages = source.getPageIndices();
				if (pages.length === 0) {
					throw new Error(`File ${index + 1} has no pages.`);
				}

				// Detected before copying, so the notice can name what will be lost
				// rather than describing it in the abstract.
				if (source.catalog.has(PDFName.of("AcroForm"))) {
					withForms.push(index + 1);
				}
				if (source.catalog.has(PDFName.of("Outlines"))) {
					withOutlines.push(index + 1);
				}

				const copied = await merged.copyPages(source, pages);
				for (const page of copied) merged.addPage(page);
				pageCount += copied.length;

				onProgress(0.05 + ((index + 1) / inputs.length) * 0.85, "MERGE");
			}

			onNotice?.(
				`Merged ${inputs.length} files into ${pageCount} pages, in the order you added them. Pages were copied rather than re-rendered, so text stays selectable and images keep their original bytes.`,
			);

			if (withForms.length > 0) {
				onNotice?.(
					`File${withForms.length > 1 ? "s" : ""} ${withForms.join(", ")} contained interactive form fields, which are not carried into a merged document — the pages and their appearance come across, but the fillable fields do not. Fill the form before merging if you need the values kept.`,
				);
			}
			if (withOutlines.length > 0) {
				onNotice?.(
					`File${withOutlines.length > 1 ? "s" : ""} ${withOutlines.join(", ")} contained bookmarks, which do not survive a merge. The pages are all present; only the navigation tree is gone.`,
				);
			}

			onProgress(0.95, "WRITE");
			const output = await merged.save();
			onProgress(1, "WRITE");
			return output.slice().buffer as ArrayBuffer;
		},
	};
}
