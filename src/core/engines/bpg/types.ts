export interface BpgConversionOptions {
	/** Optional target scale/max dimension */
	maxDimension?: number;
}

export interface BpgMetadata {
	width: number;
	height: number;
	pixelFormat: string;
	colorSpace: string;
	bitDepth: number;
	hasAlpha: boolean;
	hasAnimation: boolean;
	hasExif: boolean;
	hasIcc: boolean;
}

export interface BpgConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: BpgMetadata;
}
