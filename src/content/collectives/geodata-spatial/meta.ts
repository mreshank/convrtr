import type { CollectiveMeta } from "../types";

export const meta: CollectiveMeta = {
	slug: "geodata-spatial",
	title: "GIS and GPS geodata interchange",
	why: "Modern web mapping tools and geospatial APIs rely on GeoJSON, while GPS trackers, drones, and Google Earth export KML, KMZ, GPX, and Garmin FIT binary files. Parse waypoint trails, boundary polygons, and fitness metrics directly to GeoJSON or CSV without installing QGIS or running Python scripts.",
	toolIds: [
		"document/kml-to-geojson",
		"document/kmz-to-geojson",
		"document/gpx-to-geojson",
		"document/osm-to-geojson",
		"document/fit-to-csv",
	],
};
