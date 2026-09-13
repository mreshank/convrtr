export interface SixSixNineSampleInfo {
	index: number;
	fileName: string;
	length: number;
	loopStart: number;
	loopEnd: number;
	loop: boolean;
}

export interface SixSixNineMetadata {
	title: string;
	artistMessage: string[];
	magic: "if" | "JN";
	numSamples: number;
	numPatterns: number;
	loopOrder: number;
	samples: SixSixNineSampleInfo[];
	durationSeconds: number;
}

export interface SixSixNineConversionOptions {
	sampleRate?: number;
	maxDurationSeconds?: number;
}

export interface SixSixNineConversionResult {
	metadata: SixSixNineMetadata;
	wavBytes: Uint8Array;
}
