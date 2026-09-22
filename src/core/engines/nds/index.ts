import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertNds } from "./parser";

export * from "./parser";

export const ndsToPngEngine: Engine = {
	id: "extract:nds-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		_onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		const result = convertNds(new Uint8Array(input), { json: asJson });
		return result.buffer.slice(
			result.byteOffset,
			result.byteOffset + result.byteLength,
		) as ArrayBuffer;
	},
};
