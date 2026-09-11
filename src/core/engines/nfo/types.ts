export interface NfoToHtmlOptions {
	theme?: "dark" | "matrix" | "amber" | "plain";
	format?: "html" | "txt";
}

export interface NfoMetadata {
	lineCount: number;
	charCount: number;
	boxCharCount: number;
	hasAnsiArt: boolean;
	encoding: string;
}

export interface NfoConversionResult {
	metadata: NfoMetadata;
	content: string;
}
