export interface StmConversionOptions {
	sampleRate?: number;
}

export interface StmSampleInfo {
	name: string;
	length: number;
	loopStart: number;
	loopEnd: number;
	looped: boolean;
	defaultVolume: number;
	middleCRate: number;
}

export interface StmMetadata {
	title: string;
	programId: string;
	version: string;
	fileType: number;
	tempoByte: number;
	numPatterns: number;
	globalVolume: number;
	numSamples: number;
	samples: StmSampleInfo[];
	durationSeconds: number;
}

export interface StmConversionResult {
	metadata: StmMetadata;
	wavBytes: Uint8Array;
}
