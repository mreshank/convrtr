import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertKmlToGeoJson } from "./parser";

/**
 * KML to GeoJSON conversion engine.
 * Converts Google Earth & Google Maps Keyhole Markup Language (.kml) to standard RFC 7946 GeoJSON.
 */
export const kmlToGeoJsonEngine: Engine = {
	id: "extract:kml-to-geojson",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertKmlToGeoJson(input, onProgress);
	},
};

export { convertKmlToGeoJson, parseKmlToGeoJson } from "./parser";
