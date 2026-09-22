import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGb } from "./parser";

export * from "./parser";

export const gbToPngEngine: Engine = {
	id: "extract:gb-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		_onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		const result = convertGb(new Uint8Array(input), { json: asJson });
		return result.buffer.slice(
			result.byteOffset,
			result.byteOffset + result.byteLength,
		) as ArrayBuffer;
	},
};
