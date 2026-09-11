import type { OsmNode, OsmRelation, OsmRelationMember, OsmWay } from "./types";

const AREA_TAG_KEYS = new Set([
	"building",
	"landuse",
	"leisure",
	"natural",
	"amenity",
	"tourism",
	"historic",
	"boundary",
	"shop",
	"craft",
	"office",
	"place",
	"aeroway",
]);

const LINE_TAG_KEYS = new Set([
	"highway",
	"barrier",
	"railway",
	"waterway",
	"power",
	"man_made",
	"pipeline",
	"route",
]);

function isArea(tags: Record<string, string>): boolean {
	if (tags.area === "no") return false;
	if (tags.area === "yes") return true;

	for (const key of Object.keys(tags)) {
		if (AREA_TAG_KEYS.has(key)) return true;
	}

	return false;
}

function parseAttributes(tagStr: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const regex = /([a-zA-Z0-9_:-]+)=["']([^"']*)["']/g;
	let match: RegExpExecArray | null = regex.exec(tagStr);
	while (match !== null) {
		const key = match[1];
		const val = match[2];
		if (key && val !== undefined) {
			attrs[key] = val;
		}
		match = regex.exec(tagStr);
	}
	return attrs;
}

/**
 * Parses OSM XML string into nodes, ways, and relations.
 */
export function parseOsmXml(xml: string): {
	nodes: Map<string, OsmNode>;
	ways: OsmWay[];
	relations: OsmRelation[];
} {
	const nodes = new Map<string, OsmNode>();
	const ways: OsmWay[] = [];
	const relations: OsmRelation[] = [];

	// Parse nodes: both self-closing <node .../> and full <node ...>...</node>
	const nodeBlockRegex = /<node\b([^>]*?)(\/>|>([\s\S]*?)<\/node>)/gi;
	let match: RegExpExecArray | null = nodeBlockRegex.exec(xml);

	while (match !== null) {
		const attrsStr = match[1] ?? "";
		const content = match[3] ?? "";
		const attrs = parseAttributes(attrsStr);
		const id = attrs.id;
		const lat = Number.parseFloat(attrs.lat ?? "");
		const lon = Number.parseFloat(attrs.lon ?? "");

		if (id && !Number.isNaN(lat) && !Number.isNaN(lon)) {
			const tags: Record<string, string> = {};
			if (content) {
				const tagRegex = /<tag\b([^>]*?)\/?>/gi;
				let tagMatch: RegExpExecArray | null = tagRegex.exec(content);
				while (tagMatch !== null) {
					const tAttrs = parseAttributes(tagMatch[1] ?? "");
					if (tAttrs.k && tAttrs.v !== undefined) {
						tags[tAttrs.k] = tAttrs.v;
					}
					tagMatch = tagRegex.exec(content);
				}
			}
			nodes.set(id, { id, lat, lon, tags });
		}

		match = nodeBlockRegex.exec(xml);
	}

	// Parse ways: <way ...>...</way>
	const wayBlockRegex = /<way\b([^>]*?)>([\s\S]*?)<\/way>/gi;
	match = wayBlockRegex.exec(xml);

	while (match !== null) {
		const attrs = parseAttributes(match[1] ?? "");
		const content = match[2] ?? "";
		const id = attrs.id;

		if (id) {
			const nodeRefs: string[] = [];
			const tags: Record<string, string> = {};

			const childRegex = /<(nd|tag)\b([^>]*?)\/?>/gi;
			let childMatch: RegExpExecArray | null = childRegex.exec(content);
			while (childMatch !== null) {
				const type = childMatch[1];
				const cAttrs = parseAttributes(childMatch[2] ?? "");
				if (type === "nd" && cAttrs.ref) {
					nodeRefs.push(cAttrs.ref);
				} else if (type === "tag" && cAttrs.k && cAttrs.v !== undefined) {
					tags[cAttrs.k] = cAttrs.v;
				}
				childMatch = childRegex.exec(content);
			}

			if (nodeRefs.length > 0) {
				ways.push({ id, nodeRefs, tags });
			}
		}

		match = wayBlockRegex.exec(xml);
	}

	// Parse relations: <relation ...>...</relation>
	const relationBlockRegex = /<relation\b([^>]*?)>([\s\S]*?)<\/relation>/gi;
	match = relationBlockRegex.exec(xml);

	while (match !== null) {
		const attrs = parseAttributes(match[1] ?? "");
		const content = match[2] ?? "";
		const id = attrs.id;

		if (id) {
			const members: OsmRelationMember[] = [];
			const tags: Record<string, string> = {};

			const childRegex = /<(member|tag)\b([^>]*?)\/?>/gi;
			let childMatch: RegExpExecArray | null = childRegex.exec(content);
			while (childMatch !== null) {
				const type = childMatch[1];
				const cAttrs = parseAttributes(childMatch[2] ?? "");
				if (type === "member" && cAttrs.ref && cAttrs.type) {
					const mType =
						cAttrs.type === "way" ||
						cAttrs.type === "node" ||
						cAttrs.type === "relation"
							? cAttrs.type
							: "way";
					members.push({
						type: mType,
						ref: cAttrs.ref,
						role: cAttrs.role ?? "",
					});
				} else if (type === "tag" && cAttrs.k && cAttrs.v !== undefined) {
					tags[cAttrs.k] = cAttrs.v;
				}
				childMatch = childRegex.exec(content);
			}

			relations.push({ id, members, tags });
		}

		match = relationBlockRegex.exec(xml);
	}

	return { nodes, ways, relations };
}

