import type { Tool } from "../../types";

export const gmlToGeoJson: Tool = {
	id: "document/gml-to-geojson",
	slug: "gml-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/gml+xml",
			"text/xml",
			"application/xml",
			"application/octet-stream",
		],
		ext: ["gml"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:gml-to-geojson"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard GeoJSON (RFC 7946)",
				explanation:
					"Converts OGC GML 2.x and 3.x XML spatial features, boundaries, polygons, and attributes into standard RFC 7946 GeoJSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"GML to GeoJSON — Convert Geography Markup Language (.gml) to GeoJSON | convrtr",
		h1: "Convert GML (Geography Markup Language) to GeoJSON",
		intent:
			"Convert OGC GML files (.gml) from INSPIRE, Ordnance Survey, USGS, and national cadastral registries into modern standard RFC 7946 GeoJSON in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a GML (.gml) file?",
				a: "GML (Geography Markup Language) is an XML grammar defined by the Open Geospatial Consortium (OGC) to express spatial features, coordinate reference systems, and geographic properties. It is the mandatory data exchange standard for European INSPIRE spatial datasets, Ordnance Survey MasterMap, and international cadastral agencies.",
			},
			{
				q: "Which versions of GML are supported?",
				a: "convrtr supports both GML 2.x (<gml:coordinates>) and modern GML 3.x (<gml:pos>, <gml:posList>), including Points, LineStrings, Polygons with interior holes, MultiPoints, and MultiPolygons, with automatic coordinate axis normalization (handling EPSG:4326 Lat/Lon vs Lon/Lat).",
			},
			{
				q: "Why convert GML to GeoJSON?",
				a: "GML is notoriously verbose and complex to parse, making it unsupported by modern web map libraries like Leaflet and Mapbox GL JS without heavy backend GIS servers like GDAL/OGR. GeoJSON is lightweight, universally supported in JavaScript, and immediately ready for modern map visualization.",
			},
			{
				q: "Are my geographic records uploaded to any server?",
				a: "Never. All XML parsing, coordinate extraction, and GeoJSON synthesis happen 100% locally inside your browser client.",
			},
		],
		related: [
			"document/osm-to-geojson",
			"document/kml-to-geojson",
			"document/kmz-to-geojson",
			"document/gpx-to-geojson",
		],
	},
};
