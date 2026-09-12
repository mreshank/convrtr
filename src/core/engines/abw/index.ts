import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAbwToMarkdown } from "./parser";
import type { AbwConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * AbiWord (.abw / .zabw) to GitHub Flavored Markdown extraction engine.
 */
export const abwToMarkdownEngine: Engine = {
	id: "extract:abw-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeMetadata =
			typeof params.includeMetadata === "boolean"
				? params.includeMetadata
				: params.includeMetadata !== "false";

		const preserveImages =
			typeof params.preserveImages === "boolean"
				? params.preserveImages
				: params.preserveImages !== "false";

		const options: AbwConversionOptions = {
			includeMetadata,
			preserveImages,
		};

		const result = convertAbwToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
