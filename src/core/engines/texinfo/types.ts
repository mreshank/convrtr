export interface TexinfoConversionOptions {
	preserveNodeAnchors?: boolean;
}

export interface TexinfoMetadata {
	title?: string;
	chapterCount: number;
	sectionCount: number;
	lineCount: number;
}

export interface TexinfoConversionResult {
	markdown: string;
	metadata: TexinfoMetadata;
}
