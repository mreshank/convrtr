/**
 * Garmin / Strava / Wahoo FIT (Flexible and Interoperable Data Transfer) binary parser.
 * Decodes activity recordings, GPS trackpoints, heart rate, cadence, power, elevation,
 * and temperature, producing clean RFC 4180 CSV and GPX 1.1 XML without server uploads.
 */

export interface FitRecord {
	timestamp?: string;
	latitude?: number;
	longitude?: number;
	altitudeMeters?: number;
	distanceMeters?: number;
	heartRateBpm?: number;
	cadenceRpm?: number;
	powerWatts?: number;
	speedKmh?: number;
	temperatureCelsius?: number;
}

export interface FitSessionSummary {
	sport?: string;
	subSport?: string;
	startTime?: string;
	totalElapsedTimeSec?: number;
	totalTimerTimeSec?: number;
	totalDistanceMeters?: number;
	avgSpeedKmh?: number;
	maxSpeedKmh?: number;
	avgHeartRateBpm?: number;
	maxHeartRateBpm?: number;
	avgCadenceRpm?: number;
	maxCadenceRpm?: number;
	avgPowerWatts?: number;
	maxPowerWatts?: number;
	totalCalories?: number;
	totalAscentMeters?: number;
	totalDescentMeters?: number;
}

export interface FitParseResult {
	session: FitSessionSummary;
	records: FitRecord[];
	csv: string;
	gpx: string;
}

interface FieldDef {
	fieldNum: number;
	size: number;
	baseType: number;
}

interface DefMessage {
	littleEndian: boolean;
	globalMsgNum: number;
	fields: FieldDef[];
}

// Garmin FIT epoch: Dec 31, 1989 00:00:00 UTC (631065600 seconds after Unix epoch)
const GARMIN_TIME_OFFSET_MS = 631065600000;
const SEMICIRCLE_TO_DEGREE = 180 / 2 ** 31;

const SPORT_NAMES: Record<number, string> = {
	0: "generic",
	1: "running",
	2: "cycling",
	3: "transition",
	4: "fitness_equipment",
	5: "swimming",
	6: "basketball",
	7: "soccer",
	8: "tennis",
	9: "american_football",
	10: "training",
	11: "walking",
	12: "cross_country_skiing",
	13: "alpine_skiing",
	14: "snowboarding",
	15: "rowing",
	16: "mountaineering",
	17: "hiking",
	18: "multisport",
	19: "paddling",
	20: "flying",
	21: "e_biking",
	22: "motorcycling",
	23: "boating",
	24: "driving",
	25: "golf",
	26: "hang_gliding",
	27: "horseback_riding",
	28: "hunting",
	29: "fishing",
	30: "inline_skating",
	31: "rock_climbing",
	32: "sailing",
	33: "ice_skating",
	34: "sky_diving",
	35: "snowshoeing",
	36: "snowmobiling",
	37: "stand_up_paddleboarding",
	38: "surfing",
	39: "wakeboarding",
	40: "water_skiing",
	41: "kayaking",
	42: "rafting",
	43: "windsurfing",
	44: "kitesurfing",
	45: "tactical",
	46: "jumpmaster",
	47: "boxing",
	48: "floor_climbing",
};

/**
 * Checks whether a raw integer represents a FIT invalid/sentinel value.
 */
function isInvalidValue(val: number, baseType: number): boolean {
	switch (baseType) {
		case 0x01: // sint8
			return val === 0x7f;
		case 0x00: // enum
		case 0x02: // uint8
		case 0x0a: // uint8z
			return val === 0xff;
		case 0x83: // sint16
			return val === 0x7fff;
		case 0x84: // uint16
		case 0x8b: // uint16z
			return val === 0xffff;
		case 0x85: // sint32
			return val === 0x7fffffff;
		case 0x86: // uint32
		case 0x8c: // uint32z
			return val === 0xffffffff;
		default:
			return false;
	}
}

/**
 * Reads a scalar value based on FIT base type.
 */
