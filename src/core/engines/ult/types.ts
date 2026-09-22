export interface UltConversionOptions {
	sampleRate?: number;
}

export interface UltSampleInfo {
	name: string;
	length: number;
	loopStart: number;
	loopEnd: number;
	looped: boolean;
	pingpong: boolean;
	bits: number;
	volume: number;
	c5rate: number;
}

export interface UltMetadata {
	title: string;
	version: string;
	numSamples: number;
	numChannels: number;
	numPatterns: number;
	samples: UltSampleInfo[];
	durationSeconds: number;
}

export interface UltConversionResult {
	metadata: UltMetadata;
	wavBytes: Uint8Array;
}
