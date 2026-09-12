export interface OpmlHead {
	title?: string;
	dateCreated?: string;
	dateModified?: string;
	ownerName?: string;
	ownerEmail?: string;
}

export interface OpmlOutlineNode {
	text: string;
	title?: string;
	type?: string;
	xmlUrl?: string;
	htmlUrl?: string;
	url?: string;
	description?: string;
	note?: string;
	status?: "checked" | "unchecked";
	category?: string;
	children: OpmlOutlineNode[];
}

export interface OpmlDocument {
	version: string;
	head: OpmlHead;
	body: OpmlOutlineNode[];
}

export interface OpmlConversionOptions {
	includeFrontmatter?: boolean;
	renderFeedsAsTable?: boolean;
}

export interface OpmlConversionResult {
	markdown: string;
	document: OpmlDocument;
	stats: {
		totalNodes: number;
		feedCount: number;
		outlineDepth: number;
	};
}