/**
 * Converts OpenStreetMap (.osm) XML into an RFC 7946 GeoJSON FeatureCollection.
 */
export async function convertOsmToGeoJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<Uint8Array> {
	onProgress?.(0.1, "Reading OpenStreetMap XML");
	const text = new TextDecoder("utf-8").decode(input);

	if (!text.includes("<osm") && !text.includes("<node")) {
		throw new Error(
			"Invalid OpenStreetMap file: Missing <osm> or <node> elements",
		);
	}

	onProgress?.(0.3, "Parsing nodes, ways, and relations");
	const { nodes, ways, relations } = parseOsmXml(text);

	onProgress?.(0.6, "Synthesizing GeoJSON vector geometries");
	const features: Record<string, unknown>[] = [];
	const wayMap = new Map<string, OsmWay>();
	for (const way of ways) {
		wayMap.set(way.id, way);
	}

	// 1. Process Nodes with meaningful tags (Points)
	for (const node of nodes.values()) {
		const tagKeys = Object.keys(node.tags).filter(
			(k) => k !== "created_by" && k !== "source",
		);
		if (tagKeys.length > 0) {
			features.push({
				type: "Feature",
				id: `node/${node.id}`,
				geometry: {
					type: "Point",
					coordinates: [node.lon, node.lat],
				},
				properties: {
					...node.tags,
					"@id": `node/${node.id}`,
				},
			});
		}
	}

	// Track ways consumed by multipolygons so we don't duplicate them as standalone lines
	const consumedWayIds = new Set<string>();

	// 2. Process Multipolygon Relations
	for (const rel of relations) {
		if (rel.tags.type === "multipolygon" || rel.tags.type === "boundary") {
			const outerWays: OsmWay[] = [];
			const innerWays: OsmWay[] = [];

			for (const member of rel.members) {
				if (member.type === "way") {
					const w = wayMap.get(member.ref);
					if (w) {
						if (member.role === "inner") {
							innerWays.push(w);
						} else {
							outerWays.push(w);
						}
						consumedWayIds.add(w.id);
					}
				}
			}

			// Assemble coordinates
			const coordinates: [number, number][][][] = [];

			for (const outer of outerWays) {
				const outerCoords: [number, number][] = [];
				for (const ref of outer.nodeRefs) {
					const n = nodes.get(ref);
					if (n) outerCoords.push([n.lon, n.lat]);
				}
				if (outerCoords.length >= 3) {
					const polygonRings: [number, number][][] = [outerCoords];
					for (const inner of innerWays) {
						const innerCoords: [number, number][] = [];
						for (const ref of inner.nodeRefs) {
							const n = nodes.get(ref);
							if (n) innerCoords.push([n.lon, n.lat]);
						}
						if (innerCoords.length >= 3) {
							polygonRings.push(innerCoords);
						}
					}
					coordinates.push(polygonRings);
				}
			}

			if (coordinates.length === 1 && coordinates[0]) {
				features.push({
					type: "Feature",
					id: `relation/${rel.id}`,
					geometry: {
						type: "Polygon",
						coordinates: coordinates[0],
					},
					properties: {
						...rel.tags,
						"@id": `relation/${rel.id}`,
					},
				});
			} else if (coordinates.length > 1) {
				features.push({
					type: "Feature",
					id: `relation/${rel.id}`,
					geometry: {
						type: "MultiPolygon",
						coordinates,
					},
					properties: {
						...rel.tags,
						"@id": `relation/${rel.id}`,
					},
				});
			}
		}
	}

	// 3. Process Ways (Lines & Polygons)
	for (const way of ways) {
		if (consumedWayIds.has(way.id)) continue;

		const coords: [number, number][] = [];
		for (const ref of way.nodeRefs) {
			const n = nodes.get(ref);
			if (n) coords.push([n.lon, n.lat]);
		}

		if (coords.length < 2) continue;

		const isClosed =
			coords.length >= 4 &&
			way.nodeRefs[0] === way.nodeRefs[way.nodeRefs.length - 1];

		const hasLineTag = Object.keys(way.tags).some((k) => LINE_TAG_KEYS.has(k));
		const treatsAsArea =
			isClosed &&
			(isArea(way.tags) || (!hasLineTag && Object.keys(way.tags).length > 0));

		if (treatsAsArea) {
			features.push({
				type: "Feature",
				id: `way/${way.id}`,
				geometry: {
					type: "Polygon",
					coordinates: [coords],
				},
				properties: {
					...way.tags,
					"@id": `way/${way.id}`,
				},
			});
		} else {
			features.push({
				type: "Feature",
				id: `way/${way.id}`,
				geometry: {
					type: "LineString",
					coordinates: coords,
				},
				properties: {
					...way.tags,
					"@id": `way/${way.id}`,
				},
			});
		}
	}

	onProgress?.(0.9, "Serializing GeoJSON");
	const geojson = {
		type: "FeatureCollection",
		generator: "convrtr",
		features,
	};

	const jsonStr = JSON.stringify(geojson, null, 2);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(jsonStr);
}
