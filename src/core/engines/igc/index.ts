import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertIgc } from "./parser";

export * from "./parser";

/**
 * FAI International Gliding Commission (.igc) to GPX & KML Engine.
 * Converts certified GNSS flight recorder logs into standards-compliant GPX
 * tracks with 3D elevations and Google Earth KML flight paths.
 */
export const igcToGpxEngine: Engine = {
	id: "extract:igc-to-gpx",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asKml = Boolean(params.kml);
		return convertIgc(input, asKml, onProgress);
	},
};
