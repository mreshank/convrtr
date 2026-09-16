export interface RawConversionOptions {
	quality?: "preview" | "full";
}

export interface RawMetadata {
	make?: string;
	model?: string;
	width: number;
	height: number;
	hasEmbeddedPreview: boolean;
	previewByteLength?: number;
}

export interface RawConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: RawMetadata;
}
