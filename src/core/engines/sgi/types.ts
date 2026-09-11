/**
 * Silicon Graphics SGI / Iris (.rgb, .rgba, .sgi, .bw) image format types.
 */

export const SGI_MAGIC = 0x01da;
export const SGI_HEADER_SIZE = 512;

export const SGI_STORAGE_VERBATIM = 0;
export const SGI_STORAGE_RLE = 1;

export interface SgiHeader {
	magic: number;
	storage: number;
	bpc: number;
	dimension: number;
	width: number;
	height: number;
	channels: number;
	pixmin: number;
	pixmax: number;
	name: string;
	colormap: number;
}
