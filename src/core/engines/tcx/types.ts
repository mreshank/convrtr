/**
 * Garmin Training Center XML (.tcx) data models and GeoJSON types.
 */

export interface TcxTrackpoint {
	time?: string;
	latitude: number;
	longitude: number;
	altitude?: number;
	distance?: number;
	heartRate?: number;
	cadence?: number;
	speed?: number;
	watts?: number;
}

export interface TcxLap {
	startTime?: string;
	totalTimeSeconds?: number;
	distanceMeters?: number;
	maximumSpeed?: number;
	calories?: number;
	averageHeartRateBpm?: number;
	maximumHeartRateBpm?: number;
	intensity?: string;
	cadence?: number;
	trackpoints: TcxTrackpoint[];
}

export interface TcxActivity {
	id?: string;
	sport?: string;
	laps: TcxLap[];
}

export interface TcxCoursePoint {
	name: string;
	time?: string;
	latitude: number;
	longitude: number;
	altitude?: number;
	pointType?: string;
	notes?: string;
}

export interface TcxCourse {
	name?: string;
	trackpoints: TcxTrackpoint[];
	coursePoints: TcxCoursePoint[];
}

export interface TcxData {
	activities: TcxActivity[];
	courses: TcxCourse[];
}

export interface GeoJsonPointGeometry {
	type: "Point";
	coordinates: [number, number] | [number, number, number];
}

export interface GeoJsonLineStringGeometry {
	type: "LineString";
	coordinates: ([number, number] | [number, number, number])[];
}

export interface GeoJsonMultiLineStringGeometry {
	type: "MultiLineString";
	coordinates: ([number, number] | [number, number, number])[][];
}

export interface GeoJsonFeature {
	type: "Feature";
	geometry:
		| GeoJsonPointGeometry
		| GeoJsonLineStringGeometry
		| GeoJsonMultiLineStringGeometry;
	properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
	type: "FeatureCollection";
	features: GeoJsonFeature[];
	properties?: Record<string, unknown>;
}
