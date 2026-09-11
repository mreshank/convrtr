import type { Tool } from "../../types";

export const kmlToGeoJson: Tool = {
	id: "document/kml-to-geojson",
	slug: "kml-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.google-earth.kml+xml",
			"application/kml",
			"application/xml",
			"text/xml",
			"application/octet-stream",
		],
		ext: ["kml"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:kml-to-geojson"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard GeoJSON (RFC 7946)",
				explanation:
					"Converts Google Earth Keyhole Markup Language (.kml) placemarks, points, linestrings, polygons, and ExtendedData attributes into standard RFC 7946 GeoJSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "KML to GeoJSON — Convert Google Earth (.kml) to GeoJSON | convrtr",
		h1: "Convert Google Earth KML to GeoJSON",
		intent:
			"Convert Google Earth and Google Maps Keyhole Markup Language (.kml) geographic placemarks, GPS tracks, and boundary polygons into clean, standard RFC 7946 GeoJSON in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a KML file?",
				a: "KML (Keyhole Markup Language) is an XML notation for expressing geographic visualization, created by Keyhole Inc. and maintained by the Open Geospatial Consortium (OGC). It is widely used in Google Earth, Google Maps, and GIS applications.",
			},
			{
				q: "Why convert KML to GeoJSON?",
				a: "GeoJSON is the native standard for modern web cartography libraries including Mapbox GL, Leaflet, OpenLayers, Kepler.gl, and D3.js. Converting KML to GeoJSON allows instant integration without heavy XML parsers.",
			},
			{
				q: "Are boundary polygons, inner rings, and ExtendedData preserved?",
				a: "Yes! convrtr extracts Point, LineString, Polygon (including inner cutout rings), and ExtendedData custom attributes into GeoJSON feature properties.",
			},
			{
				q: "Is my spatial and location data uploaded to a server?",
				a: "Never. All parsing runs 100% client-side in your browser memory. Your coordinates never leave your device.",
			},
		],
		related: ["document/gpx-to-geojson", "document/fit-to-csv"],
	},
};
