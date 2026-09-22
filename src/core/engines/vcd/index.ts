import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVcd } from "./parser";

export * from "./parser";

export const vcdToCsvEngine: Engine = {
	id: "extract:vcd-to-csv",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		_onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		const text = new TextDecoder("utf-8").decode(input);
		const result = convertVcd(text, { json: asJson });
		const bytes = new TextEncoder().encode(result);
		return bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength,
		);
	},
};
