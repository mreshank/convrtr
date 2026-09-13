export interface HwpMetadata {
	title: string;
	version: string;
	compressed: boolean;
	sectionCount: number;
	paragraphCount: number;
}

export interface HwpConversionOptions {
	includeFrontmatter?: boolean;
}

export interface HwpConversionResult {
	metadata: HwpMetadata;
	markdown: string;
}
