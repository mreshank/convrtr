export interface VagToWavOptions {
	normalize?: boolean | string;
}

export interface VagMetadata {
	sampleRate: number;
	channels: number;
	sampleCount: number;
	durationMs: number;
	name: string;
	version: number;
}

export interface VagConversionResult {
	metadata: VagMetadata;
	wavBytes: Uint8Array;
}
