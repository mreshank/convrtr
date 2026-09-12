export interface OraLayer {
	name: string;
	src: string;
	x: number;
	y: number;
	opacity: number;
	visibility: "visible" | "hidden";
	compositeOp: string;
}

export interface OraStack {
	width: number;
	height: number;
	layers: OraLayer[];
}

export interface OraConversionOptions {
	preferMergedImage?: boolean;
}

export interface OraConversionResult {
	pngBytes: Uint8Array;
	stack: OraStack;
	extractedFrom: "mergedimage" | "layer";
}