function readFieldScalar(
	view: DataView,
	offset: number,
	baseType: number,
	littleEndian: boolean,
): number | null {
	if (offset + 1 > view.byteLength) return null;

	switch (baseType) {
		case 0x00: // enum
		case 0x02: {
			// uint8
			const v = view.getUint8(offset);
			return isInvalidValue(v, baseType) ? null : v;
		}
		case 0x01: {
			// sint8
			const v = view.getInt8(offset);
			return isInvalidValue(v, baseType) ? null : v;
		}
		case 0x83: {
			// sint16
			if (offset + 2 > view.byteLength) return null;
			const v = view.getInt16(offset, littleEndian);
			return isInvalidValue(v, baseType) ? null : v;
		}
		case 0x84:
		case 0x8b: {
			// uint16 / uint16z
			if (offset + 2 > view.byteLength) return null;
			const v = view.getUint16(offset, littleEndian);
			return isInvalidValue(v, baseType) ? null : v;
		}
		case 0x85: {
			// sint32
			if (offset + 4 > view.byteLength) return null;
			const v = view.getInt32(offset, littleEndian);
			return isInvalidValue(v, baseType) ? null : v;
		}
		case 0x86:
		case 0x8c: {
			// uint32 / uint32z
			if (offset + 4 > view.byteLength) return null;
			const v = view.getUint32(offset, littleEndian);
			return isInvalidValue(v, baseType) ? null : v;
		}
		case 0x88: {
			// float32
			if (offset + 4 > view.byteLength) return null;
			const v = view.getFloat32(offset, littleEndian);
			return Number.isNaN(v) ? null : v;
		}
		default:
			return null;
	}
}

/**
 * Formats a Garmin FIT timestamp to ISO 8601 string.
 */
export function formatGarminTimestamp(secondsSince1989: number): string {
	const ms = secondsSince1989 * 1000 + GARMIN_TIME_OFFSET_MS;
	return new Date(ms).toISOString();
}

/**
 * Parses a binary Garmin / Strava FIT file.
 */
