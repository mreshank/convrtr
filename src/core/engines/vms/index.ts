import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVms } from "./parser";

export * from "./parser";

export const vmsToPngEngine: Engine = {
	id: "extract:vms-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		const asZip = Boolean(params.zip);
		const result = convertVms(new Uint8Array(input), {
			json: asJson,
			zip: asZip,
			onProgress,
		});
		return result.buffer.slice(
			result.byteOffset,
			result.byteOffset + result.byteLength,
		) as ArrayBuffer;
	},
};
