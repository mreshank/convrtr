export interface DspHeader {
	numSamples: number;
	numNibbles: number;
	sampleRate: number;
	loopFlag: boolean;
	format: number;
	loopStart: number;
	loopEnd: number;
	coefficients: number[]; // 16 signed 16-bit integers
	initialHist1: number;
	initialHist2: number;
}

export interface DspMetadata {
	sampleRate: number;
	channels: number;
	sampleCount: number;
	durationMs: number;
	looping: boolean;
	header: DspHeader;
}

export interface DspConversionResult {
	metadata: DspMetadata;
	wavBytes: Uint8Array;
}
