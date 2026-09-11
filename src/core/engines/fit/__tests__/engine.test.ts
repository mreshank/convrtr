import { describe, expect, it } from "vitest";
import { fitToCsvEngine } from "../index";
import { formatGarminTimestamp, parseFit } from "../parser";

function buildMockFitFile(includeSentinels = false): Uint8Array {
	const headerSize = 14;
	const parts: number[][] = [];

	// 1. Definition Message 0: Global message 20 (Record)
	// Header: 0x40 (def, local 0)
	// reserved: 0, littleEndian: 0, globalMsgNum: 20 (uint16: 20, 0), numFields: 8
	const defRecord = [
		0x40, // Header
		0x00, // Reserved
		0x00, // Little Endian
		20,
		0, // Global Msg Num 20 (Record)
		8, // 8 fields
		// Field 253: timestamp (uint32)
		253,
		4,
		0x86,
		// Field 0: lat (sint32)
		0,
		4,
		0x85,
		// Field 1: lon (sint32)
		1,
		4,
		0x85,
		// Field 2: altitude (uint16)
		2,
		2,
		0x84,
		// Field 3: heart_rate (uint8)
		3,
		1,
		0x02,
		// Field 4: cadence (uint8)
		4,
		1,
		0x02,
		// Field 5: distance (uint32)
		5,
		4,
		0x86,
		// Field 7: power (uint16)
		7,
		2,
		0x84,
	];
	parts.push(defRecord);

	const latSemicircles = Math.round(37.7749 * (2 ** 31 / 180));
	const lonSemicircles = Math.round(-122.4194 * (2 ** 31 / 180));

	const buf1 = new ArrayBuffer(22);
	const v1 = new DataView(buf1);
	v1.setUint32(0, 1050000000, true); // timestamp
	v1.setInt32(4, latSemicircles, true); // lat
	v1.setInt32(8, lonSemicircles, true); // lon
	v1.setUint16(12, 3250, true); // alt (150m)
	v1.setUint8(14, 142); // heart rate (142 bpm)
	v1.setUint8(15, 85); // cadence (85 rpm)
	v1.setUint32(16, 50000, true); // distance (500.0 m)
	v1.setUint16(20, 220, true); // power (220 W)
	parts.push([0x00, ...new Uint8Array(buf1)]);

	// 3. Data Message 0: Record 2 (either valid or with invalid sentinels)
	const buf2 = new ArrayBuffer(22);
	const v2 = new DataView(buf2);
	v2.setUint32(0, 1050000005, true); // timestamp + 5s
	if (includeSentinels) {
		v2.setInt32(4, 0x7fffffff, true); // lat sentinel (no GPS fix)
		v2.setInt32(8, 0x7fffffff, true); // lon sentinel
		v2.setUint16(12, 0xffff, true); // alt sentinel
		v2.setUint8(14, 0xff); // heart rate sentinel (dropped sensor)
		v2.setUint8(15, 0xff); // cadence sentinel
		v2.setUint32(16, 0xffffffff, true); // distance sentinel
		v2.setUint16(20, 0xffff, true); // power sentinel
	} else {
		v2.setInt32(4, latSemicircles + 50, true);
		v2.setInt32(8, lonSemicircles + 50, true);
		v2.setUint16(12, 3260, true); // alt 152m
		v2.setUint8(14, 146);
		v2.setUint8(15, 87);
		v2.setUint32(16, 52500, true); // distance 525.0 m
		v2.setUint16(20, 240, true);
	}
	parts.push([0x00, ...new Uint8Array(buf2)]);

	// 4. Definition Message 1: Global message 18 (Session)
	const defSession = [
		0x41, // Header (def, local 1)
		0x00, // Reserved
		0x00, // Little Endian
		18,
		0, // Global Msg Num 18 (Session)
		4, // 4 fields
		// Field 5: sport (uint8)
		5,
		1,
		0x00,
		// Field 7: total_elapsed_time (uint32)
		7,
		4,
		0x86,
		// Field 9: total_distance (uint32)
		9,
		4,
		0x86,
		// Field 16: avg_heart_rate (uint8)
		16,
		1,
		0x02,
	];
	parts.push(defSession);

	// 5. Data Message 1: Session Summary
	const bufS = new ArrayBuffer(10);
	const vS = new DataView(bufS);
	vS.setUint8(0, 2); // Sport 2 = cycling
	vS.setUint32(1, 3600000, true); // 3600 seconds (1 hour)
	vS.setUint32(5, 3050000, true); // 30,500 meters (30.5 km)
	vS.setUint8(9, 145); // avg hr 145
	parts.push([0x01, ...new Uint8Array(bufS)]);

	// Compute payload size
	const flattenedData: number[] = [];
	for (const p of parts) {
		for (const b of p) {
			flattenedData.push(b);
		}
	}

	const dataSize = flattenedData.length;
	const fullBytes = new Uint8Array(headerSize + dataSize);
	const headerView = new DataView(fullBytes.buffer);

	// Header: 14 bytes
	fullBytes[0] = 14; // Header size
	fullBytes[1] = 0x20; // Protocol version
	headerView.setUint16(2, 0x0852, true); // Profile version
	headerView.setUint32(4, dataSize, true); // Data size
	fullBytes[8] = 0x2e; // '.'
	fullBytes[9] = 0x46; // 'F'
	fullBytes[10] = 0x49; // 'I'
	fullBytes[11] = 0x54; // 'T'
	headerView.setUint16(12, 0x0000, true); // CRC

	// Copy data
	fullBytes.set(flattenedData, headerSize);

	return fullBytes;
}

