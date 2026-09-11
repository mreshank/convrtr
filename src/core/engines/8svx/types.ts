/**
 * Commodore Amiga IFF 8SVX (8-bit Sampled Voice) Types
 */

export interface EightSvxVoiceHeader {
	oneShotHiSamples: number;
	repeatHiSamples: number;
	samplesPerHiCycle: number;
	samplesPerSec: number;
	octaves: number;
	compression: number; // 0 = uncompressed, 1 = Fibonacci-delta
	volume: number;
}

export interface EightSvxMetadata {
	name?: string;
	author?: string;
	annotation?: string;
	header: EightSvxVoiceHeader;
	channels: number;
	sampleRate: number;
	durationMs: number;
	sampleCount: number;
}

export interface EightSvxConversionResult {
	metadata: EightSvxMetadata;
	wavBytes: Uint8Array;
}
