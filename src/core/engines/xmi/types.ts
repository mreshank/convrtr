export interface XmiConversionOptions {
	sampleRate?: number;
	tempo?: number;
}

export interface XmiMetadata {
	formType: string;
	trackCount: number;
	sequenceCount: number;
	durationSeconds: number;
	sampleRate: number;
}

export interface XmiConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: XmiMetadata;
}
