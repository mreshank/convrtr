export type CpcGraphicsMode = 0 | 1 | 2;

export interface CpcToPngOptions {
	mode?: CpcGraphicsMode; // 0 = 160x200 (16 colors), 1 = 320x200 (4 colors), 2 = 640x200 (2 colors)
	customPalette?: number[]; // Array of 27-color hardware indices (0..26)
	aspectCorrection?: boolean; // Default true: scales Mode 0 to 320x200 for 1:1 pixel aspect
}

export interface CpcMetadata {
	width: number;
	height: number;
	mode: CpcGraphicsMode;
	hasAmsdosHeader: boolean;
	amsdosFilename?: string;
	paletteUsed: number[];
}

export interface CpcConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: CpcMetadata;
}
