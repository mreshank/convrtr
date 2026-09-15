export interface ImfConversionOptions {
	sampleRate?: number;
	clockRate?: number;
	stereo?: boolean;
}

export interface ImfMetadata {
	format: "IMF-Type0" | "IMF-Type1";
	clockRate: number;
	sampleRate: number;
	channels: number;
	durationSeconds: number;
	eventCount: number;
	totalTicks: number;
}

export interface ImfConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: ImfMetadata;
}
