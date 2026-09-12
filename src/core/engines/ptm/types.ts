export interface PtmSampleInfo {
	index: number;
	name: string;
	fileName: string;
	length: number;
	c4Speed: number;
	volume: number;
	bits: 8 | 16;
	loop: boolean;
	loopStart: number;
	loopEnd: number;
}

export interface PtmMetadata {
	title: string;
	channels: number;
	numOrders: number;
	numPatterns: number;
	numSamples: number;
	samples: PtmSampleInfo[];
	durationSeconds: number;
}

export interface PtmConversionOptions {
	sampleRate?: number;
	maxDurationSeconds?: number;
}

export interface PtmConversionResult {
	metadata: PtmMetadata;
	wavBytes: Uint8Array;
}
