export interface AcbmMetadata {
	width: number;
	height: number;
	nPlanes: number;
	masking: number;
	compression: number;
	colorCount: number;
}

export interface AcbmConversionOptions {
	preserveAlpha?: boolean;
}

export interface AcbmConversionResult {
	metadata: AcbmMetadata;
	pngBytes: Uint8Array;
}