describe("fitToCsvEngine & FIT Parser", () => {
	it("probes successfully", async () => {
		const supported = await fitToCsvEngine.probe();
		expect(supported).toBe(true);
	});

	it("correctly converts Garmin timestamps to ISO 8601", () => {
		// 0 seconds since Dec 31, 1989 00:00:00 UTC
		const epochStr = formatGarminTimestamp(0);
		expect(epochStr).toBe("1989-12-31T00:00:00.000Z");

		// 1000000000 seconds = 2021-09-08T01:46:40.000Z
		const str2021 = formatGarminTimestamp(1000000000);
		expect(str2021).toBe("2021-09-08T01:46:40.000Z");
	});

	it("parses binary FIT file into records, session summary, CSV and GPX", () => {
		const fitBytes = buildMockFitFile(false);
		const parsed = parseFit(fitBytes);

		// Verify session summary
		expect(parsed.session.sport).toBe("cycling");
		expect(parsed.session.totalElapsedTimeSec).toBe(3600);
		expect(parsed.session.totalDistanceMeters).toBe(30500);
		expect(parsed.session.avgHeartRateBpm).toBe(145);

		// Verify records
		expect(parsed.records).toHaveLength(2);
		const [r1] = parsed.records;
		expect(r1).toBeDefined();
		if (!r1) return;
		expect(r1.latitude).toBeCloseTo(37.7749, 4);
		expect(r1.longitude).toBeCloseTo(-122.4194, 4);
		expect(r1.altitudeMeters).toBeCloseTo(150.0, 1);
		expect(r1.heartRateBpm).toBe(142);
		expect(r1.cadenceRpm).toBe(85);
		expect(r1.distanceMeters).toBe(500.0);
		expect(r1.powerWatts).toBe(220);

		// Verify CSV
		expect(parsed.csv).toContain("timestamp,latitude,longitude,altitude_m");
		expect(parsed.csv).toContain(
			"37.7749000,-122.4194000,150.0,500.0,142,85,220",
		);

		// Verify GPX
		expect(parsed.gpx).toContain('<gpx version="1.1"');
		expect(parsed.gpx).toContain('<trkpt lat="37.7749000" lon="-122.4194000">');
		expect(parsed.gpx).toContain("<ele>150.0</ele>");
		expect(parsed.gpx).toContain("<gpxtpx:hr>142</gpxtpx:hr>");
		expect(parsed.gpx).toContain("<gpxtpx:cad>85</gpxtpx:cad>");
		expect(parsed.gpx).toContain("<power>220</power>");
	});

	it("correctly handles and blanks FIT invalid sentinel values", () => {
		const fitBytes = buildMockFitFile(true);
		const parsed = parseFit(fitBytes);

		expect(parsed.records).toHaveLength(2);
		const [, r2] = parsed.records;
		expect(r2).toBeDefined();
		if (!r2) return;
		expect(r2.latitude).toBeUndefined();
		expect(r2.longitude).toBeUndefined();
		expect(r2.altitudeMeters).toBeUndefined();
		expect(r2.heartRateBpm).toBeUndefined();
		expect(r2.cadenceRpm).toBeUndefined();
		expect(r2.distanceMeters).toBeUndefined();
		expect(r2.powerWatts).toBeUndefined();

		// Ensure the CSV row for record 2 has empty cells rather than sentinel spikes
		const rows = parsed.csv.trim().split("\r\n");
		expect(rows).toHaveLength(3); // Header + 2 data rows
		const row2 = rows[2];
		expect(row2).toBeDefined();
		if (!row2) return;
		// Timestamp is present, but remaining columns are blank commas
		expect(
			row2
				.split(",")
				.slice(1)
				.every((val) => val === ""),
		).toBe(true);
	});

	it("runs end-to-end via engine producing RFC 4180 CSV with UTF-8 BOM", async () => {
		const fitBytes = buildMockFitFile(false);
		const progress: string[] = [];

		const result = await fitToCsvEngine.run(
			fitBytes.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const raw = new Uint8Array(result);
		// Check UTF-8 BOM (0xEF, 0xBB, 0xBF)
		expect(raw[0]).toBe(0xef);
		expect(raw[1]).toBe(0xbb);
		expect(raw[2]).toBe(0xbf);

		const text = new TextDecoder("utf-8").decode(result);
		expect(text).toContain("37.7749000,-122.4194000");

		expect(progress).toContain("PARSING_FIT");
		expect(progress).toContain("GENERATING_CSV");
		expect(progress).toContain("DONE");
	});

	it("rejects non-FIT binary files", async () => {
		const invalid = new Uint8Array([
			0x0e, 0x20, 0, 0, 0, 0, 0, 0, 0x4e, 0x4f, 0x50, 0x45, 0, 0,
		]);
		await expect(
			fitToCsvEngine.run(invalid.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/does not match '\.FIT'/i);
	});
});
