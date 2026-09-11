/**
 * PlayStation 1 TIM color modes.
 */
export type TimColorMode =
	| "4bit" // 16 colors per CLUT
	| "8bit" // 256 colors per CLUT
	| "15bit" // 15-bit direct color (RGB555 + STP)
	| "24bit" // 24-bit direct color (RGB888)
	| "mixed";

export interface TimClutInfo {
	x: number;
	y: number;
	width: number;
	height: number;
	colors: Uint8Array; // Raw RGBA palette entries (width * height * 4)
	paletteCount: number;
}

export interface TimImageMetadata {
	mode: TimColorMode;
	hasClut: boolean;
	width: number;
	height: number;
	vramX: number;
	vramY: number;
	clut?: TimClutInfo;
}

export interface TimToPngOptions {
	/**
	 * For multi-palette images, zero-based index of the palette to render.
	 * Defaults to 0.
	 */
	paletteIndex?: number;
	/**
	 * Enable STP (Semi-Transparency Processing) handling.
	 * Defaults to true (0,0,0 with STP=0 is transparent).
	 */
	enableTransparency?: boolean;
}

export interface TimConversionResult {
	metadata: TimImageMetadata;
	pngBytes: Uint8Array;
}
