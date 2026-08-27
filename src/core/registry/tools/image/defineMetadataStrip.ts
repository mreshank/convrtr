import type { Tool } from "../../types";

export interface DefineMetadataStripInput {
	/** Format handled — metadata stripping never changes format. */
	format: "jpeg" | "png";
	ext: string;
	extraExt?: string[];
	mime: { input: string[]; output: string };
	slug: string;
	seo: {
		title: string;
		h1: string;
		intent: string;
		faq: { q: string; a: string }[];
		related: string[];
	};
}

/**
 * Builds a metadata-stripping `Tool`.
 *
 * These have no quality dial, and that is the point rather than an omission:
 * the operation rewrites the file's segment or chunk structure and copies the
 * compressed image data verbatim, so there is no quality decision to make.
 * A single `lossless` preset with no advanced parameters states that honestly
 * — offering a quality slider here would imply a trade-off that does not
 * exist.
 */
export function defineMetadataStrip(input: DefineMetadataStripInput): Tool {
	return {
		id: `image/${input.slug}`,
		slug: input.slug,
		category: "image",
		kind: "edit",
		accept: {
			mime: input.mime.input,
			ext: [input.ext, ...(input.extraExt ?? [])],
		},
		output: { ext: input.ext, mime: input.mime.output },
		engines: [`metadata:strip-${input.format}`],
		quality: {
			losslessAvailable: true,
			defaultPreset: "lossless",
			presets: [
				{
					id: "lossless",
					label: "Lossless",
					explanation:
						"The image data is copied byte for byte. Only the metadata is removed.",
					params: {},
				},
			],
			advanced: [],
		},
		seo: input.seo,
	};
}
