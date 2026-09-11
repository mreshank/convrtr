/**
 * Flexible Image Transport System (FITS) Types
 * Standard astronomical format used by NASA, ESA, Hubble, and James Webb.
 */

export type FitsBitpix = 8 | 16 | 32 | 64 | -32 | -64;

export type FitsStretchMode = "minmax" | "percentile" | "asinh" | "linear";

export interface FitsHeader {
	simple: boolean;
	bitpix: FitsBitpix;
	naxis: number;
	naxis1: number; // Width
	naxis2: number; // Height
	naxis3?: number; // Slices/depth if 3D
	bscale: number;
	bzero: number;
	extend?: boolean;
	objectName?: string;
	telescope?: string;
	instrument?: string;
	dateObs?: string;
	exposureTime?: number;
	filter?: string;
	metadata: Record<string, string | number | boolean>;
	headerBytes: number;
}

export interface FitsConversionOptions {
	stretch?: FitsStretchMode;
	invertY?: boolean;
	sliceIndex?: number;
	percentileLow?: number; // e.g. 0.5%
	percentileHigh?: number; // e.g. 99.5%
}

export interface FitsConversionResult {
	pngBuffer: Uint8Array;
	width: number;
	height: number;
	bitpix: FitsBitpix;
	minValue: number;
	maxValue: number;
	metadata: Record<string, string | number | boolean>;
}
