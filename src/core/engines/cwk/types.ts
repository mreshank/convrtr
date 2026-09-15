export interface CwkConversionOptions {
	includeFrontmatter?: boolean;
}

export interface CwkMetadata {
	title: string;
	documentType: string;
	version?: string;
	characterCount: number;
	paragraphCount: number;
}

export interface CwkConversionResult {
	markdown: string;
	metadata: CwkMetadata;
}
