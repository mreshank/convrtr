/**
 * Microsoft Windows Icon (.ico / favicon.ico) Types
 */

export interface IcoDirectoryEntry {
	index: number;
	width: number;
	height: number;
	colorCount: number;
	planes: number;
	bitCount: number;
	bytesInRes: number;
	imageOffset: number;
	isPng: boolean;
}

export interface IcoExtractionResult {
	width: number;
	height: number;
	pngData: Uint8Array;
	entryCount: number;
	entries: IcoDirectoryEntry[];
}

export interface IcoToPngOptions {
	/**
	 * Preferred icon size to extract (e.g. 256, 128, 64, 48, 32, 16).
	 * If omitted or not found, extracts the largest highest-fidelity icon available.
	 */
	preferredSize?: number;
}
