import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGedcomToCsv } from "./parser";
import type { GedcomToCsvOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * GEDCOM (.ged) genealogy data conversion engine.
 * Parses genealogical individuals, families, dates, places, and relationships,
 * and compiles an RFC 4180 CSV spreadsheet with UTF-8 BOM.
 */
export const gedcomToCsvEngine: Engine = {
	id: "extract:gedcom-to-csv",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const resolveFamilyRelationships =
			params.resolveFamilyRelationships !== false;
		const delimiter = params.delimiter === ";" ? ";" : ",";
		const options: GedcomToCsvOptions = {
			resolveFamilyRelationships,
			delimiter,
		};

		const result = convertGedcomToCsv(input, options, onProgress);
		const bytes = new TextEncoder().encode(result.csvText);
		return bytes.slice().buffer as ArrayBuffer;
	},
};
