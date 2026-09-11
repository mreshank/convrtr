/**
 * Geography Markup Language (GML) Types
 * OGC standard XML for geographic features (INSPIRE, Ordnance Survey, USGS).
 */

export interface GeoJsonGeometry {
	type:
		| "Point"
		| "MultiPoint"
		| "LineString"
		| "MultiLineString"
		| "Polygon"
		| "MultiPolygon"
		| "GeometryCollection";
	coordinates: unknown;
}

export interface GeoJsonFeature {
	type: "Feature";
	id?: string | number;
	geometry: GeoJsonGeometry | null;
	properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
	type: "FeatureCollection";
	features: GeoJsonFeature[];
	metadata?: {
		srsName?: string;
		featureCount: number;
		generator?: string;
	};
}

export interface GmlConversionOptions {
	/**
	 * Force swap coordinate order ([lat, lon] <-> [lon, lat]).
	 */
	invertAxisOrder?: boolean;
	/**
	 * Automatically detect if EPSG:4326 axis order is Lat,Lon and convert to GeoJSON standard [Lon, Lat].
	 * Default: true
	 */
	autoDetectAxis?: boolean;
	/**
	 * Strip XML namespace prefixes (e.g. "ogr:NAME" -> "NAME", "app:id" -> "id").
	 * Default: true
	 */
	stripNamespaces?: boolean;
}

export interface GmlConversionResult {
	geoJson: GeoJsonFeatureCollection;
	featureCount: number;
	geometryTypes: Record<string, number>;
	srsName?: string;
}
