export interface OsmNode {
	id: string;
	lat: number;
	lon: number;
	tags: Record<string, string>;
}

export interface OsmWay {
	id: string;
	nodeRefs: string[];
	tags: Record<string, string>;
}

export interface OsmRelationMember {
	type: "node" | "way" | "relation";
	ref: string;
	role: string;
}

export interface OsmRelation {
	id: string;
	members: OsmRelationMember[];
	tags: Record<string, string>;
}
