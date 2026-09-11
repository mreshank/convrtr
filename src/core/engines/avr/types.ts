export interface AvrToWavOptions {
	normalize?: boolean;
}

export interface AvrMetadata {
	sampleName: string;
	channels: number;
	sampleRate: number;
	bitsPerSample: number;
	isSigned: boolean;
	isLooping: boolean;
	numSamples: number;
	durationSeconds: number;
	userComment: string;
}

export interface AvrConversionResult {
	metadata: AvrMetadata;
	wavBytes: Uint8Array;
}
