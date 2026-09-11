/**
 * Apple Core Audio Format (CAF) Types
 * Apple's high-capacity audio container format for macOS, iOS, and Logic Pro.
 */

export interface CafDesc {
	sampleRate: number;
	formatId: string;
	formatFlags: number;
	isFloat: boolean;
	isLittleEndian: boolean;
	bytesPerPacket: number;
	framesPerPacket: number;
	channelsPerFrame: number;
	bitsPerChannel: number;
}

export interface CafHeader {
	version: number;
	flags: number;
	desc: CafDesc;
	dataOffset: number;
	dataLength: number;
}

export interface CafConversionOptions {
	targetBitDepth?: 16;
}

export interface CafConversionResult {
	wavBuffer: Uint8Array;
	sampleRate: number;
	channels: number;
	durationSeconds: number;
	formatId: string;
}
