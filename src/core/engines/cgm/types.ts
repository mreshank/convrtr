export interface CgmConversionOptions {
	backgroundColor?: string;
	viewBoxPadding?: number;
	scaleLineWidth?: number;
}

export interface CgmMetadata {
	title: string;
	description?: string;
	width: number;
	height: number;
	elementCount: number;
	primitiveCounts: {
		polylines: number;
		polygons: number;
		circles: number;
		rectangles: number;
		text: number;
	};
}

export interface CgmConversionResult {
	svg: string;
	metadata: CgmMetadata;
}
