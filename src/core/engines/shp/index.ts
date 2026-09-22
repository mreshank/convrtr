import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertShpZipToGeoJson } from "./parser";

export * from "./parser";

/**
 * Zipped Shapefile set (.shp + .dbf) to GeoJSON engine.
 * Parses ESRI geometry and dBase-III attributes with no native deps and
 * joins them by record order into an RFC 7946 FeatureCollection.
 */
export const shpToGeoJsonEngine: Engine = {
	id: "extract:shp-to-geojson",

	async probe() {
		return true; // Pure client-side binary parsers
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertShpZipToGeoJson(input, onProgress);
	},
};
