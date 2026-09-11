import { describe, expect, it, vi } from "vitest";
import { tcxToGeoJsonEngine } from "../index";
import { convertTcxToGeoJson, parseTcx } from "../parser";
import type { GeoJsonFeatureCollection } from "../types";

const SAMPLE_TCX_ACTIVITY = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
  <Activities>
    <Activity Sport="Biking">
      <Id>2024-05-18T08:30:00Z</Id>
      <Lap StartTime="2024-05-18T08:30:00Z">
        <TotalTimeSeconds>1250.0</TotalTimeSeconds>
        <DistanceMeters>8500.5</DistanceMeters>
        <MaximumSpeed>12.4</MaximumSpeed>
        <Calories>320</Calories>
        <AverageHeartRateBpm><Value>145</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>172</Value></MaximumHeartRateBpm>
        <Track>
          <Trackpoint>
            <Time>2024-05-18T08:30:00Z</Time>
            <Position>
              <LatitudeDegrees>37.774929</LatitudeDegrees>
              <LongitudeDegrees>-122.419416</LongitudeDegrees>
            </Position>
            <AltitudeMeters>15.2</AltitudeMeters>
            <DistanceMeters>0.0</DistanceMeters>
            <HeartRateBpm><Value>130</Value></HeartRateBpm>
            <Cadence>80</Cadence>
            <Extensions>
              <ns3:TPX>
                <ns3:Speed>4.5</ns3:Speed>
                <ns3:Watts>210</ns3:Watts>
              </ns3:TPX>
            </Extensions>
          </Trackpoint>
          <Trackpoint>
            <Time>2024-05-18T08:30:10Z</Time>
            <Position>
              <LatitudeDegrees>37.775120</LatitudeDegrees>
              <LongitudeDegrees>-122.418900</LongitudeDegrees>
            </Position>
            <AltitudeMeters>18.5</AltitudeMeters>
            <DistanceMeters>50.0</DistanceMeters>
            <HeartRateBpm><Value>138</Value></HeartRateBpm>
            <Cadence>85</Cadence>
            <Extensions>
              <ns3:TPX>
                <ns3:Speed>5.2</ns3:Speed>
                <ns3:Watts>245</ns3:Watts>
              </ns3:TPX>
            </Extensions>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

const SAMPLE_TCX_COURSE = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Courses>
    <Course>
      <Name>Mountain Pass</Name>
      <Track>
        <Trackpoint>
          <Position>
            <LatitudeDegrees>45.123</LatitudeDegrees>
            <LongitudeDegrees>6.789</LongitudeDegrees>
          </Position>
          <AltitudeMeters>1200.0</AltitudeMeters>
        </Trackpoint>
        <Trackpoint>
          <Position>
            <LatitudeDegrees>45.125</LatitudeDegrees>
            <LongitudeDegrees>6.795</LongitudeDegrees>
          </Position>
          <AltitudeMeters>1250.0</AltitudeMeters>
        </Trackpoint>
      </Track>
      <CoursePoint>
        <Name>Summit</Name>
        <Time>2024-06-01T10:00:00Z</Time>
        <Position>
          <LatitudeDegrees>45.125</LatitudeDegrees>
          <LongitudeDegrees>6.795</LongitudeDegrees>
        </Position>
        <AltitudeMeters>1250.0</AltitudeMeters>
        <PointType>Summit</PointType>
        <Notes>Top of the climb</Notes>
      </CoursePoint>
    </Course>
  </Courses>
