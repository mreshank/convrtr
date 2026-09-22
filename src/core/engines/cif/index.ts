import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCif } from "./parser";

export * from "./parser";

export const cifToJsonEngine: Engine = {
	id: "extract:cif-to-json",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		_onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		const asFasta = Boolean(params.fasta);
		const text = new TextDecoder("utf-8").decode(input);
		const result = convertCif(text, {
			json: asJson,
			fasta: asFasta,
		});
		const bytes = new TextEncoder().encode(result);
		return bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength,
		) as ArrayBuffer;
	},
};
