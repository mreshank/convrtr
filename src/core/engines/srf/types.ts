export interface SrfConversionOptions {
	extractPreview?: boolean;
}

export interface SrfMetadata {
	make?: string;
	model?: string;
	width: number;
	height: number;
	hasEmbeddedPreview: boolean;
	previewByteLength?: number;
}

export interface SrfConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: SrfMetadata;
}
