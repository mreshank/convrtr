export interface AmrConversionOptions {
	sampleRate?: number;
	stereo?: boolean;
}

export interface AmrMetadata {
	format: "AMR-NB" | "AMR-WB";
	sampleRate: number;
	channels: number;
	durationSeconds: number;
	frameCount: number;
	bitrateKbps: number;
	modeDistribution: Record<string, number>;
}

export interface AmrConversionResult {
	wavBuffer: ArrayBuffer;
	metadata: AmrMetadata;
}
