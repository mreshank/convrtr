/**
 * EPUB Electronic Publication Types and Conversion Options
 */

export interface EpubMetadata {
	title: string;
	creator?: string;
	language?: string;
	description?: string;
	date?: string;
	publisher?: string;
}

export interface EpubChapter {
	id: string;
	href: string;
	title?: string;
	markdown: string;
}

export interface EpubToMarkdownOptions {
	/**
	 * Include YAML frontmatter at the top of the markdown output.
	 * Default: true
	 */
	includeFrontmatter?: boolean;
	/**
	 * Include chapter break dividers between spine items.
	 * Default: true
	 */
	includeDividers?: boolean;
}

export interface EpubConversionResult {
	metadata: EpubMetadata;
	chapters: EpubChapter[];
	markdownText: string;
}
