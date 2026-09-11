export interface DegasToPngOptions {
	scale?: number | string;
}

export interface DegasMetadata {
	resolutionMode: number;
	resolutionName: string;
	width: number;
	height: number;
	compressed: boolean;
	colorsUsed: number;
}

export interface DegasConversionResult {
	metadata: DegasMetadata;
	pngBytes: Uint8Array;
}