export function parseFit(fileBytes: Uint8Array): FitParseResult {
	if (fileBytes.length < 12) {
		throw new Error(
			"Invalid .fit file: File size is smaller than 12-byte header.",
		);
	}

	const headerSize = fileBytes[0] ?? 0;
	if (headerSize !== 14 && headerSize !== 12) {
		throw new Error(
			`Invalid .fit file: Unexpected header size ${headerSize} (expected 12 or 14 bytes).`,
		);
	}

	if (fileBytes.length < headerSize) {
		throw new Error("Invalid .fit file: Truncated header data.");
	}

	const sig = String.fromCharCode(
		fileBytes[8] ?? 0,
		fileBytes[9] ?? 0,
		fileBytes[10] ?? 0,
		fileBytes[11] ?? 0,
	);
	if (sig !== ".FIT") {
		throw new Error(
			`Invalid .fit file: Header signature '${sig}' does not match '.FIT'.`,
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);
	const dataSize = view.getUint32(4, true);
	const dataEnd = Math.min(fileBytes.length, headerSize + dataSize);

	const definitions = new Map<number, DefMessage>();
	const records: FitRecord[] = [];
	const session: FitSessionSummary = {};

	let cur = headerSize;
	let lastFullTimestampSeconds = 0;

	while (cur < dataEnd) {
		const recHeader = fileBytes[cur];
		if (recHeader === undefined) break;
		cur += 1;

		const isCompressed = (recHeader & 0x80) !== 0;

		if (isCompressed) {
			// Compressed timestamp data message
			const localMsgType = (recHeader >> 5) & 0x03;
			const timeOffset = recHeader & 0x1f;

			// Advance timestamp based on 5-bit timeOffset
			if (lastFullTimestampSeconds > 0) {
				const lastOffset = lastFullTimestampSeconds & 0x1f;
				let diff = timeOffset - lastOffset;
				if (diff < 0) diff += 32;
				lastFullTimestampSeconds += diff;
			}

			const def = definitions.get(localMsgType);
			if (!def) {
				// Cannot parse without definition
				break;
			}

			if (def.globalMsgNum === 20) {
				// Record message
				const rec = parseDataMessageRecord(
					view,
					cur,
					def,
					lastFullTimestampSeconds,
				);
				records.push(rec);
			}

			// Advance by total field size
			let msgLen = 0;
			for (const f of def.fields) {
				msgLen += f.size;
			}
			cur += msgLen;
		} else {
			// Normal header
			const isDefinition = (recHeader & 0x40) !== 0;
			const hasDevData = (recHeader & 0x20) !== 0;
			const localMsgType = recHeader & 0x0f;

			if (isDefinition) {
				if (cur + 5 > dataEnd) break;
				// Reserved byte
				cur += 1;
				const littleEndian = (fileBytes[cur] ?? 0) === 0;
				cur += 1;
				const globalMsgNum = view.getUint16(cur, littleEndian);
				cur += 2;
				const numFields = fileBytes[cur] ?? 0;
				cur += 1;

				const fields: FieldDef[] = [];
				for (let i = 0; i < numFields && cur + 3 <= dataEnd; i++) {
					const fieldNum = fileBytes[cur] ?? 0;
					const size = fileBytes[cur + 1] ?? 0;
					const baseType = fileBytes[cur + 2] ?? 0;
					cur += 3;
					fields.push({ fieldNum, size, baseType });
				}

				if (hasDevData && cur < dataEnd) {
					const numDevFields = fileBytes[cur] ?? 0;
					cur += 1;
					cur += numDevFields * 3; // Skip dev field definitions
				}

				definitions.set(localMsgType, {
					littleEndian,
					globalMsgNum,
					fields,
				});
			} else {
				// Data message
				const def = definitions.get(localMsgType);
				if (!def) {
					break;
				}

				if (def.globalMsgNum === 20) {
					// Record message (GPS trackpoint)
					const rec = parseDataMessageRecord(
						view,
						cur,
						def,
						lastFullTimestampSeconds,
					);
					if (rec.timestamp) {
						// Update last full timestamp
						const date = new Date(rec.timestamp);
						const sec = Math.floor(
							(date.getTime() - GARMIN_TIME_OFFSET_MS) / 1000,
						);
						if (sec > 0) lastFullTimestampSeconds = sec;
					}
					records.push(rec);
				} else if (def.globalMsgNum === 18) {
					// Session summary message
					parseSessionSummary(view, cur, def, session);
				}

				let msgLen = 0;
				for (const f of def.fields) {
					msgLen += f.size;
				}
				cur += msgLen;
			}
		}
	}

	// Generate RFC 4180 CSV with UTF-8 BOM
	const csvHeaders = [
		"timestamp",
		"latitude",
		"longitude",
		"altitude_m",
		"distance_m",
		"heart_rate_bpm",
		"cadence_rpm",
		"power_watts",
		"speed_kmh",
		"temperature_c",
	];

	const csvRows = [csvHeaders.join(",")];
	for (const r of records) {
		const row = [
			r.timestamp ?? "",
			r.latitude !== undefined ? r.latitude.toFixed(7) : "",
			r.longitude !== undefined ? r.longitude.toFixed(7) : "",
			r.altitudeMeters !== undefined ? r.altitudeMeters.toFixed(1) : "",
			r.distanceMeters !== undefined ? r.distanceMeters.toFixed(1) : "",
			r.heartRateBpm !== undefined ? String(r.heartRateBpm) : "",
			r.cadenceRpm !== undefined ? String(r.cadenceRpm) : "",
			r.powerWatts !== undefined ? String(r.powerWatts) : "",
			r.speedKmh !== undefined ? r.speedKmh.toFixed(2) : "",
			r.temperatureCelsius !== undefined ? String(r.temperatureCelsius) : "",
		];
		csvRows.push(row.join(","));
	}
	const csvString = `\uFEFF${csvRows.join("\r\n")}\r\n`;

	// Generate GPX 1.1 XML
	const gpxTrkpts: string[] = [];
	for (const r of records) {
		if (r.latitude !== undefined && r.longitude !== undefined) {
			const trkptLines = [
				`      <trkpt lat="${r.latitude.toFixed(7)}" lon="${r.longitude.toFixed(7)}">`,
			];
			if (r.altitudeMeters !== undefined) {
				trkptLines.push(`        <ele>${r.altitudeMeters.toFixed(1)}</ele>`);
			}
			if (r.timestamp) {
				trkptLines.push(`        <time>${r.timestamp}</time>`);
			}
			if (
				r.heartRateBpm !== undefined ||
				r.cadenceRpm !== undefined ||
				r.powerWatts !== undefined ||
				r.temperatureCelsius !== undefined
			) {
				trkptLines.push("        <extensions>");
				if (r.powerWatts !== undefined) {
					trkptLines.push(`          <power>${r.powerWatts}</power>`);
				}
				trkptLines.push("          <gpxtpx:TrackPointExtension>");
				if (r.temperatureCelsius !== undefined) {
					trkptLines.push(
						`            <gpxtpx:atemp>${r.temperatureCelsius}</gpxtpx:atemp>`,
					);
				}
				if (r.heartRateBpm !== undefined) {
					trkptLines.push(
						`            <gpxtpx:hr>${r.heartRateBpm}</gpxtpx:hr>`,
					);
				}
				if (r.cadenceRpm !== undefined) {
					trkptLines.push(
						`            <gpxtpx:cad>${r.cadenceRpm}</gpxtpx:cad>`,
					);
				}
				trkptLines.push("          </gpxtpx:TrackPointExtension>");
				trkptLines.push("        </extensions>");
			}
			trkptLines.push("      </trkpt>");
			gpxTrkpts.push(trkptLines.join("\n"));
		}
	}

	const gpxString = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<gpx version="1.1" creator="convrtr (https://convrtr.io)" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">`,
		`  <metadata>`,
		`    <name>${session.sport ? session.sport.toUpperCase() : "Activity"} Tracking</name>`,
		session.startTime ? `    <time>${session.startTime}</time>` : "",
		`  </metadata>`,
		`  <trk>`,
		`    <name>${session.sport ?? "Activity"}</name>`,
		`    <trkseg>`,
		...gpxTrkpts,
		`    </trkseg>`,
		`  </trk>`,
		`</gpx>`,
	]
		.filter((line) => line.length > 0)
		.join("\n");

	return {
		session,
		records,
		csv: csvString,
		gpx: gpxString,
	};
}

