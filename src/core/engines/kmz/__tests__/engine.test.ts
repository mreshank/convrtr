import { zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { kmzToGeoJsonEngine } from "../index";
import { convertKmzToGeoJson } from "../parser";

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>KMZ Sample Document</name>
    <description>Testing KMZ to GeoJSON conversion</description>
    <Placemark>
      <name>San Francisco</name>
      <description>California city</description>
      <Point>
        <coordinates>-122.4194,37.7749,15</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Path Alpha</name>
      <LineString>
        <coordinates>
          -122.4194,37.7749,0
          -122.4200,37.7755,5
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

describe("KMZ Engine (kmz-to-geojson)", () => {
	it("probes successfully", async () => {
		expect(await kmzToGeoJsonEngine.probe()).toBe(true);
	});

	it("throws on invalid or non-ZIP input", () => {
		const invalid = new Uint8Array([1, 2, 3, 4]);
		expect(() => convertKmzToGeoJson(invalid.buffer)).toThrow(
			"Invalid KMZ file",
		);
	});

	it("throws if no .kml document exists inside the archive", () => {
		const zipBytes = zipSync({
			"readme.txt": new TextEncoder().encode("No KML here"),
		});
		expect(() => convertKmzToGeoJson(zipBytes.buffer)).toThrow(
			"No .kml document found",
		);
	});

	it("extracts and converts doc.kml from KMZ to GeoJSON", async () => {
		const zipBytes = zipSync({
			"doc.kml": new TextEncoder().encode(SAMPLE_KML),
			"files/icon.png": new Uint8Array([1, 2, 3]),
		});

		const onProgress = vi.fn();
		const resultBuffer = await kmzToGeoJsonEngine.run(
			zipBytes.buffer,
			{},
			onProgress,
		);
		const jsonString = new TextDecoder().decode(resultBuffer);
		const geojson = JSON.parse(jsonString);

		expect(geojson.type).toBe("FeatureCollection");
		expect(geojson.metadata?.name).toBe("KMZ Sample Document");
		expect(geojson.features.length).toBe(2);

		const ptFeature = geojson.features[0];
		expect(ptFeature.properties.name).toBe("San Francisco");
		expect(ptFeature.geometry.type).toBe("Point");
		expect(ptFeature.geometry.coordinates[0]).toBeCloseTo(-122.4194);
		expect(ptFeature.geometry.coordinates[1]).toBeCloseTo(37.7749);
		expect(ptFeature.geometry.coordinates[2]).toBe(15);

		const lineFeature = geojson.features[1];
		expect(lineFeature.properties.name).toBe("Path Alpha");
		expect(lineFeature.geometry.type).toBe("LineString");

		expect(onProgress).toHaveBeenCalledWith(1.0, "Complete");
	});
});
