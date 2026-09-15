export type PcdResolution = "base" | "base4" | "base16";

export interface PcdConversionOptions {
	resolution?: PcdResolution;
}

export interface PcdMetadata {
	width: number;
	height: number;
	resolution: PcdResolution;
	orientation: number;
	colorSpace: string;
}

export interface PcdConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: PcdMetadata;
}
