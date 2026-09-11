export interface VoxToWavOptions {
	/**
	 * Audio sample rate in Hz.
	 * Dialogic VOX files are raw headerless audio streams; telephony default is 8000 Hz.
	 * Common values: 6000, 8000, 11025, 16000.
	 */
	sampleRate?: number;
}

export interface VoxMetadata {
	sampleRate: number;
	channels: number;
	sampleCount: number;
	durationMs: number;
	codec: "Dialogic OKI ADPCM (4-bit)";
}

export interface VoxConversionResult {
	metadata: VoxMetadata;
	wavBytes: Uint8Array;
}
