export interface RolConversionOptions {
	sampleRate?: number;
	tempo?: number;
}

export interface RolMetadata {
	version: number;
	tempo: number;
	voiceCount: number;
	durationSeconds: number;
	sampleRate: number;
}

export interface RolConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: RolMetadata;
}
