/**
 * Amiga ProTracker / Ultimate SoundTracker (.mod) Types
 * Iconic 4-channel retro tracker format from Commodore Amiga and Demoscene.
 */

export interface ModSample {
	name: string;
	length: number; // In bytes
	finetune: number; // -8 to +7
	volume: number; // 0 to 64
	repeatOffset: number; // In bytes
	repeatLength: number; // In bytes (> 2 means loop)
	data: Int8Array;
}

export interface ModNote {
	sampleNumber: number; // 0..31
	period: number; // Amiga period
	effect: number; // 0..15
	param: number; // 0..255
}

export interface ModPattern {
	rows: ModNote[][]; // 64 rows, each has N channel notes
}

export interface ModHeader {
	title: string;
	samples: ModSample[];
	songLength: number;
	restartPos: number;
	patternTable: number[];
	formatTag: string;
	channels: number;
	numPatterns: number;
}

export interface ModConversionOptions {
	sampleRate?: number; // Default: 44100
	maxDurationSeconds?: number; // Default: 180
	stereoSeparation?: number; // 0.0 (mono) to 1.0 (hard Amiga left/right). Default: 0.65
}

export interface ModConversionResult {
	wavBuffer: Uint8Array;
	title: string;
	channels: number;
	durationSeconds: number;
	sampleRate: number;
	songLength: number;
}
