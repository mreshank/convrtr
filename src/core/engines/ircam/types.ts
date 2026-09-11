/**
 * IRCAM / BICSF / Sound Designer II audio format types and constants.
 */

export const IRCAM_HEADER_SIZE = 1024;

export const IRCAM_CODE_16BIT_PCM = 1;
export const IRCAM_CODE_32BIT_PCM = 2;
export const IRCAM_CODE_MULAW = 3;
export const IRCAM_CODE_32BIT_FLOAT = 4;

export interface IrcamHeader {
	isLittleEndian: boolean;
	sampleRate: number;
	channels: number;
	encoding: number;
	encodingName: string;
	dataOffset: number;
	totalSamples: number;
	durationSeconds: number;
}
