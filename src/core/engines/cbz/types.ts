export interface CbzToPdfOptions {
	fitToStandardPage?: "none" | "a4" | "letter";
}

export interface CbzExtractionResult {
	pageCount: number;
	totalPagesFound: number;
	pdfBytes: Uint8Array;
}
