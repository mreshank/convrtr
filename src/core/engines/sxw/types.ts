export interface SxwToMarkdownOptions {
	includeFrontmatter?: boolean; // Default true
	extractMetadata?: boolean; // Default true
}

export interface SxwMetadata {
	title?: string;
	creator?: string;
	date?: string;
	description?: string;
	paragraphCount: number;
	wordCount: number;
}

export interface SxwConversionResult {
	markdown: string;
	metadata: SxwMetadata;
}
