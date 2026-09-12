export interface EnexConversionOptions {
	includeFrontmatter?: boolean;
	formatChecklists?: boolean;
	headingStyle?: "atx" | "setext";
}

export interface EnexNote {
	title: string;
	created?: string;
	updated?: string;
	tags: string[];
	markdown: string;
}

export interface EnexMetadata {
	noteCount: number;
	totalCharacters: number;
	tagList: string[];
	earliestDate?: string;
	latestDate?: string;
}

export interface EnexConversionResult {
	markdown: string;
	notes: EnexNote[];
	metadata: EnexMetadata;
}
