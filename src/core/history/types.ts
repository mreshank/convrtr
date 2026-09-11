export type ConversionHistoryRecord = {
	id: string;
	toolId: string;
	category: string;
	inputName: string;
	inputSize: number;
	outputName: string;
	outputSize: number;
	durationMs: number;
	timestamp: number;
	status: "success" | "error";
	errorMessage?: string;
};

export type HistoryStats = {
	totalConversions: number;
	totalInputBytes: number;
	totalOutputBytes: number;
	totalDurationMs: number;
};
