export interface NbConversionOptions {
	includeFrontmatter?: boolean;
	renderOutputs?: boolean;
	codeLanguage?: string;
}

export interface NbMetadata {
	title?: string;
	cellCount: number;
	inputCount: number;
	outputCount: number;
	textCount: number;
	sections: string[];
	generator?: string;
}

export interface NbConversionResult {
	markdown: string;
	markdownBuffer: ArrayBuffer;
	metadata: NbMetadata;
}
