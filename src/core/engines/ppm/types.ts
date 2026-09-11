export type NetpbmFormat = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";

export interface NetpbmImage {
	format: NetpbmFormat;
	width: number;
	height: number;
	maxVal: number;
	rgba: Uint8Array;
}

export interface PpmToPngOptions {
	invertMonochrome?: boolean;
}
