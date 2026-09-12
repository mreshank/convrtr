export interface S3mConversionOptions {
	sampleRate?: number;
	maxDurationSec?: number;
	panningSeparation?: number;
	gain?: number;
}

export interface S3mMetadata {
	title: string;
	trackerVersion: number;
	channelCount: number;
	orderCount: number;
	patternCount: number;
	instrumentCount: number;
	durationSec: number;
	sampleRate: number;
}

export interface S3mConversionResult {
	wavBytes: Uint8Array;
	metadata: S3mMetadata;
}
