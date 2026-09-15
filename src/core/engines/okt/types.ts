export interface OktConversionOptions {
	/** Sample rate in Hz (default: 44100) */
	sampleRate?: number;
	/** Stereo separation percentage (0 to 100, default: 80) */
	stereoSeparation?: number;
	/** Number of loop repetitions if song loops (default: 0) */
	loopCount?: number;
}

export interface OktMetadata {
	title: string;
	numChannels: number;
	numSamples: number;
	numPatterns: number;
	numOrders: number;
	speed: number;
	durationSeconds: number;
}

export interface OktConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: OktMetadata;
}
