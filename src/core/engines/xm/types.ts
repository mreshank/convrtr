export interface XmSample {
	name: string;
	length: number;
	loopStart: number;
	loopLength: number;
	volume: number;
	finetune: number;
	type: number;
	panning: number;
	relativeNote: number;
	data: Int16Array;
}

export interface XmInstrument {
	name: string;
	samples: XmSample[];
	sampleMapping: number[];
}

export interface XmNote {
	note: number; // 1..96 (97 = key off)
	instrument: number; // 1..128
	volume: number;
	effectType: number;
	effectParam: number;
}

export interface XmPattern {
	rows: XmNote[][];
}

export interface XmHeader {
	title: string;
	trackerName: string;
	version: number;
	songLength: number;
	restartPos: number;
	channels: number;
	patternsCount: number;
	instrumentsCount: number;
	flags: number;
	defaultTempo: number;
	defaultBpm: number;
	patternOrder: number[];
}

export interface XmConversionOptions {
	sampleRate?: number | string;
	maxDurationSeconds?: number | string;
	stereoSeparation?: number | string;
}

export interface XmMetadata {
	title: string;
	trackerName: string;
	channels: number;
	patternsCount: number;
	instrumentsCount: number;
	durationSeconds: number;
	sampleRate: number;
}

export interface XmConversionResult {
	metadata: XmMetadata;
	wavBuffer: Uint8Array;
}
