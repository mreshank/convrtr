export interface MngConversionOptions {
	frameIndex?: number;
}

export interface MngMetadata {
	width: number;
	height: number;
	frameCount: number;
	ticksPerSecond: number;
	nominalLayerCount: number;
}

export interface MngConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: MngMetadata;
}
