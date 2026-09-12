export interface AbwConversionOptions {
	includeMetadata?: boolean;
	preserveImages?: boolean;
}

export interface AbwMetadata {
	title?: string;
	creator?: string;
	description?: string;
	date?: string;
	subject?: string;
	keywords?: string[];
	version?: string;
}

export interface AbwConversionResult {
	markdown: string;
	metadata: AbwMetadata;
	imageCount: number;
}
