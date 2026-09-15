export interface RtfdToMarkdownOptions {
	includeFrontmatter?: boolean;
	documentTitle?: string;
}

export interface RtfdMetadata {
	title?: string;
	author?: string;
	generator?: string;
	attachments: string[];
}

export interface RtfdConversionResult {
	markdown: string;
	markdownBuffer: ArrayBuffer;
	metadata: RtfdMetadata;
}
