import type {
	GedcomConversionResult,
	GedcomFamily,
	GedcomIndividual,
	GedcomMetadata,
	GedcomToCsvOptions,
} from "./types";

/**
 * Escapes a single string field for RFC 4180 CSV compliance.
 */
function escapeCsv(field: string | undefined, delimiter: string): string {
	if (!field) return "";
	if (
		field.includes(delimiter) ||
		field.includes('"') ||
		field.includes("\n") ||
		field.includes("\r")
	) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
}

/**
 * Parses a GEDCOM (.ged) genealogy data file and converts individuals and families
 * into a structured RFC 4180 CSV spreadsheet with UTF-8 BOM.
 */
export function convertGedcomToCsv(
	input: Uint8Array | ArrayBuffer | string,
	options: GedcomToCsvOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): GedcomConversionResult {
	onProgress?.(0.1, "READ_INPUT");

	let text = "";
	if (typeof input === "string") {
		text = input;
	} else {
		const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
		text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
	}

	onProgress?.(0.2, "PARSE_LINES");

	const lines = text.split(/\r?\n/);
	const individuals: GedcomIndividual[] = [];
	const families: GedcomFamily[] = [];

	const indiMap = new Map<string, GedcomIndividual>();
	const famMap = new Map<string, GedcomFamily>();

	let currentRecordType: "INDI" | "FAM" | "HEAD" | "OTHER" = "OTHER";
	let currentIndi: GedcomIndividual | null = null;
	let currentFam: GedcomFamily | null = null;
	let currentEvent: "BIRT" | "DEAT" | "BURI" | "MARR" | null = null;

	let sourceApp: string | undefined;
	let gedcomVersion: string | undefined;

	for (let i = 0; i < lines.length; i++) {
		const rawLine = lines[i]?.trim();
		if (!rawLine) continue;

		// GEDCOM line regex: LEVEL [optional @XREF@] TAG [optional value]
		const match = rawLine.match(
			/^(\d+)\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/,
		);
		if (!match) continue;

		const level = Number.parseInt(match[1] ?? "0", 10);
		const xref = match[2];
		const tag = (match[3] ?? "").toUpperCase();
		const value = match[4]?.trim() ?? "";

		if (level === 0) {
			currentEvent = null;

			if (tag === "INDI" || value === "INDI") {
				currentRecordType = "INDI";
				const id = xref ?? tag;
				currentIndi = {
					id,
					fullName: "",
					spouseFamilyIds: [],
				};
				individuals.push(currentIndi);
				indiMap.set(id, currentIndi);
			} else if (tag === "FAM" || value === "FAM") {
				currentRecordType = "FAM";
				const id = xref ?? tag;
				currentFam = {
					id,
					childrenIds: [],
				};
				families.push(currentFam);
				famMap.set(id, currentFam);
			} else if (tag === "HEAD") {
				currentRecordType = "HEAD";
			} else {
				currentRecordType = "OTHER";
			}
			continue;
		}

		if (currentRecordType === "HEAD") {
			if (tag === "SOUR") sourceApp = value;
			if (tag === "VERS" && !gedcomVersion) gedcomVersion = value;
			continue;
		}

		if (currentRecordType === "INDI" && currentIndi) {
			if (level === 1) {
				currentEvent = null;

				if (tag === "NAME") {
					// Value e.g. "John /Doe/" -> remove slashes for full name
					const cleanFull = value
						.replace(/\//g, " ")
						.replace(/\s+/g, " ")
						.trim();
					currentIndi.fullName = cleanFull;

					// Extract surname between slashes if present
					const slashMatch = value.match(/\/([^/]+)\//);
					if (slashMatch?.[1]) {
						currentIndi.surname = slashMatch[1].trim();
					}
				} else if (tag === "GIVN") {
					currentIndi.givenName = value;
				} else if (tag === "SURN") {
					currentIndi.surname = value;
				} else if (tag === "SEX") {
					currentIndi.sex = value;
				} else if (tag === "OCCU") {
					currentIndi.occupation = value;
				} else if (tag === "FAMC") {
					currentIndi.childFamilyId = value;
				} else if (tag === "FAMS") {
					currentIndi.spouseFamilyIds.push(value);
				} else if (tag === "BIRT") {
					currentEvent = "BIRT";
				} else if (tag === "DEAT") {
					currentEvent = "DEAT";
				} else if (tag === "BURI") {
					currentEvent = "BURI";
				}
			} else if (level === 2 && currentEvent) {
				if (tag === "DATE") {
					if (currentEvent === "BIRT") currentIndi.birthDate = value;
					else if (currentEvent === "DEAT") currentIndi.deathDate = value;
					else if (currentEvent === "BURI") currentIndi.burialDate = value;
				} else if (tag === "PLAC") {
					if (currentEvent === "BIRT") currentIndi.birthPlace = value;
					else if (currentEvent === "DEAT") currentIndi.deathPlace = value;
					else if (currentEvent === "BURI") currentIndi.burialPlace = value;
				}
			}
			continue;
		}

		if (currentRecordType === "FAM" && currentFam) {
			if (level === 1) {
				currentEvent = null;
				if (tag === "HUSB") {
					currentFam.husbandId = value;
				} else if (tag === "WIFE") {
					currentFam.wifeId = value;
				} else if (tag === "CHIL") {
					currentFam.childrenIds.push(value);
				} else if (tag === "MARR") {
					currentEvent = "MARR";
				}
			} else if (level === 2 && currentEvent === "MARR") {
				if (tag === "DATE") currentFam.marriageDate = value;
				else if (tag === "PLAC") currentFam.marriagePlace = value;
			}
		}
	}

	onProgress?.(0.6, "RESOLVE_RELATIONSHIPS");

	// 2. Cross-reference family connections
	if (options.resolveFamilyRelationships !== false) {
		for (const indi of individuals) {
			// Resolve parents from childFamilyId (FAMC)
			if (indi.childFamilyId) {
				const parentFam = famMap.get(indi.childFamilyId);
				if (parentFam) {
					if (parentFam.husbandId) {
						const father = indiMap.get(parentFam.husbandId);
						if (father) indi.fatherName = father.fullName;
					}
					if (parentFam.wifeId) {
						const mother = indiMap.get(parentFam.wifeId);
						if (mother) indi.motherName = mother.fullName;
					}
				}
			}

			// Resolve spouses from spouseFamilyIds (FAMS)
			if (indi.spouseFamilyIds.length > 0) {
				const spouses: string[] = [];
				for (const famId of indi.spouseFamilyIds) {
					const fam = famMap.get(famId);
					if (fam) {
						let spouseId: string | undefined;
						if (fam.husbandId === indi.id) spouseId = fam.wifeId;
						else if (fam.wifeId === indi.id) spouseId = fam.husbandId;

						if (spouseId) {
							const spouse = indiMap.get(spouseId);
							if (spouse?.fullName) {
								spouses.push(spouse.fullName);
							}
						}
					}
				}
				if (spouses.length > 0) {
					indi.spouseNames = spouses;
				}
			}
		}
	}

	onProgress?.(0.8, "GENERATE_CSV");

	const delim = options.delimiter ?? ",";
	const headers = [
		"ID",
		"Full Name",
		"Given Name",
		"Surname",
		"Sex",
		"Birth Date",
		"Birth Place",
		"Death Date",
		"Death Place",
		"Father",
		"Mother",
		"Spouses",
		"Occupation",
	];

	const rows: string[] = [headers.join(delim)];

	for (const indi of individuals) {
		const row = [
			escapeCsv(indi.id, delim),
			escapeCsv(indi.fullName, delim),
			escapeCsv(indi.givenName, delim),
			escapeCsv(indi.surname, delim),
			escapeCsv(indi.sex, delim),
			escapeCsv(indi.birthDate, delim),
			escapeCsv(indi.birthPlace, delim),
			escapeCsv(indi.deathDate, delim),
			escapeCsv(indi.deathPlace, delim),
			escapeCsv(indi.fatherName, delim),
			escapeCsv(indi.motherName, delim),
			escapeCsv(indi.spouseNames?.join("; "), delim),
			escapeCsv(indi.occupation, delim),
		];
		rows.push(row.join(delim));
	}

	// Prepend UTF-8 Byte Order Mark (\uFEFF) for immediate Excel/Sheets compatibility
	const csvText = `\uFEFF${rows.join("\r\n")}\r\n`;

	const metadata: GedcomMetadata = {
		sourceApp,
		gedcomVersion,
		totalIndividuals: individuals.length,
		totalFamilies: families.length,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		csvText,
		individuals,
	};
}
