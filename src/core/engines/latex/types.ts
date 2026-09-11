export interface LatexToMarkdownOptions {
	/**
	 * Include YAML frontmatter block with title, author, and date.
	 * Defaults to true.
	 */
	includeFrontmatter?: boolean;
	/**
	 * Preserve LaTeX math blocks ($...$ and $$...$$).
	 * Defaults to true.
	 */
	preserveMath?: boolean;
}

export interface LatexMetadata {
	title?: string;
	author?: string;
	date?: string;
	sectionCount: number;
	mathBlockCount: number;
}

export interface LatexConversionResult {
	metadata: LatexMetadata;
	markdownText: string;
}
