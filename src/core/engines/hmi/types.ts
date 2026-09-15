export interface HmiConversionOptions {
	sampleRate?: number;
	tempo?: number;
}

export interface HmiMetadata {
	version: string;
	trackCount: number;
	division: number;
	durationSeconds: number;
	sampleRate: number;
}

export interface HmiConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: HmiMetadata;
}
