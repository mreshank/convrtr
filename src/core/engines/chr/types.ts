export interface ChrToPngOptions {
	scale?: number | string;
	palette?: "grayscale" | "gameboy" | "mario";
}

export interface ChrMetadata {
	tileCount: number;
	width: number;
	height: number;
	paletteName: string;
}

export interface ChrConversionResult {
	metadata: ChrMetadata;
	pngBytes: Uint8Array;
}