</TrainingCenterDatabase>`;

describe("TCX Engine (tcx-to-geojson)", () => {
	it("probes successfully", async () => {
		expect(await tcxToGeoJsonEngine.probe()).toBe(true);
	});

	it("throws on invalid non-TCX content", () => {
		const encoder = new TextEncoder();
		const buffer = encoder.encode("<xml>Not a TCX document</xml>").buffer;
		expect(() => convertTcxToGeoJson(buffer)).toThrow("Invalid TCX file");
	});

	it("parses TCX activity with telemetry attributes", () => {
		const data = parseTcx(SAMPLE_TCX_ACTIVITY);
		expect(data.activities.length).toBe(1);
		const activity = data.activities[0] ?? { sport: "", laps: [] };
		expect(activity.sport).toBe("Biking");
		expect(activity.laps.length).toBe(1);

		const lap = activity.laps[0] ?? { trackpoints: [] };
		expect(lap.distanceMeters).toBe(8500.5);
		expect(lap.calories).toBe(320);
		expect(lap.trackpoints.length).toBe(2);

		const pt1 = lap.trackpoints[0] ?? { latitude: 0, longitude: 0 };
		expect(pt1.latitude).toBeCloseTo(37.774929);
		expect(pt1.longitude).toBeCloseTo(-122.419416);
		expect(pt1.altitude).toBe(15.2);
		expect(pt1.heartRate).toBe(130);
		expect(pt1.cadence).toBe(80);
		expect(pt1.watts).toBe(210);
		expect(pt1.speed).toBe(4.5);
	});

	it("converts TCX activity to RFC 7946 GeoJSON FeatureCollection", async () => {
		const encoder = new TextEncoder();
		const buffer = encoder.encode(SAMPLE_TCX_ACTIVITY).buffer;

		const onProgress = vi.fn();
		const resultBuffer = await tcxToGeoJsonEngine.run(buffer, {}, onProgress);
		const jsonString = new TextDecoder().decode(resultBuffer);
		const geojson = JSON.parse(jsonString) as GeoJsonFeatureCollection;

		expect(geojson.type).toBe("FeatureCollection");
		expect(geojson.properties?.sport).toBe("Biking");
		expect(geojson.features.length).toBeGreaterThanOrEqual(1);

		// Verify LineString track feature
		const lineFeature = geojson.features.find(
			(f) => f.geometry.type === "LineString",
		);
		expect(lineFeature).toBeDefined();

		if (lineFeature && lineFeature.geometry.type === "LineString") {
			// Coordinates must be [longitude, latitude, elevation]
			const firstCoord = lineFeature.geometry.coordinates[0] ?? [0, 0, 0];
			expect(firstCoord[0]).toBeCloseTo(-122.419416);
			expect(firstCoord[1]).toBeCloseTo(37.774929);
			expect(firstCoord[2]).toBe(15.2);

			expect(lineFeature.properties.sport).toBe("Biking");
			expect(lineFeature.properties.calories).toBe(320);
			expect(lineFeature.properties.maxWatts).toBe(245);
			expect(lineFeature.properties.pointCount).toBe(2);
		}

		// Verify Lap Start Point
		const lapPoint = geojson.features.find(
			(f) => f.properties.type === "lap_start",
		);
		expect(lapPoint).toBeDefined();

		expect(onProgress).toHaveBeenCalledWith(1.0, "Complete");
	});

	it("converts TCX courses and course points to GeoJSON", () => {
		const encoder = new TextEncoder();
		const buffer = encoder.encode(SAMPLE_TCX_COURSE).buffer;

		const resultBuffer = convertTcxToGeoJson(buffer);
		const jsonString = new TextDecoder().decode(resultBuffer);
		const geojson = JSON.parse(jsonString) as GeoJsonFeatureCollection;

		expect(geojson.type).toBe("FeatureCollection");

		// Find course track
		const courseTrack = geojson.features.find(
			(f) => f.geometry.type === "LineString",
		);
		expect(courseTrack).toBeDefined();
		expect(courseTrack?.properties.name).toBe("Mountain Pass");

		// Find CoursePoint
		const coursePt = geojson.features.find(
			(f) => f.properties.type === "course_point",
		);
		expect(coursePt).toBeDefined();
		expect(coursePt?.properties.name).toBe("Summit");
		expect(coursePt?.properties.pointType).toBe("Summit");
		expect(coursePt?.properties.notes).toBe("Top of the climb");
	});
});
