export interface AudToWavOptions {
	sampleRateOverride?: number | string;
}

export interface AudMetadata {
	sampleRate: number;
	channels: number;
	compressionType: number;
	compressionName: string;
	bitsPerSample: number;
	sampleCount: number;
	durationMs: number;
}

export interface AudConversionResult {
	metadata: AudMetadata;
	wavBytes: Uint8Array;
}
