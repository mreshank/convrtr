export interface AcoColor {
	name: string;
	slug: string;
	hex: string;
	rgb: [number, number, number];
	hsl: [number, number, number];
	space: string;
}

export interface AcoToCssOptions {
	format?: "css" | "tailwind" | "json";
}

export interface AcoParseResult {
	colors: AcoColor[];
	cssText: string;
	version: number;
}
