export interface AmfConversionOptions {
	sampleRate?: number;
	stereoSeparation?: number; // 0..1 (default: 0.8)
	maxDurationSeconds?: number;
}

export interface AmfSampleInfo {
	index: number;
	name: string;
	length: number;
	volume: number;
	c2Spd: number;
	loopStart: number;
	loopEnd: number;
	hasLoop: boolean;
}

export interface AmfMetadata {
	title: string;
	formatVersion: string;
	channels: number;
	numOrders: number;
	numPatterns: number;
	numSamples: number;
	samples: AmfSampleInfo[];
	durationSeconds: number;
}

export interface AmfConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: AmfMetadata;
}
