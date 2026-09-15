export interface XcurToPngOptions {
	size?: number; // Preferred nominal cursor size (e.g. 24, 32, 48). If not found, uses largest available.
}

export interface XcurCursorFrame {
	width: number;
	height: number;
	xhot: number;
	yhot: number;
	delay: number;
	nominalSize: number;
}

export interface XcurMetadata {
	width: number;
	height: number;
	xhot: number;
	yhot: number;
	availableSizes: number[];
	frameCount: number;
}

export interface XcurConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: XcurMetadata;
}
