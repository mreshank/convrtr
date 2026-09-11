export interface GedcomToCsvOptions {
	/**
	 * Include family relationships (Father, Mother, Spouses) resolved from family links.
	 * Defaults to true.
	 */
	resolveFamilyRelationships?: boolean;
	/**
	 * CSV column delimiter. Defaults to comma.
	 */
	delimiter?: "," | ";";
}

export interface GedcomIndividual {
	id: string;
	fullName: string;
	givenName?: string;
	surname?: string;
	sex?: string;
	birthDate?: string;
	birthPlace?: string;
	deathDate?: string;
	deathPlace?: string;
	burialDate?: string;
	burialPlace?: string;
	occupation?: string;
	fatherName?: string;
	motherName?: string;
	spouseNames?: string[];
	childFamilyId?: string;
	spouseFamilyIds: string[];
}

export interface GedcomFamily {
	id: string;
	husbandId?: string;
	wifeId?: string;
	marriageDate?: string;
	marriagePlace?: string;
	childrenIds: string[];
}

export interface GedcomMetadata {
	sourceApp?: string;
	gedcomVersion?: string;
	totalIndividuals: number;
	totalFamilies: number;
}

export interface GedcomConversionResult {
	metadata: GedcomMetadata;
	csvText: string;
	individuals: GedcomIndividual[];
}
