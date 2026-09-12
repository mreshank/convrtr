export interface NeoMetadata {
	resolution: "low" | "medium" | "high";
	width: number;
	height: number;
	palette: Array<[number, number, number]>;
}

export interface NeoConversionOptions {
	aspectCorrect?: boolean;
}

export interface NeoConversionResult {
	metadata: NeoMetadata;
	pngBytes: Uint8Array;
}
