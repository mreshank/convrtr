import type { Tool } from "../../types";

export const kmzToGeoJson: Tool = {
	id: "document/kmz-to-geojson",
	slug: "kmz-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.google-earth.kmz",
			"application/x-kmz",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["kmz"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:kmz-to-geojson"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard GeoJSON (RFC 7946)",
				explanation:
					"Unpacks Google Earth Compressed Keyhole Archive (.kmz) in-memory and converts embedded KML placemarks, line paths, and polygon boundaries into standard RFC 7946 GeoJSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "KMZ to GeoJSON — Convert Google Earth (.kmz) to GeoJSON | convrtr",
		h1: "Convert Google Earth KMZ to GeoJSON",
		intent:
			"Convert Google Earth KMZ archives (.kmz) into clean, standard RFC 7946 GeoJSON in your browser. Unpacks compressed archives and extracts geographic placemarks with 100% privacy and zero server uploads.",
		faq: [
			{
				q: "What is a Google Earth KMZ (.kmz) file?",
				a: "KMZ (Keyhole Markup language Zipped) is the compressed format used by Google Earth and Google Maps. It packages a main KML XML file (typically doc.kml) along with embedded custom placemark icons, ground overlays, and 3D COLLADA models into a single ZIP container.",
			},
			{
				q: "How does convrtr convert KMZ to GeoJSON?",
				a: "convrtr unzips the KMZ container entirely in browser memory using fast pure-JavaScript decompression, extracts the primary KML vector document, and parses all Point, LineString, Polygon (including inner cutout holes), and ExtendedData fields into an RFC 7946 compliant GeoJSON FeatureCollection.",
			},
			{
				q: "What GIS software and web mapping tools can open the GeoJSON?",
				a: "The generated GeoJSON is 100% compatible with modern web mapping libraries (Mapbox GL JS, Leaflet, OpenLayers, Kepler.gl, D3.js) as well as desktop GIS suites (QGIS, ArcGIS Pro, Google Earth Pro, geojson.io).",
			},
			{
				q: "Are my geographic boundary files or placemarks uploaded to a server?",
				a: "Never. All ZIP decompression, XML parsing, and GeoJSON synthesis are executed client-side in your browser memory. Your sensitive geospatial boundaries never leave your machine.",
			},
		],
		related: [
			"document/kml-to-geojson",
			"document/gpx-to-geojson",
			"document/tcx-to-geojson",
		],
	},
};
