/**
 * convrtr — Universal Local & Client-Side File Conversion Engine
 *
 * 100% private. Zero network uploads, zero retention, pure device execution.
 * Built with Dieter Rams-inspired minimalism and brutalist technical precision.
 */

import { ENGINES, getEngine, selectEngine } from "@/core/engines";
import type { Engine } from "@/core/engines/types";
import {
	CATEGORIES,
	getTool,
	getToolsByCategory,
	QUALITY_PRESETS,
	TOOLS,
	type Tool,
} from "@/core/registry";
import {
	buildConversionGraph,
	type ConversionGraph,
	type ConversionGraphEdge,
	type ConversionGraphNode,
	canonicalExt,
} from "@/core/registry/conversion-graph";
import {
	type ConversionRoute,
	detectFileExtension,
	findConversionRoute,
	findToolForConversion,
	getAllTargetFormats,
	getAvailableTargetFormatsForFile,
	getCommonTargetFormats,
	type TargetOption,
} from "@/core/registry/converter-match";
import {
	conversionBranches,
	supportedFormats,
	toolsByCategory,
} from "@/core/registry/stats";
import type { Category, QualityPreset } from "@/core/registry/types";

export type { Engine };
// Re-export core registry items
// Re-export engine registry items
// Re-export matching & graph utilities
export {
	buildConversionGraph,
	CATEGORIES,
	type Category,
	type ConversionGraph,
	type ConversionGraphEdge,
	type ConversionGraphNode,
	type ConversionRoute,
	canonicalExt,
	conversionBranches,
	detectFileExtension,
	ENGINES,
	findConversionRoute,
	findToolForConversion,
	getAllTargetFormats,
	getAvailableTargetFormatsForFile,
	getCommonTargetFormats,
	getEngine,
	getTool,
	getToolsByCategory,
	QUALITY_PRESETS,
	type QualityPreset,
	selectEngine,
	supportedFormats,
	type TargetOption,
	TOOLS,
	type Tool,
	toolsByCategory,
};

/**
 * Returns available target options for a given file extension or file name.
 */
export function getAvailableTargetFormatsForExt(
	fileOrExt: string,
): TargetOption[] {
	return getAvailableTargetFormatsForFile(fileOrExt);
}

export interface ConvertOptions {
	/** Source format extension without leading dot (e.g. "png", "heic", "wav"). */
	from?: string;
	/** Target format extension without leading dot (e.g. "webp", "mp3", "pdf"). */
	to: string;
	/** Optional engine parameter overrides (e.g. { quality: 85 }). */
	params?: Record<string, string | number | boolean>;
	/** Progress callback receiving 0-1 ratio and current phase text. */
	onProgress?: (ratio: number, phase: string) => void;
	/** Optional notice callback for engine metadata/transcoding warnings. */
	onNotice?: (message: string) => void;
}

export interface ConvertResultStep {
	toolId: string;
	engineId: string;
	fromExt: string;
	toExt: string;
}

export interface ConvertResult {
	/** Raw converted binary data as Uint8Array. */
	data: Uint8Array;
	/** Underlying ArrayBuffer representation. */
	buffer: ArrayBuffer;
	/** Emitted target extension (e.g. "png", "webp"). */
	ext: string;
	/** Emitted MIME type (e.g. "image/png"). */
	mime: string;
	/** Primary tool ID utilized (e.g. "image/heic-to-png"). */
	toolId: string;
	/** Engine ID that executed the final conversion. */
	engineId: string;
	/** Informational notices or warnings emitted during conversion. */
	notices: string[];
	/** Sequence of steps executed (useful for multi-hop conversions). */
	steps: ConvertResultStep[];
}

/**
 * Checks whether a direct or multi-hop conversion is supported between two formats.
 */
