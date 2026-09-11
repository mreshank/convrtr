export interface UlawToWavOptions {
	/**
	 * G.711 companding algorithm: "mulaw" (North American / Japanese u-law)
	 * or "alaw" (European / International A-law).
	 * Defaults to "mulaw".
	 */
	codec?: "mulaw" | "alaw";
	/**
	 * Audio sample rate in Hz. Telephony standard is 8,000 Hz (8 kHz).
	 * Common values: 8000, 16000, 11025, 44100.
	 */
	sampleRate?: number;
}

export interface UlawMetadata {
	sampleRate: number;
	channels: number;
	sampleCount: number;
	durationMs: number;
	codec: "G.711 mu-law" | "G.711 A-law";
}

export interface UlawConversionResult {
	metadata: UlawMetadata;
	wavBytes: Uint8Array;
}