/**
 * Parses record fields from a data message.
 */
function parseDataMessageRecord(
	view: DataView,
	startOffset: number,
	def: DefMessage,
	fallbackTimestampSec: number,
): FitRecord {
	const rec: FitRecord = {};
	let off = startOffset;

	for (const f of def.fields) {
		const val = readFieldScalar(view, off, f.baseType, def.littleEndian);
		off += f.size;

		if (val === null) continue;

		switch (f.fieldNum) {
			case 253: // timestamp
				rec.timestamp = formatGarminTimestamp(val);
				break;
			case 0: // position_lat (semicircles)
				rec.latitude = val * SEMICIRCLE_TO_DEGREE;
				break;
			case 1: // position_long (semicircles)
				rec.longitude = val * SEMICIRCLE_TO_DEGREE;
				break;
			case 2: // altitude (scaled uint16)
			case 78: // enhanced_altitude
				rec.altitudeMeters = val / 5 - 500;
				break;
			case 3: // heart_rate (bpm)
				rec.heartRateBpm = val;
				break;
			case 4: // cadence (rpm)
				rec.cadenceRpm = val;
				break;
			case 5: // distance (scaled meters)
				rec.distanceMeters = val / 100;
				break;
			case 6: // speed (scaled m/s)
			case 73: // enhanced_speed
				rec.speedKmh = (val / 1000) * 3.6;
				break;
			case 7: // power (watts)
				rec.powerWatts = val;
				break;
			case 13: // temperature (celsius)
				rec.temperatureCelsius = val;
				break;
		}
	}

	if (!rec.timestamp && fallbackTimestampSec > 0) {
		rec.timestamp = formatGarminTimestamp(fallbackTimestampSec);
	}

	return rec;
}

/**
 * Parses session summary message (Global message 18).
 */
function parseSessionSummary(
	view: DataView,
	startOffset: number,
	def: DefMessage,
	summary: FitSessionSummary,
): void {
	let off = startOffset;

	for (const f of def.fields) {
		const val = readFieldScalar(view, off, f.baseType, def.littleEndian);
		off += f.size;

		if (val === null) continue;

		switch (f.fieldNum) {
			case 2: // timestamp (start or end)
				summary.startTime = formatGarminTimestamp(val);
				break;
			case 5: // sport
				summary.sport = SPORT_NAMES[val] ?? `sport_${val}`;
				break;
			case 6: // sub_sport
				summary.subSport = String(val);
				break;
			case 7: // total_elapsed_time (scaled s)
				summary.totalElapsedTimeSec = val / 1000;
				break;
			case 8: // total_timer_time (scaled s)
				summary.totalTimerTimeSec = val / 1000;
				break;
			case 9: // total_distance (scaled m)
				summary.totalDistanceMeters = val / 100;
				break;
			case 11: // total_calories
				summary.totalCalories = val;
				break;
			case 14: // avg_speed
			case 124: // enhanced_avg_speed
				summary.avgSpeedKmh = (val / 1000) * 3.6;
				break;
			case 15: // max_speed
			case 125: // enhanced_max_speed
				summary.maxSpeedKmh = (val / 1000) * 3.6;
				break;
			case 16: // avg_heart_rate
				summary.avgHeartRateBpm = val;
				break;
			case 17: // max_heart_rate
				summary.maxHeartRateBpm = val;
				break;
			case 18: // avg_cadence
				summary.avgCadenceRpm = val;
				break;
			case 19: // max_cadence
				summary.maxCadenceRpm = val;
				break;
			case 20: // avg_power
				summary.avgPowerWatts = val;
				break;
			case 21: // max_power
				summary.maxPowerWatts = val;
				break;
			case 22: // total_ascent
				summary.totalAscentMeters = val;
				break;
			case 23: // total_descent
				summary.totalDescentMeters = val;
				break;
		}
	}
}

/**
 * Converts a Garmin / Strava / Wahoo FIT file into an RFC 4180 CSV spreadsheet.
 */
export function convertFitToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "PARSING_FIT");
	const result = parseFit(new Uint8Array(input));

	onProgress?.(0.7, "GENERATING_CSV");
	const encoder = new TextEncoder();
	const encoded = encoder.encode(result.csv);

	onProgress?.(1.0, "DONE");
	return encoded.buffer as ArrayBuffer;
}
