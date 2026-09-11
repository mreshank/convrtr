import { SITE } from "@/lib/site";
import type {
	GeoJsonFeature,
	GeoJsonFeatureCollection,
	GeoJsonLineStringGeometry,
	GeoJsonPointGeometry,
	TcxActivity,
	TcxCourse,
	TcxCoursePoint,
	TcxData,
	TcxLap,
	TcxTrackpoint,
} from "./types";

/**
 * Extracts inner content of an XML tag, safely handling namespaces and CDATA blocks.
 */
function extractTagContent(xml: string, tagName: string): string | undefined {
	const pattern = new RegExp(
		`<(?:[\\w-]+:)?${tagName}(?:\\s+[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/(?:[\\w-]+:)?${tagName}>`,
		"i",
	);
	const match = pattern.exec(xml);
	if (!match) return undefined;
	const content = match[1] ?? match[2];
	return content?.trim();
}

/**
 * Extracts an attribute value from an XML tag.
 */
function extractAttribute(
	tagXml: string,
	attrName: string,
): string | undefined {
	const pattern = new RegExp(`${attrName}=["']([^"']*)["']`, "i");
	const match = pattern.exec(tagXml);
	return match ? match[1] : undefined;
}

/**
 * Finds all occurrences of an XML block by tag name.
 */
function extractAllBlocks(xml: string, tagName: string): string[] {
	const results: string[] = [];
	const openPattern = new RegExp(
		`<(?:[\\w-]+:)?${tagName}(?:\\s+[^>]*)?>`,
		"gi",
	);
	let match: RegExpExecArray | null = openPattern.exec(xml);

	while (match !== null) {
		const startIndex = match.index;
		const openTag = match[0];
		if (openTag.endsWith("/>")) {
			results.push(openTag);
			match = openPattern.exec(xml);
			continue;
		}

		const closeTagPattern = new RegExp(`</(?:[\\w-]+:)?${tagName}>`, "gi");
		closeTagPattern.lastIndex = startIndex + openTag.length;
		const closeMatch = closeTagPattern.exec(xml);
		if (closeMatch) {
			const endIndex = closeMatch.index + closeMatch[0].length;
			results.push(xml.slice(startIndex, endIndex));
			openPattern.lastIndex = endIndex;
		} else {
			break;
		}
		match = openPattern.exec(xml);
	}

	return results;
}

/**
 * Parses a single <Trackpoint> XML block.
 */
function parseTrackpoint(block: string): TcxTrackpoint | null {
	const posBlock = extractTagContent(block, "Position");
	if (!posBlock) return null;

	const latStr = extractTagContent(posBlock, "LatitudeDegrees");
	const lonStr = extractTagContent(posBlock, "LongitudeDegrees");
	if (!latStr || !lonStr) return null;

	const latitude = Number.parseFloat(latStr);
	const longitude = Number.parseFloat(lonStr);
	if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

	const time = extractTagContent(block, "Time");
	const altStr = extractTagContent(block, "AltitudeMeters");
	const altitude = altStr ? Number.parseFloat(altStr) : undefined;

	const distStr = extractTagContent(block, "DistanceMeters");
	const distance = distStr ? Number.parseFloat(distStr) : undefined;

	const hrBlock = extractTagContent(block, "HeartRateBpm");
	const hrStr = hrBlock ? extractTagContent(hrBlock, "Value") : undefined;
	const heartRate = hrStr ? Number.parseInt(hrStr, 10) : undefined;

	const cadStr = extractTagContent(block, "Cadence");
	const cadence = cadStr ? Number.parseInt(cadStr, 10) : undefined;

	// Check Extensions for Speed and Watts (TPX schema)
	let speed: number | undefined;
	let watts: number | undefined;
	const extBlock = extractTagContent(block, "Extensions");
	if (extBlock) {
		const speedStr = extractTagContent(extBlock, "Speed");
		if (speedStr) speed = Number.parseFloat(speedStr);

		const wattsStr = extractTagContent(extBlock, "Watts");
		if (wattsStr) watts = Number.parseInt(wattsStr, 10);
	}

	return {
		latitude,
		longitude,
		time,
		altitude: Number.isNaN(altitude) ? undefined : altitude,
		distance: Number.isNaN(distance) ? undefined : distance,
		heartRate: Number.isNaN(heartRate) ? undefined : heartRate,
		cadence: Number.isNaN(cadence) ? undefined : cadence,
		speed: Number.isNaN(speed) ? undefined : speed,
		watts: Number.isNaN(watts) ? undefined : watts,
	};
}

