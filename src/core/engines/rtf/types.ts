export interface RtfToMarkdownOptions {
	/**
	 * Include YAML frontmatter block with document metadata.
	 * Defaults to true.
	 */
	includeFrontmatter?: boolean;
	/**
	 * Document title override if known.
	 */
	documentTitle?: string;
}

export interface RtfMetadata {
	title?: string;
	author?: string;
	generator?: string;
	characterCount: number;
	paragraphCount: number;
}

export interface RtfConversionResult {
	metadata: RtfMetadata;
	markdownText: string;
}
