export interface VdaConversionOptions {
	// Options placeholder if needed
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
