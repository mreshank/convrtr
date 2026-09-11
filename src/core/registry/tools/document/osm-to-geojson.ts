import type { Tool } from "../../types";

export const osmToGeoJson: Tool = {
	id: "document/osm-to-geojson",
	slug: "osm-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-openstreetmap+xml",
			"application/osm+xml",
			"application/xml",
			"text/xml",
			"application/octet-stream",
		],
		ext: ["osm"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:osm-to-geojson"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard GeoJSON (RFC 7946)",
				explanation:
					"Converts OpenStreetMap XML (.osm) nodes, ways, buildings, highways, and multipolygon boundaries into standard RFC 7946 GeoJSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"OSM to GeoJSON — Convert OpenStreetMap XML (.osm) to GeoJSON | convrtr",
		h1: "Convert OpenStreetMap XML to GeoJSON",
		intent:
			"Convert OpenStreetMap XML extracts (.osm) from openstreetmap.org and Overpass API into clean, standard RFC 7946 GeoJSON in your browser. Extracts points, paths, and polygons with 100% privacy and zero server uploads.",
		faq: [
			{
				q: "What is an OpenStreetMap XML (.osm) file?",
				a: "OSM XML is the primary vector data format of the OpenStreetMap project. It represents real-world physical and geographic features using three fundamental topological primitives: nodes (points with lat/lon coordinates), ways (ordered sequences of nodes forming linear paths or closed polygon boundaries), and relations (groupings such as multipolygons with cutout holes).",
			},
			{
				q: "How does convrtr translate OSM primitives to GeoJSON?",
				a: "Tagged standalone nodes become GeoJSON Points; ways tagged as linear features (highways, waterways, railways) become LineStrings; closed ways tagged as area features (buildings, landuse, parks) become Polygons; and multipolygon relations are assembled into Polygons (with inner cutout holes) or MultiPolygons, with all OSM tags preserved as feature properties.",
			},
			{
				q: "What GIS and web mapping tools support the generated GeoJSON?",
				a: "The generated GeoJSON adheres strictly to RFC 7946 and is fully compatible with Mapbox GL JS, Leaflet, OpenLayers, Kepler.gl, QGIS, ArcGIS Pro, Google Earth Pro, and Turf.js.",
			},
			{
				q: "Are my geospatial extracts uploaded to any server?",
				a: "Never. All XML parsing, topological assembly, geometry reconstruction, and GeoJSON synthesis take place 100% in your local browser memory.",
			},
		],
		related: [
			"document/kml-to-geojson",
			"document/kmz-to-geojson",
			"document/gpx-to-geojson",
			"document/tcx-to-geojson",
		],
	},
};
