export interface ZabwToMarkdownOptions {
	includeFrontmatter?: boolean;
	headingStyle?: "atx" | "setext";
}

export interface ZabwMetadata {
	title?: string;
	author?: string;
	subject?: string;
	keywords?: string;
	generator?: string;
}

export interface ZabwConversionResult {
	markdown: string;
	markdownBuffer: ArrayBuffer;
	metadata: ZabwMetadata;
}
