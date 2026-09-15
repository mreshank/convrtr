export interface BlpConversionOptions {
	mipmapLevel?: number;
}

export interface BlpMetadata {
	version: "BLP1" | "BLP2";
	type: number;
	compressionName: string;
	width: number;
	height: number;
	alphaDepth: number;
	hasMipmaps: boolean;
	pngBytes: Uint8Array;
}

export interface BlpConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: BlpMetadata;
}
