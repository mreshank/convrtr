import { z } from "zod";

export const CATEGORIES = [
	"image",
	"video",
	"audio",
	"document",
	"data",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const QUALITY_PRESETS = [
	"lossless",
	"visually-lossless",
	"balanced",
	"smallest",
	"target-size",
	"custom",
] as const;
export type QualityPreset = (typeof QUALITY_PRESETS)[number];

export const AdvancedParamSchema = z.discriminatedUnion("control", [
	z.object({
		control: z.literal("stepper"),
		key: z.string(),
		label: z.string(),
		group: z.string(),
		min: z.number(),
		max: z.number(),
		step: z.number(),
		default: z.number(),
	}),
	z.object({
		control: z.literal("slider"),
		key: z.string(),
		label: z.string(),
		group: z.string(),
		min: z.number(),
		max: z.number(),
		step: z.number(),
		default: z.number(),
	}),
	z.object({
		control: z.literal("select"),
		key: z.string(),
		label: z.string(),
		group: z.string(),
		options: z.array(z.object({ value: z.string(), label: z.string() })),
		default: z.string(),
	}),
	z.object({
		control: z.literal("toggle"),
		key: z.string(),
		label: z.string(),
		group: z.string(),
		default: z.boolean(),
	}),
]);
export type AdvancedParam = z.infer<typeof AdvancedParamSchema>;

export const ToolSchema = z.object({
	id: z.string(),
	slug: z.string(),
	category: z.enum(CATEGORIES),
	kind: z.enum([
		"convert",
		"compress",
		"resize",
		"extract",
		"edit",
		"inspect",
		"generate",
	]),
	accept: z.object({
		mime: z.array(z.string()).min(1),
		ext: z.array(z.string()).min(1),
		maxBytes: z.number().optional(),
	}),
	output: z.object({ ext: z.string(), mime: z.string() }),
	engines: z.array(z.string()).min(1),
	/**
	 * Whether this tool's engines can convert without holding the file in
	 * memory.
	 *
	 * Declared here, rather than asked of the engine, because the decision has
	 * to be made on the main thread before the save dialog opens — and the
	 * registry must never import an engine (see the module boundary rules in
	 * the design spec; doing so drags every codec into every page bundle).
	 *
	 * The duplication is deliberate but not unchecked: `streamable-parity`
	 * asserts this flag agrees with `supportsStreaming()` for every engine the
	 * tool names, so a flag that drifts from reality fails the suite rather
	 * than misleading a user with a file too large to buffer.
	 */
	streamable: z.boolean().optional(),
	quality: z.object({
		losslessAvailable: z.boolean(),
		defaultPreset: z.enum(QUALITY_PRESETS),
		presets: z.array(
			z.object({
				id: z.enum(QUALITY_PRESETS),
				label: z.string(),
				explanation: z.string(),
				params: z.record(
					z.string(),
					z.union([z.number(), z.string(), z.boolean()]),
				),
			}),
		),
		advanced: z.array(AdvancedParamSchema),
	}),
	seo: z.object({
		title: z.string(),
		h1: z.string(),
		intent: z.string(),
		faq: z.array(z.object({ q: z.string(), a: z.string() })),
		related: z.array(z.string()),
	}),
});

export type Tool = z.infer<typeof ToolSchema>;
