/**
 * Sun Raster (.ras, .sun, .rast) format constants and data types.
 */

export const RAS_MAGIC = 0x59a66a95;

export const RAS_TYPE_OLD = 0;
export const RAS_TYPE_STANDARD = 1;
export const RAS_TYPE_BYTE_ENCODED = 2; // RLE compression
export const RAS_TYPE_FORMAT_RGB = 3; // RGB color order
export const RAS_TYPE_FORMAT_TIFF = 4;
export const RAS_TYPE_FORMAT_IFF = 5;

export const RAS_MAPTYPE_NONE = 0;
export const RAS_MAPTYPE_EQUAL_RGB = 1;
export const RAS_MAPTYPE_RAW = 2;

export interface RasHeader {
	magic: number;
	width: number;
	height: number;
	depth: number;
	length: number;
	type: number;
	maptype: number;
	maplength: number;
}

export interface RasMetadata {
	width: number;
	height: number;
	depth: number;
	type: number;
	maptype: number;
	maplength: number;
}
