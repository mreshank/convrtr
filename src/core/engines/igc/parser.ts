/**
 * FAI International Gliding Commission (.igc) Flight Log Parser & GPX/KML Converter.
 *
 * .igc is the global open standard format defined by the Fédération Aéronautique
 * Internationale (FAI) for certified GNSS flight recorders used in gliders,
 * sailplanes, paragliders, and hang gliders.
 *
 * Format Architecture:
 * - Line records identified by leading single character:
 *   - `A`: Flight recorder manufacturer and ID
 *   - `H`: Header metadata (date, pilot, glider model, registration)
 *   - `B`: Fix records:
 *     `B HHMMSS DDMMmmmN DDDMMmmmE A PPPPP GGGGG`
 *     - HHMMSS: UTC timestamp
 *     - DDMMmmmN/S: Latitude (degrees + minutes.thousandths)
 *     - DDDMMmmmE/W: Longitude (degrees + minutes.thousandths)
 *     - A/V: Fix validity (A=3D valid, V=nav warning)
 *     - PPPPP: Pressure altitude (meters)
 *     - GGGGG: GNSS altitude (meters)
 */

export interface IgcPoint {
	time: string; // ISO timestamp or HH:MM:SS
	lat: number;
	lon: number;
	pressureAlt: number;
	gpsAlt: number;
}

export interface IgcFlight {
	date?: string; // YYYY-MM-DD
	pilot?: string;
	gliderType?: string;
	gliderId?: string;
	points: IgcPoint[];
}

export function parseIgc(text: string): IgcFlight {
	const lines = text.split(/\r?\n/);
	let flightDate = "2026-01-01";
	let pilot: string | undefined;
	let gliderType: string | undefined;
	let gliderId: string | undefined;
	const points: IgcPoint[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;

		const type = line[0];

		if (type === "H") {
			// Header record
			if (/^H[FPO]DTE(?:DATE)?:?(\d{2})(\d{2})(\d{2})/i.test(line)) {
				const m = /^H[FPO]DTE(?:DATE)?:?(\d{2})(\d{2})(\d{2})/i.exec(line);
				if (m?.[1] && m[2] && m[3]) {
					const dd = m[1];
					const mm = m[2];
					let yy = Number.parseInt(m[3], 10);
					yy += yy < 70 ? 2000 : 1900;
					flightDate = `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
				}
			} else if (/^H[FPO]PLT/i.test(line)) {
				const colonIdx = line.indexOf(":");
				pilot =
					colonIdx !== -1
						? line.substring(colonIdx + 1).trim()
						: line.substring(5).trim();
			} else if (/^H[FPO]GTY/i.test(line)) {
				const colonIdx = line.indexOf(":");
				gliderType =
					colonIdx !== -1
						? line.substring(colonIdx + 1).trim()
						: line.substring(5).trim();
			} else if (/^H[FPO]GID/i.test(line)) {
				const colonIdx = line.indexOf(":");
				gliderId =
					colonIdx !== -1
						? line.substring(colonIdx + 1).trim()
						: line.substring(5).trim();
			}
		} else if (type === "B" && line.length >= 35) {
			// B-Record: B HHMMSS DDMMmmmN DDDMMmmmE A PPPPP GGGGG
			const timeStr = line.substring(1, 7);
			const latDeg = Number.parseInt(line.substring(7, 9), 10);
			const latMin = Number.parseInt(line.substring(9, 14), 10) / 1000;
			const latHem = line[14]?.toUpperCase();

			const lonDeg = Number.parseInt(line.substring(15, 18), 10);
			const lonMin = Number.parseInt(line.substring(18, 23), 10) / 1000;
			const lonHem = line[23]?.toUpperCase();

			let lat = latDeg + latMin / 60;
			if (latHem === "S") lat = -lat;

			let lon = lonDeg + lonMin / 60;
			if (lonHem === "W") lon = -lon;

			const pressAlt = Number.parseInt(line.substring(25, 30), 10);
			const gpsAlt = Number.parseInt(line.substring(30, 35), 10);

			const hh = timeStr.substring(0, 2);
			const mm = timeStr.substring(2, 4);
			const ss = timeStr.substring(4, 6);
			const isoTime = `${flightDate}T${hh}:${mm}:${ss}Z`;

			points.push({
				time: isoTime,
				lat: Math.round(lat * 1000000) / 1000000,
				lon: Math.round(lon * 1000000) / 1000000,
				pressureAlt: Number.isNaN(pressAlt) ? 0 : pressAlt,
				gpsAlt: Number.isNaN(gpsAlt) ? 0 : gpsAlt,
			});
		}
	}

	if (points.length === 0) {
		throw new Error("Invalid .igc file: no valid B-record track fixes found.");
	}

	return {
		date: flightDate,
		pilot,
		gliderType,
		gliderId,
		points,
	};
}

export function formatIgcGpx(flight: IgcFlight): string {
	const trackName = flight.pilot
		? `Glider Flight - ${flight.pilot}`
		: `Glider Flight ${flight.date ?? ""}`;

	let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="convrtr" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(trackName)}</name>
    <time>${flight.date}T00:00:00Z</time>
  </metadata>
  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
`;

	for (const pt of flight.points) {
		const ele = pt.gpsAlt || pt.pressureAlt;
		gpx += `      <trkpt lat="${pt.lat}" lon="${pt.lon}">\n`;
		gpx += `        <ele>${ele}</ele>\n`;
		gpx += `        <time>${pt.time}</time>\n`;
		gpx += `      </trkpt>\n`;
	}

	gpx += `    </trkseg>
  </trk>
</gpx>\n`;

	return gpx;
}

export function formatIgcKml(flight: IgcFlight): string {
	const name = flight.pilot
		? `Glider Flight - ${flight.pilot}`
		: "Glider Flight Path";

	const coords = flight.points
		.map((p) => `${p.lon},${p.lat},${p.gpsAlt || p.pressureAlt}`)
		.join(" ");

	return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(name)}</name>
    <Placemark>
      <name>Track Path</name>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>\n`;
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function convertIgc(
	input: ArrayBuffer,
	asKml = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing IGC flight logger records...");
	const text = new TextDecoder("utf-8", { fatal: false }).decode(input);
	const flight = parseIgc(text);

	onProgress?.(
		0.7,
		`Generating ${asKml ? "KML" : "GPX"} from ${flight.points.length} fixes...`,
	);
	const output = asKml ? formatIgcKml(flight) : formatIgcGpx(flight);

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(output).buffer as ArrayBuffer;
}
