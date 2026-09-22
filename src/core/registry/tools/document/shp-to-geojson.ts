import type { Tool } from "../../types";

export const shpToGeoJson: Tool = {
	id: "document/shp-to-geojson",
	slug: "shp-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/zip", "application/octet-stream"],
		ext: ["zip"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:shp-to-geojson"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Feature Collection",
				explanation:
					"Parses ESRI geometry (points, lines, polygons incl. Z/M variants) and dBase-III attributes with no native deps, joining them by record order into RFC 7946 GeoJSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Shapefile to GeoJSON — GIS Data Without Desktop GIS | convrtr",
		h1: "Convert Zipped Shapefile to GeoJSON",
		intent:
			"Turn a zipped Shapefile set (.shp + .dbf) into web-ready GeoJSON for Leaflet, Mapbox, QGIS and data pipelines — geometry plus attributes, joined by record order, no desktop GIS and nothing uploaded. Coordinates pass through unprojected; correct for lon/lat sources.",
		faq: [
			{
				q: "What do I upload — the .shp alone?",
				a: "The ZIP containing the set: at minimum .shp (geometry) and .dbf (attributes). A lone .shp converts geometry-only in most tools, but attributes are usually the point — zip the set.",
			},
			{
				q: "Will coordinates be reprojected to lon/lat?",
				a: "No — and that's stated openly: coordinates pass through untouched, so output is correct when the source is already geographic (true for the vast majority of shared extracts). Projected sources (metre grids) need a desktop reprojection first.",
			},
			{
				q: "Which shape types are supported?",
				a: "Points, polylines, polygons and multipoints including Z/M variants (Z/M dropped, XY kept). Null shapes and exotic MultiPatch are skipped rather than corrupting output.",
			},
			{
				q: "Is my geospatial data uploaded anywhere?",
				a: "No. Unzipping, both binary parsers and the join run entirely inside your browser — location data stays yours.",
			},
		],
		related: [
			"document/gpx-to-geojson",
			"document/kml-to-geojson",
			"document/osm-to-geojson",
		],
	},
};
