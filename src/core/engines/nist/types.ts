/**
 * NIST SPHERE (.sph, .nist) audio format types and constants.
 */

export interface NistHeader {
	headerSize: number;
	channels: number;
	sampleRate: number;
	bytesPerSample: number;
	byteFormat: string; // "01" = little-endian, "10" = big-endian
	coding: string; // "pcm", "ulaw", "alaw"
	sampleCount: number;
}
