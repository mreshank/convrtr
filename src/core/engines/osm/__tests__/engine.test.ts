import { describe, expect, it } from "vitest";
import { osmToGeoJsonEngine } from "../index";
import { parseOsmXml } from "../parser";

const SAMPLE_OSM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="CGImap 0.8.8">
  <node id="101" lat="51.5007" lon="-0.1246">
    <tag k="name" v="Big Ben"/>
    <tag k="tourism" v="attraction"/>
  </node>
  <node id="102" lat="51.5010" lon="-0.1250"/>
  <node id="103" lat="51.5020" lon="-0.1260"/>
  <node id="104" lat="51.5030" lon="-0.1270"/>

  <!-- Linear highway -->
  <way id="201">
    <nd ref="102"/>
    <nd ref="103"/>
    <tag k="highway" v="primary"/>
    <tag k="name" v="Parliament Street"/>
  </way>

  <!-- Closed building polygon -->
  <node id="11" lat="51.0" lon="0.0"/>
  <node id="12" lat="51.0" lon="0.1"/>
  <node id="13" lat="51.1" lon="0.1"/>
  <node id="14" lat="51.1" lon="0.0"/>
  <way id="202">
    <nd ref="11"/>
    <nd ref="12"/>
    <nd ref="13"/>
    <nd ref="14"/>
    <nd ref="11"/>
    <tag k="building" v="yes"/>
    <tag k="name" v="Town Hall"/>
  </way>

  <!-- Multipolygon relation -->
  <node id="21" lat="52.0" lon="1.0"/>
  <node id="22" lat="52.0" lon="1.2"/>
  <node id="23" lat="52.2" lon="1.2"/>
  <node id="24" lat="52.2" lon="1.0"/>
  <way id="301">
    <nd ref="21"/>
    <nd ref="22"/>
    <nd ref="23"/>
    <nd ref="24"/>
    <nd ref="21"/>
  </way>
  <relation id="401">
    <member type="way" ref="301" role="outer"/>
    <tag k="type" v="multipolygon"/>
    <tag k="natural" v="wood"/>
    <tag k="name" v="Sherwood Forest"/>
  </relation>
</osm>`;

describe("osmToGeoJsonEngine", () => {
	it("probes successfully", async () => {
		expect(await osmToGeoJsonEngine.probe()).toBe(true);
	});

	it("parses nodes, ways, and relations from XML", () => {
		const { nodes, ways, relations } = parseOsmXml(SAMPLE_OSM_XML);
		expect(nodes.size).toBe(12);
		expect(nodes.get("101")?.tags.name).toBe("Big Ben");
		expect(ways.length).toBe(3);
		expect(relations.length).toBe(1);
	});

	it("converts OSM XML into valid RFC 7946 GeoJSON FeatureCollection", async () => {
		const input = new TextEncoder().encode(SAMPLE_OSM_XML).buffer;
		const outputBytes = await osmToGeoJsonEngine.run(input, {}, () => {});
		const geojson = JSON.parse(new TextDecoder().decode(outputBytes));

		expect(geojson.type).toBe("FeatureCollection");
		expect(geojson.generator).toBe("convrtr");
		expect(geojson.features.length).toBe(4);

		// 1. Point feature (Big Ben node 101)
		const point = geojson.features.find(
			(f: { id: string }) => f.id === "node/101",
		);
		expect(point).toBeDefined();
		expect(point.geometry.type).toBe("Point");
		expect(point.geometry.coordinates).toEqual([-0.1246, 51.5007]);
		expect(point.properties.name).toBe("Big Ben");

		// 2. LineString feature (Parliament Street way 201)
		const line = geojson.features.find(
			(f: { id: string }) => f.id === "way/201",
		);
		expect(line).toBeDefined();
		expect(line.geometry.type).toBe("LineString");
		expect(line.geometry.coordinates).toHaveLength(2);
		expect(line.properties.highway).toBe("primary");

		// 3. Polygon feature (Town Hall way 202)
		const poly = geojson.features.find(
			(f: { id: string }) => f.id === "way/202",
		);
		expect(poly).toBeDefined();
		expect(poly.geometry.type).toBe("Polygon");
		expect(poly.geometry.coordinates[0]).toHaveLength(5);
		expect(poly.properties.building).toBe("yes");

		// 4. Multipolygon relation feature (Sherwood Forest relation 401)
		const rel = geojson.features.find(
			(f: { id: string }) => f.id === "relation/401",
		);
		expect(rel).toBeDefined();
		expect(rel.geometry.type).toBe("Polygon");
		expect(rel.properties.natural).toBe("wood");
	});

	it("rejects non-OSM content", async () => {
		const invalid = new TextEncoder().encode("Hello World not xml").buffer;
		await expect(osmToGeoJsonEngine.run(invalid, {}, () => {})).rejects.toThrow(
			/Invalid OpenStreetMap file/,
		);
	});
});
