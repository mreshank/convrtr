export interface RadConversionOptions {
	/** Sample rate in Hz (default: 44100) */
	sampleRate?: number;
	/** Number of loop repetitions if song loops (default: 0) */
	loopCount?: number;
	/** Stereo separation percentage (0 to 100, default: 70) */
	stereoSeparation?: number;
}

export interface RadMetadata {
	title: string;
	version: number;
	numInstruments: number;
	numPatterns: number;
	numOrders: number;
	speed: number;
	bpm: number;
	durationSeconds: number;
}

export interface RadConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: RadMetadata;
}
