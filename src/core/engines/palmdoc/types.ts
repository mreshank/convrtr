export interface PalmDocMetadata {
	name: string;
	type: string;
	creator: string;
	numRecords: number;
	compression: "none" | "palmdoc-lz77";
	uncompressedSize: number;
	createdDate?: string;
}

export interface PalmDocConversionOptions {
	includeFrontmatter?: boolean;
	detectHeadings?: boolean;
}

export interface PalmDocConversionResult {
	metadata: PalmDocMetadata;
	markdown: string;
}