/**
 * Parses a TCX XML document into structured in-memory data.
 */
export function parseTcx(tcxXml: string): TcxData {
	const activities: TcxActivity[] = [];
	const courses: TcxCourse[] = [];

	// Parse Activities
	const activityBlocks = extractAllBlocks(tcxXml, "Activity");
	for (const actBlock of activityBlocks) {
		const firstTagMatch = actBlock.match(/<(?:\w+:)?Activity(\s+[^>]*)?>/i);
		const sport = firstTagMatch
			? extractAttribute(firstTagMatch[0], "Sport")
			: undefined;
		const id = extractTagContent(actBlock, "Id");

		const lapBlocks = extractAllBlocks(actBlock, "Lap");
		const laps: TcxLap[] = [];

		for (const lapBlock of lapBlocks) {
			const firstLapTag = lapBlock.match(/<(?:\w+:)?Lap(\s+[^>]*)?>/i);
			const startTime = firstLapTag
				? extractAttribute(firstLapTag[0], "StartTime")
				: undefined;

			const timeStr = extractTagContent(lapBlock, "TotalTimeSeconds");
			const totalTimeSeconds = timeStr ? Number.parseFloat(timeStr) : undefined;

			const distStr = extractTagContent(lapBlock, "DistanceMeters");
			const distanceMeters = distStr ? Number.parseFloat(distStr) : undefined;

			const maxSpeedStr = extractTagContent(lapBlock, "MaximumSpeed");
			const maximumSpeed = maxSpeedStr
				? Number.parseFloat(maxSpeedStr)
				: undefined;

			const calStr = extractTagContent(lapBlock, "Calories");
			const calories = calStr ? Number.parseInt(calStr, 10) : undefined;

			const avgHrBlock = extractTagContent(lapBlock, "AverageHeartRateBpm");
			const avgHrStr = avgHrBlock
				? extractTagContent(avgHrBlock, "Value")
				: undefined;
			const averageHeartRateBpm = avgHrStr
				? Number.parseInt(avgHrStr, 10)
				: undefined;

			const maxHrBlock = extractTagContent(lapBlock, "MaximumHeartRateBpm");
			const maxHrStr = maxHrBlock
				? extractTagContent(maxHrBlock, "Value")
				: undefined;
			const maximumHeartRateBpm = maxHrStr
				? Number.parseInt(maxHrStr, 10)
				: undefined;

			const intensity = extractTagContent(lapBlock, "Intensity");
			const cadStr = extractTagContent(lapBlock, "Cadence");
			const cadence = cadStr ? Number.parseInt(cadStr, 10) : undefined;

			const tpBlocks = extractAllBlocks(lapBlock, "Trackpoint");
			const trackpoints: TcxTrackpoint[] = [];
			for (const tpBlock of tpBlocks) {
				const pt = parseTrackpoint(tpBlock);
				if (pt) trackpoints.push(pt);
			}

			laps.push({
				startTime,
				totalTimeSeconds,
				distanceMeters,
				maximumSpeed,
				calories,
				averageHeartRateBpm,
				maximumHeartRateBpm,
				intensity,
				cadence,
				trackpoints,
			});
		}

		activities.push({
			id,
			sport,
			laps,
		});
	}

	// Parse Courses
	const courseBlocks = extractAllBlocks(tcxXml, "Course");
	for (const courseBlock of courseBlocks) {
		const name = extractTagContent(courseBlock, "Name");
		const tpBlocks = extractAllBlocks(courseBlock, "Trackpoint");
		const trackpoints: TcxTrackpoint[] = [];
		for (const tpBlock of tpBlocks) {
			const pt = parseTrackpoint(tpBlock);
			if (pt) trackpoints.push(pt);
		}

		const cpBlocks = extractAllBlocks(courseBlock, "CoursePoint");
		const coursePoints: TcxCoursePoint[] = [];
		for (const cpBlock of cpBlocks) {
			const cpName = extractTagContent(cpBlock, "Name") ?? "Course Point";
			const time = extractTagContent(cpBlock, "Time");
			const posBlock = extractTagContent(cpBlock, "Position");
			if (!posBlock) continue;

			const latStr = extractTagContent(posBlock, "LatitudeDegrees");
			const lonStr = extractTagContent(posBlock, "LongitudeDegrees");
			if (!latStr || !lonStr) continue;

			const latitude = Number.parseFloat(latStr);
			const longitude = Number.parseFloat(lonStr);
			if (Number.isNaN(latitude) || Number.isNaN(longitude)) continue;

			const altStr = extractTagContent(cpBlock, "AltitudeMeters");
			const altitude = altStr ? Number.parseFloat(altStr) : undefined;
			const pointType = extractTagContent(cpBlock, "PointType");
			const notes = extractTagContent(cpBlock, "Notes");

			coursePoints.push({
				name: cpName,
				time,
				latitude,
				longitude,
				altitude,
				pointType,
				notes,
			});
		}

		courses.push({
			name,
			trackpoints,
			coursePoints,
		});
	}

	return { activities, courses };
}

