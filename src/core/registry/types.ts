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