export function canConvert(fromExt: string, toExt: string): boolean {
	const from = cleanExt(fromExt);
	const to = cleanExt(toExt);
	if (from === to) return true;

	const directTool = findToolForConversion(from, to);
	if (directTool) return true;

	const route = findConversionRoute(from, to);
	return route !== undefined && route.route.length > 0;
}

/**
 * Returns all reachable target formats from a given source format extension.
 */
export function getAvailableConversions(fromExt: string): string[] {
	const ext = cleanExt(fromExt);
	const directTargets = getAvailableTargetFormatsForExt(ext).map((t) => t.ext);
	const branches = conversionBranches(ext);
	const set = new Set<string>([...directTargets, ...branches]);
	return Array.from(set).sort();
}

/**
 * Primary conversion function.
 *
 * Accepts an ArrayBuffer, Uint8Array, Blob, File, or Node.js file path string,
 * executes the optimal conversion pipeline locally, and returns the converted binary data.
 */
export async function convert(
	input: ArrayBuffer | Uint8Array | Blob | string,
	options: ConvertOptions,
): Promise<ConvertResult> {
	if (!options?.to) {
		throw new Error("Missing required 'to' option in conversion request.");
	}

	const targetExt = cleanExt(options.to);
	let currentBuffer: ArrayBuffer;
	let sourceExt = options.from ? cleanExt(options.from) : "";

	// Handle Node file path string
	if (typeof input === "string") {
		if (typeof process !== "undefined" && process.versions?.node) {
			const { readFileSync } = await import("node:fs");
			const { extname } = await import("node:path");
			if (!sourceExt) {
				const ext = extname(input).replace(/^\./, "");
				if (!ext) {
					throw new Error(
						`Could not infer source format from path: ${input}. Specify 'from' in options.`,
					);
				}
				sourceExt = cleanExt(ext);
			}
			const fileBuffer = readFileSync(input);
			currentBuffer = fileBuffer.buffer.slice(
				fileBuffer.byteOffset,
				fileBuffer.byteOffset + fileBuffer.byteLength,
			);
		} else {
			throw new Error(
				"String input path is only supported in Node.js runtime.",
			);
		}
	} else if (typeof Blob !== "undefined" && input instanceof Blob) {
		if (
			!sourceExt &&
			"name" in input &&
			typeof (input as { name: unknown }).name === "string"
		) {
			const filename = (input as { name: string }).name;
			const lastDot = filename.lastIndexOf(".");
			if (lastDot !== -1) {
				sourceExt = cleanExt(filename.slice(lastDot + 1));
			}
		}
		currentBuffer = await input.arrayBuffer();
	} else if (input instanceof Uint8Array) {
		const ab = input.buffer as ArrayBuffer;
		currentBuffer = ab.slice(
			input.byteOffset,
			input.byteOffset + input.byteLength,
		);
	} else if (input instanceof ArrayBuffer) {
		currentBuffer = input;
	} else {
		throw new Error(
			"Unsupported input type. Provide an ArrayBuffer, Uint8Array, Blob, File, or file path string.",
		);
	}

	if (!sourceExt) {
		throw new Error(
			"Source format could not be determined. Please specify 'from' in options.",
		);
	}

	const notices: string[] = [];
	const handleNotice = (msg: string) => {
		notices.push(msg);
		options.onNotice?.(msg);
	};

	// Determine route
	let toolsToRun: Tool[] = [];
	const directTool = findToolForConversion(sourceExt, targetExt);
	if (directTool) {
		toolsToRun = [directTool];
	} else {
		const route = findConversionRoute(sourceExt, targetExt);
		if (route && route.route.length > 0) {
			toolsToRun = route.route;
		}
	}

	if (toolsToRun.length === 0) {
		throw new Error(
			`No conversion path found from "${sourceExt}" to "${targetExt}". Verify with canConvert("${sourceExt}", "${targetExt}").`,
		);
	}

	const steps: ConvertResultStep[] = [];
	let finalMime = "application/octet-stream";
	let finalExt = targetExt;
	let lastEngineId = "";
	let lastToolId = "";

	const totalSteps = toolsToRun.length;
	for (let i = 0; i < totalSteps; i++) {
		const tool = toolsToRun[i];
		if (!tool) continue;
		lastToolId = tool.id;
		finalMime = tool.output.mime;
		finalExt = tool.output.ext;

		const engine = await selectEngine(tool.engines);
		if (!engine) {
			throw new Error(
				`No compatible engine found for tool "${tool.id}". Required: [${tool.engines.join(", ")}]`,
			);
		}
		lastEngineId = engine.id;

		const stepFrom = tool.accept.ext[0] ?? sourceExt;
		const stepTo = tool.output.ext;
		steps.push({
			toolId: tool.id,
			engineId: engine.id,
			fromExt: stepFrom,
			toExt: stepTo,
		});

		const stepOnProgress = (ratio: number, phase: string) => {
			if (options.onProgress) {
				const scaledRatio = (i + Math.min(Math.max(ratio, 0), 1)) / totalSteps;
				options.onProgress(
					scaledRatio,
					`[STEP ${i + 1}/${totalSteps}] ${phase}`,
				);
			}
		};

		const params = {
			...(tool.quality.presets.find((p) => p.id === tool.quality.defaultPreset)
				?.params ?? {}),
			...(options.params ?? {}),
		};

		currentBuffer = await engine.run(
			currentBuffer,
			params,
			stepOnProgress,
			handleNotice,
			(type) => {
				finalExt = type.ext;
				finalMime = type.mime;
			},
		);
	}

	return {
		data: new Uint8Array(currentBuffer),
		buffer: currentBuffer,
		ext: finalExt,
		mime: finalMime,
		toolId: lastToolId,
		engineId: lastEngineId,
		notices,
		steps,
	};
}

