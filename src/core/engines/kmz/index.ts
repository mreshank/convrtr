import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertKmzToGeoJson } from "./parser";

/**
 * Google Earth KMZ (.kmz) to GeoJSON conversion engine.
 * Unpacks compressed Keyhole archives, extracts doc.kml vector geometry,
 * placemarks, and attributes into standard RFC 7946 GeoJSON FeatureCollections in-browser.
 */
export const kmzToGeoJsonEngine: Engine = {
	id: "extract:kmz-to-geojson",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertKmzToGeoJson(input, onProgress);
	},
};
