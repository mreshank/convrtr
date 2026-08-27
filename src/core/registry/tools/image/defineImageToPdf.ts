import type { Tool } from "../../types";

export interface DefineImageToPdfInput {
	format: "jpg" | "png";
	extraExt?: string[];
	mime: string[];
	seo: {
		title: string;
		h1: string;
		intent: string;
		faq: { q: string; a: string }[];
		related: string[];
	};
}

/**
 * Builds an image-to-PDF `Tool`.
 *
 * Marked lossless because it genuinely is: the image stream is embedded in
 * the PDF untouched, so the picture inside is byte-identical to the input.
 * The only choice on offer is page geometry, which changes nothing about the
 * image data — hence a single lossless preset and a page-mode control rather
 * than a quality dial.
 */
export function defineImageToPdf(input: DefineImageToPdfInput): Tool {
	const slug = `${input.format}-to-pdf`;
	return {
		id: `image/${slug}`,
		slug,
		category: "image",
		kind: "convert",
		accept: {
			mime: input.mime,
			ext: [input.format, ...(input.extraExt ?? [])],
		},
		output: { ext: "pdf", mime: "application/pdf" },
		engines: ["pdf:image-to-pdf"],
		quality: {
			losslessAvailable: true,
			defaultPreset: "lossless",
			presets: [
				{
					id: "lossless",
					label: "Lossless",
					explanation:
						"The image is embedded in the PDF exactly as-is. Nothing is re-compressed.",
					params: { pageMode: "fit" },
				},
			],
			advanced: [
				{
					control: "select",
					key: "pageMode",
					label: "Page size",
					group: "Layout",
					options: [
						{ value: "fit", label: "Fit to A4 (centred)" },
						{ value: "actual", label: "Match the image exactly" },
					],
					default: "fit",
				},
			],
		},
		seo: input.seo,
	};
}
