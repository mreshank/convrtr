import { describe, expect, it } from "vitest";
import {
	convertGpxToGeoJson,
	gpxToGeoJsonEngine,
	parseGpxToGeoJson,
} from "../index";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StravaGPX" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Golden Gate Park Trail Run</name>
    <desc>Morning 5k workout</desc>
    <time>2026-09-10T07:00:00Z</time>
    <author>Runner</author>
  </metadata>
  <wpt lat="37.7749" lon="-122.4194">
    <ele>45.5</ele>
    <name>Trailhead</name>
    <desc>Meeting point</desc>
    <sym>Flag</sym>
  </wpt>
  <rte>
    <name>Scenic Overlook Route</name>
    <rtept lat="37.7750" lon="-122.4190"><ele>46.0</ele></rtept>
    <rtept lat="37.7760" lon="-122.4180"><ele>50.0</ele></rtept>
  </rte>
  <trk>
    <name>Morning Run</name>
    <type>Running</type>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>45.5</ele>
        <time>2026-09-10T07:00:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>145</gpxtpx:hr>
            <gpxtpx:cad>88</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="37.7755" lon="-122.4188">
        <ele>48.0</ele>
        <time>2026-09-10T07:00:30Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>155</gpxtpx:hr>
            <gpxtpx:cad>90</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="37.7760" lon="-122.4182">
        <ele>52.0</ele>
        <time>2026-09-10T07:01:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>160</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const MULTI_SEG_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Split Activity</name>
    <trkseg>
      <trkpt lat="10.0" lon="20.0"><ele>100</ele></trkpt>
      <trkpt lat="10.1" lon="20.1"><ele>110</ele></trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="10.2" lon="20.2"><ele>120</ele></trkpt>
      <trkpt lat="10.3" lon="20.3"><ele>130</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("gpx parser and GeoJSON engine", () => {
	it("parses waypoints, routes, and tracks into RFC 7946 GeoJSON", () => {
		const geojson = parseGpxToGeoJson(SAMPLE_GPX);

		expect(geojson.type).toBe("FeatureCollection");
		expect(geojson.metadata?.name).toBe("Golden Gate Park Trail Run");
		expect(geojson.features).toHaveLength(3);

		// Waypoint feature
		const wpt = geojson.features[0];
		expect(wpt?.geometry.type).toBe("Point");
		expect(wpt?.geometry.coordinates).toEqual([-122.4194, 37.7749, 45.5]);
		expect(wpt?.properties.name).toBe("Trailhead");
		expect(wpt?.properties.featureType).toBe("waypoint");

		// Route feature
		const rte = geojson.features[1];
		expect(rte?.geometry.type).toBe("LineString");
		expect(rte?.geometry.coordinates).toHaveLength(2);
		expect(rte?.properties.name).toBe("Scenic Overlook Route");
		expect(rte?.properties.featureType).toBe("route");

		// Track feature
		const trk = geojson.features[2];
		expect(trk?.geometry.type).toBe("LineString");
		expect(trk?.geometry.coordinates).toHaveLength(3);
		expect(trk?.properties.name).toBe("Morning Run");
		expect(trk?.properties.type).toBe("Running");
		expect(trk?.properties.pointCount).toBe(3);
		expect(trk?.properties.distanceMeters).toBeGreaterThan(50);
		expect(trk?.properties.elevationGainMeters).toBe(6.5);
		expect(trk?.properties.avgHeartRateBpm).toBe(153);
		expect(trk?.properties.durationSeconds).toBe(60);
		expect(trk?.properties.avgSpeedKmh).toBeGreaterThan(0);
	});

	it("handles multi-segment tracks as MultiLineString", () => {
		const geojson = parseGpxToGeoJson(MULTI_SEG_GPX);

		expect(geojson.features).toHaveLength(1);
		const trk = geojson.features[0];
		expect(trk?.geometry.type).toBe("MultiLineString");
		expect(trk?.geometry.coordinates).toHaveLength(2);
		expect(trk?.properties.name).toBe("Split Activity");
	});

	it("converts GPX buffer to GeoJSON buffer", () => {
		const enc = new TextEncoder();
		const buf = enc.encode(SAMPLE_GPX).buffer;

		const outBuf = convertGpxToGeoJson(buf);
		const outText = new TextDecoder().decode(outBuf);
		const parsed = JSON.parse(outText);

		expect(parsed.type).toBe("FeatureCollection");
		expect(parsed.features).toHaveLength(3);
	});

	it("executes gpxToGeoJsonEngine with progress tracking", async () => {
		const enc = new TextEncoder();
		const buf = enc.encode(SAMPLE_GPX).buffer.slice(0) as ArrayBuffer;

		const progressUpdates: number[] = [];
		const res = await gpxToGeoJsonEngine.run(
			buf,
			{},
			(ratio: number, _phase: string) => {
				progressUpdates.push(ratio);
			},
		);

		expect(progressUpdates.length).toBeGreaterThan(0);
		const parsed = JSON.parse(new TextDecoder().decode(res));
		expect(parsed.type).toBe("FeatureCollection");
	});

	it("throws an error when root gpx tag is missing", () => {
		expect(() => parseGpxToGeoJson("<invalid>xml</invalid>")).toThrow(
			/Missing root <gpx> element/,
		);
	});
});
