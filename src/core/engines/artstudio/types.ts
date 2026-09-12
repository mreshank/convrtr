export type ArtStudioMode = "auto" | "multicolor" | "hires";
export type ArtStudioPalette = "pepto" | "colodore";

export interface ArtStudioToPngOptions {
	mode?: ArtStudioMode;
	palette?: ArtStudioPalette;
	scale?: number;
	aspectRatio?: "square" | "crt";
}

export interface ArtStudioMetadata {
	mode: "multicolor" | "hires";
	width: number;
	height: number;
	loadAddress: number;
	backgroundColor: number;
	colorsUsed: number[];
	palette: ArtStudioPalette;
}

export interface ArtStudioConversionResult {
	pngBytes: Uint8Array;
	metadata: ArtStudioMetadata;
}
