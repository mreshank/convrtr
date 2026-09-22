import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAscToCsv } from "./parser";

export * from "./parser";

/**
 * Vector CANoe / CANalyzer ASCII Bus Trace (.asc) to CSV & JSON Engine.
 * Converts automotive CAN, CAN-FD, and J1939 diagnostic bus logs into standard CSV spreadsheets and JSON.
 */
export const ascToCsvEngine: Engine = {
	id: "extract:asc-to-csv",

	async probe() {
		return true; // Pure client-side text log parser
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		return convertAscToCsv(input, asJson, onProgress);
	},
};
