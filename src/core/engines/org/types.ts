export interface OrgToMarkdownOptions {
	includeFrontmatter?: boolean;
	checkboxStyle?: "github" | "standard";
}

export interface OrgMetadata {
	title?: string;
	author?: string;
	date?: string;
	tags?: string[];
	headingsCount: number;
	todoCount: number;
}

export interface OrgConversionResult {
	metadata: OrgMetadata;
	markdown: string;
}
