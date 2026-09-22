import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractXp3ToZip } from "./parser";

export * from "./parser";

export const xp3ToZipEngine: Engine = {
	id: "extract:xp3-to-zip",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		const result = extractXp3ToZip(new Uint8Array(input), {
			json: asJson,
			onProgress,
		});
		return result.buffer.slice(
			result.byteOffset,
			result.byteOffset + result.byteLength,
		) as ArrayBuffer;
	},
};
