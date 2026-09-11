export interface DcmToPngOptions {
	windowCenter?: number | string;
	windowWidth?: number | string;
	invert?: boolean | string;
}

export interface DcmMetadata {
	modality: string;
	rows: number;
	columns: number;
	bitsAllocated: number;
	bitsStored: number;
	photometricInterpretation: string;
	patientId?: string;
	studyDate?: string;
	windowCenter?: number;
	windowWidth?: number;
	rescaleIntercept?: number;
	rescaleSlope?: number;
}

export interface DcmConversionResult {
	metadata: DcmMetadata;
	pngBytes: Uint8Array;
}
