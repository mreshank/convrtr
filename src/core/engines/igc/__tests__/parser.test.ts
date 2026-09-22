import { describe, expect, it } from "vitest";
import { convertIgc, formatIgcGpx, formatIgcKml, parseIgc } from "../parser";

describe("igc parser", () => {
	const sampleIgc = `AXGD001
HFDTE150924
HFPLTPILOTINCHARGE:Jane Doe
HFGTYGLIDERTYPE:Discus 2c
HFGIDGLIDERID:D-1234
B1230004730123N00830456EA0055000620
B1230104730223N00830556EA0058000650
B1230204730323N00830656EA0061000680
`;

	it("parses headers and B-records accurately into decimal coordinates", () => {
		const flight = parseIgc(sampleIgc);
		expect(flight.pilot).toBe("Jane Doe");
		expect(flight.gliderType).toBe("Discus 2c");
		expect(flight.date).toBe("2024-09-15");
		expect(flight.points.length).toBe(3);

		// Lat: 47 deg + 30.123 min / 60 = 47.50205
		expect(flight.points[0]?.lat).toBeCloseTo(47.50205, 4);
		// Lon: 8 deg + 30.456 min / 60 = 8.5076
		expect(flight.points[0]?.lon).toBeCloseTo(8.5076, 4);
		expect(flight.points[0]?.pressureAlt).toBe(550);
		expect(flight.points[0]?.gpsAlt).toBe(620);
		expect(flight.points[0]?.time).toBe("2024-09-15T12:30:00Z");
	});

	it("generates valid GPX 1.1 XML format", () => {
		const flight = parseIgc(sampleIgc);
		const gpx = formatIgcGpx(flight);

		expect(gpx).toContain('<gpx version="1.1"');
		expect(gpx).toContain("<name>Glider Flight - Jane Doe</name>");
		expect(gpx).toContain('<trkpt lat="47.50205" lon="8.5076">');
		expect(gpx).toContain("<ele>620</ele>");
		expect(gpx).toContain("<time>2024-09-15T12:30:00Z</time>");
	});

	it("generates valid KML LineString format", () => {
		const flight = parseIgc(sampleIgc);
		const kml = formatIgcKml(flight);

		expect(kml).toContain("<kml");
		expect(kml).toContain("<LineString>");
		expect(kml).toContain("<coordinates>8.5076,47.50205,620");
	});

	it("converts through convertIgc helper", () => {
		const buf = new TextEncoder().encode(sampleIgc).buffer as ArrayBuffer;
		const gpxBuf = convertIgc(buf, false);
		const gpxStr = new TextDecoder().decode(gpxBuf);
		expect(gpxStr).toContain("<gpx");

		const kmlBuf = convertIgc(buf, true);
		const kmlStr = new TextDecoder().decode(kmlBuf);
		expect(kmlStr).toContain("<kml");
	});

	it("throws on empty or invalid file without B-records", () => {
		expect(() => parseIgc("HFDTE150924\n")).toThrow("no valid B-record");
	});
});