/**
 * Node.js convenience helper to convert a file directly from disk and save to an output path.
 */
convert.toFile = async function toFile(
	inputPath: string,
	outputPath: string,
	options: Omit<ConvertOptions, "to"> & { to?: string },
): Promise<ConvertResult> {
	if (typeof process === "undefined" || !process.versions?.node) {
		throw new Error(
			"convert.toFile is only supported in a Node.js environment.",
		);
	}
	const { extname } = await import("node:path");
	const { writeFileSync } = await import("node:fs");

	const toExt = options.to || extname(outputPath).replace(/^\./, "");
	if (!toExt) {
		throw new Error(
			"Target format could not be determined. Provide 'to' in options or a file extension in outputPath.",
		);
	}

	const result = await convert(inputPath, {
		...options,
		to: toExt,
	});

	writeFileSync(outputPath, result.data);
	return result;
};

/**
 * Runs a specific tool by registry ID directly.
 */
export async function runTool(
	toolId: string,
	input: ArrayBuffer | Uint8Array,
	params: Record<string, string | number | boolean> = {},
	onProgress?: (ratio: number, phase: string) => void,
	onNotice?: (message: string) => void,
): Promise<ArrayBuffer> {
	const tool = getTool(toolId);
	if (!tool) {
		throw new Error(`Tool not found in registry: "${toolId}"`);
	}
	const engine = await selectEngine(tool.engines);
	if (!engine) {
		throw new Error(
			`No compatible engine found for tool "${toolId}". Declared: [${tool.engines.join(", ")}]`,
		);
	}
	const buffer: ArrayBuffer =
		input instanceof Uint8Array
			? (input.buffer as ArrayBuffer).slice(
					input.byteOffset,
					input.byteOffset + input.byteLength,
				)
			: input;

	const mergedParams = {
		...(tool.quality.presets.find((p) => p.id === tool.quality.defaultPreset)
			?.params ?? {}),
		...params,
	};

	return engine.run(buffer, mergedParams, onProgress ?? (() => {}), onNotice);
}

function cleanExt(ext: string): string {
	return ext.trim().toLowerCase().replace(/^\./, "");
}
