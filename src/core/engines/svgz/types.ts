/**
 * Compressed SVG (SVGZ) Types
 * Gzip-compressed vector format used by Illustrator, Inkscape, and GIS mapping.
 */

export interface SvgzConversionOptions {
	prettyPrint?: boolean;
}

export interface SvgzConversionResult {
	svgText: string;
	svgBuffer: Uint8Array;
	width?: string;
	height?: string;
	viewBox?: string;
}
