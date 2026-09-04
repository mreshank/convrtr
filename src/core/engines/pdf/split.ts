import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Splits a PDF into one file per page, without re-rendering anything.
 *
 * pdf-lib's `copyPages` copies a page's content streams and the resources they
 * reference — fonts, embedded images, colour spaces — into the new document as
 * they are. Nothing is rasterised and nothing is re-compressed, so a
 * photograph inside page four is the same bytes in the file that page four
 * becomes.
 *
 * That is worth stating because the obvious alternative is not: rendering each
 * page to an image and wrapping it in a PDF produces files that look right at
 * screen size, lose all their text, and print badly. Several online splitters
 * do exactly that.
 *
 * Pages come back as a ZIP, the same way the favicon pack and GIF frame
 * extractor return their many outputs, so the pipeline and save path need no
 * special case.
 */

/** Zero-padded so a 12-page document sorts correctly in a file listing. */
function pageName(stem: string, index: number, total: number): string {
	const width = String(total).length;
	return `${stem}-${String(index + 1).padStart(width, "0")}.pdf`;
}

export function createPdfSplitEngine(): Engine {
	return {
		id: "pdf:split",

		async probe() {
			return true;
		},

		async run(
			input: ArrayBuffer,
			_params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.05, "READ");
			const { PDFDocument } = await import("pdf-lib");

			// Encrypted documents load only with this flag, and then fail later in
			// ways that look like corruption. Refusing up front says something the
			// user can act on.
			const source = await PDFDocument.load(input, {
				ignoreEncryption: false,
			}).catch((error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				if (/encrypt/i.test(message)) {
					throw new Error(
						"This PDF is password-protected. Remove the password first — convrtr cannot split an encrypted document.",
					);
				}
				throw new Error(`This PDF could not be read: ${message}`);
			});

			const total = source.getPageCount();
			if (total === 0) {
				throw new Error("This PDF has no pages.");
			}
			if (total === 1) {
				throw new Error(
					"This PDF has only one page, so there is nothing to split. It is already a single-page file.",
				);
			}

			const files: Record<string, Uint8Array> = {};
			for (let index = 0; index < total; index++) {
				const output = await PDFDocument.create();
				// `copyPages` brings the page's content streams and resources across
				// unchanged; it does not re-render or re-encode them.
				const [page] = await output.copyPages(source, [index]);
				if (!page) {
					throw new Error(`Page ${index + 1} could not be copied.`);
				}
				output.addPage(page);

				// A standalone copy: pdf-lib's output may be a view onto a larger
				// allocation, and the archive holds every entry until it is written.
				files[pageName("page", index, total)] = (await output.save()).slice();

				onProgress(0.05 + ((index + 1) / total) * 0.85, "SPLIT");
			}

			onNotice?.(
				`Split into ${total} files. Each page keeps its original content — text stays selectable and images are the same bytes they were, because the pages were copied rather than re-rendered.`,
			);

			onProgress(0.95, "ZIP");
			const { zipSync } = await import("fflate");
			// Level 6 rather than the packs' level 0: those emit PNGs, which are
			// already compressed, whereas a PDF's own streams vary and a
			// text-heavy document still deflates well.
			const archive = zipSync(files, { level: 6 });
			onProgress(1, "ZIP");
			return archive.buffer as ArrayBuffer;
		},
	};
}
