export interface FarConversionOptions {
	sampleRate?: number;
	stereoSeparation?: number; // 0..1 (default: 0.8)
	maxDurationSeconds?: number;
}

export interface FarSampleInfo {
	index: number;
	name: string;
	length: number;
	volume: number;
	loopStart: number;
	loopEnd: number;
	hasLoop: boolean;
}

export interface FarMetadata {
	title: string;
	version: number;
	channels: number;
	numOrders: number;
	numPatterns: number;
	numSamples: number;
	message?: string;
	samples: FarSampleInfo[];
	durationSeconds: number;
}

export interface FarConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: FarMetadata;
}
