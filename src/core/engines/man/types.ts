export interface ManConversionOptions {
	preserveRawMacros?: boolean;
}

export interface ManMetadata {
	title?: string;
	section?: string;
	date?: string;
	source?: string;
	manual?: string;
	sectionCount: number;
	lineCount: number;
}

export interface ManConversionResult {
	markdown: string;
	metadata: ManMetadata;
}
