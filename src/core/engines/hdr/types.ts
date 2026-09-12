export interface HdrConversionOptions {
	/**
	 * Exposure adjustment factor. Default is 1.0 (no multiplier).
	 */
	exposure?: number;
	/**
	 * Desired gamma exponent. Default is 2.2 for standard sRGB displays.
	 */
	gamma?: number;
}

export interface HdrMetadata {
	width: number;
	height: number;
	format: string;
	exposure: number;
	gamma: number;
}

export interface HdrConversionResult {
	metadata: HdrMetadata;
	pngBytes: Uint8Array;
}
