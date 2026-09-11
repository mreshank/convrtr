import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAuToWav } from "./parser";

export const auToWavEngine: Engine = {
	id: "extract:au-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAuToWav(input, onProgress);
	},
};

export { convertAuToWav, parseAu } from "./parser";
