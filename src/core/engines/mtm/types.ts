export interface MtmConversionOptions {
	/** Sample rate in Hz (default: 44100) */
	sampleRate?: number;
	/** Stereo separation percentage (0 to 100, default: 70) */
	stereoSeparation?: number;
	/** Number of loop repetitions if song loops (default: 0) */
	loopCount?: number;
}

export interface MtmMetadata {
	title: string;
	numTracks: number;
	numPatterns: number;
	numOrders: number;
	numSamples: number;
	numChannels: number;
	durationSeconds: number;
}

export interface MtmConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: MtmMetadata;
}
