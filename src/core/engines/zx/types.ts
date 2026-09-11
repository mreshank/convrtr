export interface ZxToPngOptions {
	/**
	 * Pixel scaling factor (1x = 256x192, 2x = 512x384, etc.).
	 * Defaults to 1.
	 */
	scale?: number;
	/**
	 * Invert ink and paper colors.
	 * Defaults to false.
	 */
	invertColors?: boolean;
}

export interface ZxMetadata {
	width: number;
	height: number;
	brightUsed: boolean;
	flashUsed: boolean;
	inkColorsUsed: number[];
	paperColorsUsed: number[];
}

export interface ZxConversionResult {
	metadata: ZxMetadata;
	pngBytes: Uint8Array;
}
