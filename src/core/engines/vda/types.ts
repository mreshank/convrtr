export interface VdaConversionOptions {
	extractMetadataOnly?: boolean;
}

export interface VdaMetadata {
	width: number;
	height: number;
	pixelDepth: number;
	imageType: number;
	imageTypeName: string;
	hasAlpha: boolean;
	isRle: boolean;
}

export interface VdaConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: VdaMetadata;
}
