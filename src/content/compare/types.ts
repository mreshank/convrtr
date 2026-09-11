export type ComparisonSpec = {
	feature: string;
	formatA: string;
	formatB: string;
};

export type ComparisonMeta = {
	slug: string;
	title: string;
	description: string;
	formatA: string;
	formatB: string;
	category: string;
	summary: string;
	prosA: string[];
	prosB: string[];
	specs: ComparisonSpec[];
	verdict: string;
	relatedTools: string[];
};
