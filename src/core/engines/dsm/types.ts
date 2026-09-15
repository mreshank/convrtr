export interface DsmToWavOptions {
	sampleRate?: number; // Output sample rate, default 44100
	maxDurationSeconds?: number; // Max playback limit, default 180s
	stereoSeparation?: number; // 0 (mono) to 100 (full stereo), default 75
}

export interface DsmMetadata {
	title: string;
	numChannels: number;
	numOrders: number;
	numPatterns: number;
	numSamples: number;
	durationSeconds: number;
}

export interface DsmConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: DsmMetadata;
}
