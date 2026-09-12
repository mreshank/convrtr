export interface ItConversionOptions {
	sampleRate?: number;
	maxDurationSec?: number;
	panningSeparation?: number;
	gain?: number;
}

export interface ItMetadata {
	title: string;
	channelCount: number;
	orderCount: number;
	patternCount: number;
	sampleCount: number;
	instrumentCount: number;
	durationSec: number;
	sampleRate: number;
}

export interface ItConversionResult {
	wavBytes: Uint8Array;
	metadata: ItMetadata;
}

export interface ItSample {
	name: string;
	filename: string;
	length: number;
	loopStart: number;
	loopEnd: number;
	c5Speed: number;
	volume: number;
	globalVolume: number;
	panning: number;
	is16Bit: boolean;
	isStereo: boolean;
	hasLoop: boolean;
	data: Int16Array;
}

export interface ItPatternCell {
	note?: number; // 0..119 (60 = C-5), 254 = cut, 255 = fade
	sample?: number; // 1-based sample index
	volume?: number; // 0..64 volume, or pan
	command?: number;
	param?: number;
}

export interface ItPattern {
	rows: number;
	// cells[row][channel]
	data: Map<number, ItPatternCell>[];
}

export interface ItModule {
	title: string;
	orders: number[];
	samples: ItSample[];
	patterns: ItPattern[];
	initialSpeed: number;
	initialTempo: number;
	globalVolume: number;
	mixVolume: number;
	channelPan: number[];
	channelVolume: number[];
}
