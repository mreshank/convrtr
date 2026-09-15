import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseCpcScreen } from "./parser";
import type { CpcGraphicsMode, CpcToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Amstrad CPC Screen Dump (.cpc, .scr) image conversion engine.
 * Decodes 16KB CRTC 6845 framebuffer memory dumps (Modes 0, 1, 2)
 * with AMSDOS header verification and 27-color Gate Array hardware palette mapping into PNG.
 */
export const cpcToPngEngine: Engine = {
	id: "extract:cpc-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const rawMode = params.mode;
		let mode: CpcGraphicsMode = 0;
		if (rawMode === 1 || rawMode === "1") mode = 1;
		else if (rawMode === 2 || rawMode === "2") mode = 2;

		const aspectCorrection =
			params.aspectCorrection !== false && params.aspectCorrection !== "false";

		const options: CpcToPngOptions = {
			mode,
			aspectCorrection,
		};

		const result = parseCpcScreen(input, options, onProgress);
		return result.pngBuffer;
	},
};
