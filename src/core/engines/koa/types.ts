export interface KoaToPngOptions {
	scale?: number | string;
	palette?: "pepto" | "colodore";
}

export interface KoaMetadata {
	width: number;
	height: number;
	loadAddress: number;
	backgroundColor: number;
	uniqueColorsUsed: number[];
}

export interface KoaConversionResult {
	metadata: KoaMetadata;
	pngBytes: Uint8Array;
}