/**
 * Converts Garmin TCX data into an RFC 7946 GeoJSON FeatureCollection.
 */
export function convertTcxToGeoJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading TCX XML");

	const decoder = new TextDecoder("utf-8");
	const xmlText = decoder.decode(input);

	if (
		!xmlText.includes("TrainingCenterDatabase") &&
		!xmlText.includes("Activity") &&
		!xmlText.includes("Trackpoint")
	) {
		throw new Error(
			"Invalid TCX file: Missing TrainingCenterDatabase root element",
		);
	}

	onProgress?.(0.3, "Parsing activities, laps, and trackpoints");
	const data = parseTcx(xmlText);

	const features: GeoJsonFeature[] = [];
	let totalDistanceAcrossAll = 0;
	let totalDurationAcrossAll = 0;
	let primarySport = "Activity";

	onProgress?.(0.6, "Transforming coordinates and telemetry");

	// Process Activities
	for (let aIdx = 0; aIdx < data.activities.length; aIdx++) {
		const activity = data.activities[aIdx];
		if (!activity) continue;
		if (activity.sport) primarySport = activity.sport;

		for (let lIdx = 0; lIdx < activity.laps.length; lIdx++) {
			const lap = activity.laps[lIdx];
			if (!lap) continue;
			if (lap.distanceMeters) totalDistanceAcrossAll += lap.distanceMeters;
			if (lap.totalTimeSeconds) totalDurationAcrossAll += lap.totalTimeSeconds;

			if (lap.trackpoints.length > 0) {
				const coords: ([number, number] | [number, number, number])[] = [];
				const times: string[] = [];
				const heartRates: (number | null)[] = [];
				const cadences: (number | null)[] = [];
				const watts: (number | null)[] = [];
				const speeds: (number | null)[] = [];

				let elevationGain = 0;
				let elevationLoss = 0;
				let minEle = Number.POSITIVE_INFINITY;
				let maxEle = Number.NEGATIVE_INFINITY;
				let prevAlt: number | undefined;

				let hrSum = 0;
				let hrCount = 0;
				let maxHr = 0;

				let wattSum = 0;
				let wattCount = 0;
				let maxWatt = 0;

				for (const pt of lap.trackpoints) {
					const coord: [number, number] | [number, number, number] =
						pt.altitude !== undefined
							? [pt.longitude, pt.latitude, pt.altitude]
							: [pt.longitude, pt.latitude];
					coords.push(coord);

					if (pt.time) times.push(pt.time);
					heartRates.push(pt.heartRate ?? null);
					cadences.push(pt.cadence ?? null);
					watts.push(pt.watts ?? null);
					speeds.push(pt.speed ?? null);

					if (pt.altitude !== undefined) {
						if (pt.altitude < minEle) minEle = pt.altitude;
						if (pt.altitude > maxEle) maxEle = pt.altitude;

						if (prevAlt !== undefined) {
							const diff = pt.altitude - prevAlt;
							if (diff > 0) elevationGain += diff;
							else elevationLoss += Math.abs(diff);
						}
						prevAlt = pt.altitude;
					}

					if (pt.heartRate !== undefined) {
						hrSum += pt.heartRate;
						hrCount++;
						if (pt.heartRate > maxHr) maxHr = pt.heartRate;
					}

					if (pt.watts !== undefined) {
						wattSum += pt.watts;
						wattCount++;
						if (pt.watts > maxWatt) maxWatt = pt.watts;
					}
				}

				const geom: GeoJsonLineStringGeometry = {
					type: "LineString",
					coordinates: coords,
				};

				const props: Record<string, unknown> = {
					name: `${activity.sport ?? "Activity"} - Lap ${lIdx + 1}`,
					sport: activity.sport ?? "Activity",
					activityId: activity.id,
					lapIndex: lIdx + 1,
					startTime: lap.startTime ?? lap.trackpoints[0]?.time,
					endTime: lap.trackpoints[lap.trackpoints.length - 1]?.time,
					totalDistanceMeters: lap.distanceMeters,
					totalTimeSeconds: lap.totalTimeSeconds,
					calories: lap.calories,
					averageHeartRateBpm:
						lap.averageHeartRateBpm ??
						(hrCount > 0 ? Math.round(hrSum / hrCount) : undefined),
					maxHeartRateBpm:
						lap.maximumHeartRateBpm ?? (maxHr > 0 ? maxHr : undefined),
					averageWatts:
						wattCount > 0 ? Math.round(wattSum / wattCount) : undefined,
					maxWatts: maxWatt > 0 ? maxWatt : undefined,
					maximumSpeed: lap.maximumSpeed,
					elevationGainMeters:
						elevationGain > 0 ? Math.round(elevationGain * 10) / 10 : undefined,
					elevationLossMeters:
						elevationLoss > 0 ? Math.round(elevationLoss * 10) / 10 : undefined,
					elevationMinMeters:
						minEle !== Number.POSITIVE_INFINITY ? minEle : undefined,
					elevationMaxMeters:
						maxEle !== Number.NEGATIVE_INFINITY ? maxEle : undefined,
					pointCount: coords.length,
					coordinateProperties: {
						times,
						heartRates,
						cadences,
						watts,
						speeds,
					},
				};

				features.push({
					type: "Feature",
					geometry: geom,
					properties: props,
				});

				// Add Lap Start Marker Point
				const firstPt = lap.trackpoints[0];
				if (firstPt) {
					const ptGeom: GeoJsonPointGeometry = {
						type: "Point",
						coordinates:
							firstPt.altitude !== undefined
								? [firstPt.longitude, firstPt.latitude, firstPt.altitude]
								: [firstPt.longitude, firstPt.latitude],
					};
					features.push({
						type: "Feature",
						geometry: ptGeom,
						properties: {
							name: `Lap ${lIdx + 1} Start`,
							type: "lap_start",
							lapNumber: lIdx + 1,
							time: firstPt.time,
							distanceMeters: lap.distanceMeters,
							totalTimeSeconds: lap.totalTimeSeconds,
						},
					});
				}
			}
		}
	}

	// Process Courses
	for (const course of data.courses) {
		if (course.trackpoints.length > 0) {
			const coords: ([number, number] | [number, number, number])[] =
				course.trackpoints.map((pt) =>
					pt.altitude !== undefined
						? [pt.longitude, pt.latitude, pt.altitude]
						: [pt.longitude, pt.latitude],
				);

			features.push({
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: coords,
				},
				properties: {
					name: course.name ?? "Course Track",
					type: "course",
					pointCount: coords.length,
				},
			});
		}

		for (const cp of course.coursePoints) {
			features.push({
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates:
						cp.altitude !== undefined
							? [cp.longitude, cp.latitude, cp.altitude]
							: [cp.longitude, cp.latitude],
				},
				properties: {
					name: cp.name,
					type: "course_point",
					pointType: cp.pointType,
					time: cp.time,
					notes: cp.notes,
				},
			});
		}
	}

	const featureCollection: GeoJsonFeatureCollection = {
		type: "FeatureCollection",
		properties: {
			generator: `convrtr (${SITE})`,
			sport: primarySport,
			totalFeatures: features.length,
			totalDistanceMeters:
				totalDistanceAcrossAll > 0 ? totalDistanceAcrossAll : undefined,
			totalDurationSeconds:
				totalDurationAcrossAll > 0 ? totalDurationAcrossAll : undefined,
		},
		features,
	};

	onProgress?.(0.9, "Serializing GeoJSON");
	const jsonString = JSON.stringify(featureCollection, null, 2);
	const encoder = new TextEncoder();
	const resultBytes = encoder.encode(jsonString);

	onProgress?.(1.0, "Complete");
	return resultBytes.buffer.slice(
		resultBytes.byteOffset,
		resultBytes.byteOffset + resultBytes.byteLength,
	) as ArrayBuffer;
}
