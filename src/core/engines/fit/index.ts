import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertFitToCsv } from "./parser";

/**
 * Garmin / Strava / Wahoo FIT (Flexible and Interoperable Data Transfer) activity decoder.
 * Unpacks binary FIT records (GPS trackpoints, timestamps, elevation, heart rate, cadence, power, speed)
 * into standard RFC 4180 CSV spreadsheets with UTF-8 BOM encoding for Excel, Sheets, and pandas.
 */
export const fitToCsvEngine: Engine = {
	id: "extract:fit-to-csv",

	async probe() {
		return true; // Pure client-side binary FIT decoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertFitToCsv(input, onProgress);
	},
};
