export interface LyxConversionOptions {
	includeFrontmatter?: boolean;
}

export interface LyxMetadata {
	title?: string;
	author?: string;
	textClass?: string;
	sectionCount: number;
	formulaCount: number;
	tableCount: number;
	imageCount: number;
}

export interface LyxConversionResult {
	markdown: string;
	markdownBuffer: ArrayBuffer;
	metadata: LyxMetadata;
}
