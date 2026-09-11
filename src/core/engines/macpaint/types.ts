export interface MacPaintOptions {
	/**
	 * Render white pixels as transparent.
	 * Defaults to false (white background).
	 */
	transparentBackground?: boolean;
	/**
	 * Invert colors (black becomes white, white becomes black).
	 * Defaults to false.
	 */
	invertColors?: boolean;
}

export interface MacPaintMetadata {
	width: number;
	height: number;
	version: number;
	patternCount: number;
	uncompressedBytes: number;
}

export interface MacPaintConversionResult {
	metadata: MacPaintMetadata;
	pngBytes: Uint8Array;
}
