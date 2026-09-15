export interface SdwConversionOptions {
	/** Include document metadata as YAML frontmatter (default: true) */
	includeFrontmatter?: boolean;
}

export interface SdwMetadata {
	title?: string;
	author?: string;
	subject?: string;
	keywords?: string;
	comments?: string;
	pageCount?: number;
	paragraphCount?: number;
	wordCount?: number;
}

export interface SdwConversionResult {
	markdown: string;
	metadata: SdwMetadata;
}
