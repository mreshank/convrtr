import type { Tool } from "../../types";

export const gpkgToGeoJson: Tool = {
	id: "document/gpkg-to-geojson",
	slug: "gpkg-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/geopackage+sqlite3", "application/octet-stream"],
		ext: ["gpkg"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:gpkg-to-geojson"],
	heavyDownloadMb: 1,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Feature Collection",
				explanation:
					"Reads every feature layer via SQL and decodes GeoPackageBinary + WKB with srs cross-checks into RFC 7946 GeoJSON. Non-spatial columns join as properties.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "GeoPackage to GeoJSON — GIS Data Without Desktop GIS | convrtr",
		h1: "Convert GeoPackage (.gpkg) to GeoJSON",
		intent:
			"Turn OGC GeoPackage files into web-ready GeoJSON for Leaflet, Mapbox, QGIS and pipelines — every layer, srs-checked geometry, full attributes, no desktop GIS and nothing uploaded. Coordinates pass through unprojected; correct for lon/lat sources.",
		faq: [
			{
				q: "How is this different from Shapefile conversion?",
				a: "GeoPackage is the modern OGC replacement: one SQLite file instead of a .shp/.dbf/.shx/.prj sidecar set, with proper types and spatial indexes. Same output (GeoJSON), newer input — see shp-to-geojson for the legacy sets.",
			},
			{
				q: "Will coordinates be reprojected?",
				a: "No — stated openly: geometries pass through untouched with their CRS named in the output meta, correct when the source is already geographic. Projected sources need a desktop reprojection first.",
			},
			{
				q: "Why does it need a 1MB download first?",
				a: "GeoPackage is SQLite plus spatial tables, so this rides the shared sql.js core — fetched once, on demand, with UI consent like the video and database tools.",
			},
			{
				q: "Is my geospatial data uploaded anywhere?",
				a: "No. SQL reads, binary decoding and GeoJSON writing all run inside your browser.",
			},
		],
		related: ["document/shp-to-geojson", "document/sqlite-to-zip", "document/gpx-to-geojson"],
	},
};
