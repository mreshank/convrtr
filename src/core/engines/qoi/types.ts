export interface QoiConversionOptions {
	forceAlpha?: boolean;
}

export interface QoiMetadata {
	width: number;
	height: number;
	channels: number;
	colorspace: number;
	fileSize: number;
}

export interface QoiConversionResult {
	pngBytes: Uint8Array;
	metadata: QoiMetadata;
}
