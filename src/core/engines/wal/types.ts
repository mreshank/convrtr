export interface WalConversionOptions {
	mipmapLevel?: number;
	palette?: Uint8Array;
}

export interface WalMetadata {
	name: string;
	animName: string;
	width: number;
	height: number;
	flags: number;
	contents: number;
	value: number;
	mipmapOffsets: number[];
	selectedMipmap: number;
}

export interface WalConversionResult {
	pngBuffer: ArrayBuffer;
	metadata: WalMetadata;
}
