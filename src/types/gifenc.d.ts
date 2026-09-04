/**
 * gifenc ships no type declarations, so these are written from its source
 * (`src/index.js`, `src/pnnquant2.js`, `src/palettize.js`) rather than from
 * its README, which documents only the common path.
 *
 * Deliberately narrow: it declares the surface this project actually uses. A
 * wider guess would be a worse lie than an omission, because a wrong signature
 * type-checks right up until it fails at runtime.
 */
declare module "gifenc" {
	/** An RGB or RGBA palette entry, 0-255 per channel. */
	export type Palette = number[][];

	export type QuantizeOptions = {
		/** Pixel packing used for quantisation. Defaults to "rgb565". */
		format?: "rgb565" | "rgb444" | "rgba4444";
		clearAlpha?: boolean;
		clearAlphaColor?: number;
		clearAlphaThreshold?: number;
		oneBitAlpha?: boolean;
	};

	/** Builds a palette of at most `maxColors` entries from RGBA pixels. */
	export function quantize(
		rgba: Uint8Array | Uint8ClampedArray,
		maxColors: number,
		options?: QuantizeOptions,
	): Palette;

	/** Maps RGBA pixels onto `palette`, returning one palette index per pixel. */
	export function applyPalette(
		rgba: Uint8Array | Uint8ClampedArray,
		palette: Palette,
		format?: "rgb565" | "rgb444" | "rgba4444",
	): Uint8Array;

	export type WriteFrameOptions = {
		/** Written as this frame's colour table; the first frame's becomes the global one. */
		palette?: Palette | null;
		/** Frame duration in milliseconds. GIF stores hundredths, so this is rounded. */
		delay?: number;
		/** -1 plays once, 0 loops forever, >0 repeats that many times. */
		repeat?: number;
		transparent?: boolean;
		transparentIndex?: number;
		colorDepth?: number;
		dispose?: number;
	};

	export type GifEncoder = {
		writeFrame(
			index: Uint8Array,
			width: number,
			height: number,
			options?: WriteFrameOptions,
		): void;
		/** Writes the end-of-stream marker. Must be called before `bytes()`. */
		finish(): void;
		bytes(): Uint8Array;
	};

	export function GIFEncoder(options?: { auto?: boolean }): GifEncoder;
}
