import { describe, expect, it } from "vitest";
import {
	convertKmlToGeoJson,
	kmlToGeoJsonEngine,
	parseKmlToGeoJson,
} from "../index";

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>San Francisco Landmarks</name>
    <description>Tour of famous landmarks</description>
    <Placemark>
      <name>Transamerica Pyramid</name>
      <description>Historic skyscraper in financial district</description>
      <ExtendedData>
        <Data name="height_meters"><value>260</value></Data>
        <SimpleData name="floors">48</SimpleData>
      </ExtendedData>
      <Point>
        <coordinates>-122.4014,37.7952,10.5</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Embarcadero Promenade</name>
      <LineString>
        <coordinates>
          -122.3934,37.7936,0
          -122.3912,37.7955,0
          -122.3900,37.8001,0
        </coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Yerba Buena Gardens</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -122.4030,37.7850,0
              -122.4010,37.7850,0
              -122.4010,37.7830,0
              -122.4030,37.7830,0
              -122.4030,37.7850,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

describe("kml parser and GeoJSON engine", () => {
	it("parses Point, LineString, and Polygon placemarks into RFC 7946 GeoJSON", () => {
		const geojson = parseKmlToGeoJson(SAMPLE_KML);

		expect(geojson.type).toBe("FeatureCollection");
		expect(geojson.features).toHaveLength(3);

		// 1. Point Feature
		const pt = geojson.features[0];
		expect(pt?.geometry.type).toBe("Point");
		if (pt?.geometry.type === "Point") {
			expect(pt.geometry.coordinates).toEqual([-122.4014, 37.7952, 10.5]);
		}
		expect(pt?.properties.name).toBe("Transamerica Pyramid");
		expect(pt?.properties.height_meters).toBe("260");
		expect(pt?.properties.floors).toBe("48");

		// 2. LineString Feature
		const line = geojson.features[1];
		expect(line?.geometry.type).toBe("LineString");
		if (line?.geometry.type === "LineString") {
			expect(line.geometry.coordinates).toHaveLength(3);
		}
		expect(line?.properties.name).toBe("Embarcadero Promenade");

		// 3. Polygon Feature
		const poly = geojson.features[2];
		expect(poly?.geometry.type).toBe("Polygon");
		if (poly?.geometry.type === "Polygon") {
			expect(poly.geometry.coordinates).toHaveLength(1);
			expect(poly.geometry.coordinates[0]).toHaveLength(5);
		}
		expect(poly?.properties.name).toBe("Yerba Buena Gardens");
	});

	it("converts KML buffer via convertKmlToGeoJson", () => {
		const buf = new TextEncoder()
			.encode(SAMPLE_KML)
			.buffer.slice(0) as ArrayBuffer;
		const geojsonBuf = convertKmlToGeoJson(buf);
		const parsed = JSON.parse(new TextDecoder().decode(geojsonBuf));

		expect(parsed.type).toBe("FeatureCollection");
		expect(parsed.features).toHaveLength(3);
	});

	it("executes kmlToGeoJsonEngine with progress callback", async () => {
		const buf = new TextEncoder()
			.encode(SAMPLE_KML)
			.buffer.slice(0) as ArrayBuffer;
		const progressUpdates: number[] = [];
		const res = await kmlToGeoJsonEngine.run(buf, {}, (ratio: number) => {
			progressUpdates.push(ratio);
		});

		expect(progressUpdates.length).toBeGreaterThan(0);
		const parsed = JSON.parse(new TextDecoder().decode(res));
		expect(parsed.type).toBe("FeatureCollection");
	});

	it("throws on missing root <kml> element", () => {
		expect(() => parseKmlToGeoJson("<invalid>test</invalid>")).toThrow(
			/Missing root <kml> element/,
		);
	});
});
