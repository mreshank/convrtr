import type { AdvancedParam, Tool } from "../../types";
import type { ImageDecoderId, ImageEncoderId } from "./defineImageConversion";
import { IMAGE_QUALITY_PROFILES } from "./quality-profiles";

/**
 * Resize controls, shared by every resize tool. These are transform params,
 * not encoder params, so they live here rather than in the per-encoder
 * quality profiles — a resize means the same thing whatever format it is
 * written back as.
 */
const RESIZE_PARAMS: AdvancedParam[] = [
	{
		control: "stepper",
		key: "width",
		label: "Width",
		group: "Dimensions",
		min: 0,
		max: 20000,
		step: 1,
		default: 0,
	},
	{
		control: "stepper",
		key: "height",
		label: "Height",
		group: "Dimensions",
		min: 0,
		max: 20000,
		step: 1,
		default: 0,
	},
	{
		control: "select",
		key: "method",
		label: "Resampling",
		group: "Dimensions",
		options: [
			{ value: "lanczos3", label: "Lanczos3 (sharpest)" },
			{ value: "mitchell", label: "Mitchell" },
			{ value: "catrom", label: "Catmull-Rom" },
			{ value: "triangle", label: "Triangle (softest)" },
		],
		default: "lanczos3",
	},
	{
		control: "select",
		key: "fitMethod",
		label: "Fit",
		group: "Dimensions",
		options: [
			{ value: "contain", label: "Keep aspect ratio" },
			{ value: "stretch", label: "Stretch to fit" },
		],
		default: "contain",
	},
];

export interface DefineImageResizeInput {
	/** Format resized in and written back out — resize does not change format. */
	format: ImageDecoderId & ImageEncoderId;
	extraExt?: string[];
	ext: string;
	mime: { input: string[]; output: string };
	seo: {
		title: string;
		h1: string;
		intent: string;
		faq: { q: string; a: string }[];
		related: string[];
	};
}

/**
 * Builds a resize `Tool`: same format in and out, with the resize transform
 * applied in between.
 *
 * On fidelity: the score reflects **encode** fidelity, not the resample.
 * Shrinking an image obviously discards pixels, but that is what the user
 * asked for — it is not the codec silently degrading their file, which is
 * what the fidelity indicator exists to warn about. So a PNG resize can
 * honestly score 100 (the resized pixels are stored exactly), while a JPEG
 * resize carries JPEG's usual lossy profile.
 */
export function defineImageResize(input: DefineImageResizeInput): Tool {
	const slug = `resize-${input.ext}`;

	return {
		id: `image/${slug}`,
		slug,
		category: "image",
		kind: "resize",
		accept: {
			mime: input.mime.input,
			ext: [input.ext, ...(input.extraExt ?? [])],
		},
		output: { ext: input.ext, mime: input.mime.output },
		engines: [`image:${input.format}-[resize]->${input.format}`],
		quality: {
			...IMAGE_QUALITY_PROFILES[input.format],
			advanced: [
				...RESIZE_PARAMS,
				...IMAGE_QUALITY_PROFILES[input.format].advanced,
			],
		},
		seo: input.seo,
	};
}
