export interface Fb2ConversionOptions {
	includeFrontmatter?: boolean;
	extractImages?: boolean;
	headingLevelOffset?: number;
}

export interface Fb2Image {
	id: string;
	contentType: string;
	dataUri: string;
	byteLength: number;
}

export interface Fb2Metadata {
	title: string;
	authors: string[];
	genres: string[];
	date?: string;
	language?: string;
	sectionCount: number;
	imageCount: number;
}

export interface Fb2ConversionResult {
	markdown: string;
	metadata: Fb2Metadata;
	images: Fb2Image[];
}
