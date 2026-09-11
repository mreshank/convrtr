import { describe, expect, it } from "vitest";
import { convertGedcomToCsv, gedcomToCsvEngine } from "../index";

describe("GEDCOM to CSV parser & engine", () => {
	const sampleGedcom = `
0 HEAD
1 SOUR FamilySearch
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Abraham /Lincoln/
2 GIVN Abraham
2 SURN Lincoln
1 SEX M
1 BIRT
2 DATE 12 FEB 1809
2 PLAC Hodgenville, Hardin, Kentucky, USA
1 DEAT
2 DATE 15 APR 1865
2 PLAC Washington, District of Columbia, USA
1 OCCU 16th President of the United States
1 FAMS @F1@
1 FAMC @F2@
0 @I2@ INDI
1 NAME Mary Ann /Todd/
2 GIVN Mary Ann
2 SURN Todd
1 SEX F
1 BIRT
2 DATE 13 DEC 1818
2 PLAC Lexington, Fayette, Kentucky, USA
1 FAMS @F1@
0 @I3@ INDI
1 NAME Thomas /Lincoln/
2 GIVN Thomas
2 SURN Lincoln
1 SEX M
1 FAMS @F2@
0 @I4@ INDI
1 NAME Nancy /Hanks/
2 GIVN Nancy
2 SURN Hanks
1 SEX F
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 4 NOV 1842
2 PLAC Springfield, Sangamon, Illinois, USA
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I1@
0 TRLR
`;

	it("parses individuals and resolves parental and spousal relationships", () => {
		const result = convertGedcomToCsv(sampleGedcom);

		expect(result.metadata.sourceApp).toBe("FamilySearch");
		expect(result.metadata.gedcomVersion).toBe("5.5.1");
		expect(result.metadata.totalIndividuals).toBe(4);
		expect(result.metadata.totalFamilies).toBe(2);

		const abe = result.individuals.find((i) => i.id === "@I1@");
		expect(abe).toBeDefined();
		expect(abe?.fullName).toBe("Abraham Lincoln");
		expect(abe?.surname).toBe("Lincoln");
		expect(abe?.birthDate).toBe("12 FEB 1809");
		expect(abe?.birthPlace).toBe("Hodgenville, Hardin, Kentucky, USA");
		expect(abe?.deathDate).toBe("15 APR 1865");
		expect(abe?.occupation).toBe("16th President of the United States");
		expect(abe?.fatherName).toBe("Thomas Lincoln");
		expect(abe?.motherName).toBe("Nancy Hanks");
		expect(abe?.spouseNames).toContain("Mary Ann Todd");
	});

	it("generates valid RFC 4180 CSV with UTF-8 BOM", () => {
		const result = convertGedcomToCsv(sampleGedcom);
		const csv = result.csvText;

		// UTF-8 BOM at index 0
		expect(csv.charCodeAt(0)).toBe(0xfeff);

		// Header checks
		expect(csv).toContain(
			"ID,Full Name,Given Name,Surname,Sex,Birth Date,Birth Place,Death Date,Death Place,Father,Mother,Spouses,Occupation",
		);

		// Field escaping checks (places with commas must be wrapped in quotes)
		expect(csv).toContain('"Hodgenville, Hardin, Kentucky, USA"');
		expect(csv).toContain("Abraham Lincoln");
		expect(csv).toContain("Thomas Lincoln");
		expect(csv).toContain("Mary Ann Todd");
	});

	it("supports custom semicolon delimiter", () => {
		const result = convertGedcomToCsv(sampleGedcom, { delimiter: ";" });
		expect(result.csvText).toContain(
			"ID;Full Name;Given Name;Surname;Sex;Birth Date;Birth Place",
		);
	});

	it("engine probe and run returns ArrayBuffer with CSV content", async () => {
		expect(await gedcomToCsvEngine.probe()).toBe(true);

		const inputBytes = new TextEncoder().encode(sampleGedcom)
			.buffer as ArrayBuffer;
		const output = await gedcomToCsvEngine.run(
			inputBytes,
			{ resolveFamilyRelationships: true },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(100);

		const decoded = new TextDecoder().decode(new Uint8Array(output));
		expect(decoded).toContain("Abraham Lincoln");
		expect(decoded).toContain("Mary Ann Todd");
	});
});
