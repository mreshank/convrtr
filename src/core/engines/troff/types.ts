export interface TroffConversionOptions {
	preserveRawRequests?: boolean;
}

export interface TroffMetadata {
	title?: string;
	headingCount: number;
	lineCount: number;
	macrosDefined: number;
}

export interface TroffConversionResult {
	markdown: string;
	metadata: TroffMetadata;
}
