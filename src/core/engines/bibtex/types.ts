export interface BibtexEntry {
	key: string;
	type: string;
	title?: string;
	authors?: string[];
	year?: string;
	journal?: string;
	booktitle?: string;
	volume?: string;
	number?: string;
	pages?: string;
	doi?: string;
	url?: string;
	publisher?: string;
	abstract?: string;
	fields: Record<string, string>;
}

export interface BibtexToMarkdownOptions {
	format?: "table" | "list" | "json";
	includeAbstract?: boolean;
}

export interface BibtexConversionResult {
	markdown: string;
	entries: BibtexEntry[];
	entryCount: number;
}
