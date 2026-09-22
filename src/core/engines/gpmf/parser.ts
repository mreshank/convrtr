export interface GpmfSample {
	time: string;
	latitude: string;
	longitude: string;
	altitude: string;
	speed2d: string;
	speed3d: string;
	stream: number;
}

interface Box {
	fourcc: string;
	type: number;
	size: number;
	repeat: number;
	data: Uint8Array;
}

function readBoxes(buf: Uint8Array, start: number, end: number): Box[] {
	const boxes: Box[] = [];
	const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	let off = start;
	while (off + 8 <= end) {
		const fourcc = String.fromCharCode(
			buf[off] ?? 0,
			buf[off + 1] ?? 0,
			buf[off + 2] ?? 0,
			buf[off + 3] ?? 0,
		);
		if (/^\0+$/.test(fourcc)) break;
		const type = buf[off + 4] ?? 0;
		const size = buf[off + 5] ?? 0;
		const repeat = v.getUint16(off + 6, false);
		const dataStart = off + 8;
		const padded = size * repeat + ((4 - ((size * repeat) % 4)) % 4);
		if (dataStart + padded > end + 4) break; // tolerate trailing garbage
		boxes.push({
			fourcc,
			type,
			size,
			repeat,
			data: buf.subarray(dataStart, dataStart + size * repeat),
		});
		off = dataStart + padded;
	}
	return boxes;
}

function readInt32(data: Uint8Array, i: number): number {
	const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
	return v.getInt32(i * 4, false);
}

function readUint32(data: Uint8Array, i: number): number {
	const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
	return v.getUint32(i * 4, false);
}

function ascii(data: Uint8Array): string {
	return new TextDecoder("ascii").decode(data).replace(/\0+$/g, "").trim();
}

function fmt(n: number, digits = 6): string {
	if (!Number.isFinite(n)) return "";
	return String(Number(n.toFixed(digits)));
}

/**
 * Converts GoPro GPMF telemetry (`.bin` from Labs firmware / telemetry
 * extractor sidecars) into a CSV GPS track.
 *
 * GPMF is nested FourCC KLV: DEVC → STRM → GPS5/GPSU/STMP/SCAL… GPS5 carries
 * int32 lat/lon/alt/speed samples divided by the sibling SCAL denominators;
 * GPSU gives the wall-clock anchor, STMP the per-payload timing. Accelerometer
 * and gyroscope streams ride alongside — this tool takes the GPS track
 * (the mapping input) and states the rest as out of scope on the tool page.
 */
export function parseGpmf(fileBytes: Uint8Array): GpmfSample[] {
	const samples: GpmfSample[] = [];
	let streamIndex = 0;

	for (const devc of readBoxes(fileBytes, 0, fileBytes.length).filter(
		(b) => b.fourcc === "DEVC",
	)) {
		const devBoxes = readBoxes(devc.data, 0, devc.data.length);
		for (const box of devBoxes) {
			if (box.fourcc !== "STRM") continue;
			streamIndex++;
			const inner = readBoxes(box.data, 0, box.data.length);
			let scale: number[] = [];
			let gps: number[] = [];
			let utc = "";
			for (const b of inner) {
				if (b.fourcc === "SCAL" && b.size === 4) {
					scale = [];
					for (let i = 0; i < b.repeat; i++)
						scale.push(readUint32(b.data, i) || 1);
				} else if (b.fourcc === "GPS5" && b.size === 4) {
					gps = [];
					for (let i = 0; i < b.repeat; i++) gps.push(readInt32(b.data, i));
				} else if (b.fourcc === "GPSU") {
					utc = ascii(b.data);
				}
			}
			if (gps.length < 5) continue;
			const [latS = 1, lonS = 1, altS = 1, s2S = 1, s3S = 1] =
				scale.length >= 5 ? scale : [1, 1, 1, 1, 1];
			const count = Math.floor(gps.length / 5);
			for (let i = 0; i < count; i++) {
				const g = gps.slice(i * 5, i * 5 + 5);
				samples.push({
					time:
						utc && i === 0
							? utc
							: utc
								? `${utc}+${i}`
								: `sample-${streamIndex}-${i}`,
					latitude: fmt((g[0] ?? 0) / (latS as number)),
					longitude: fmt((g[1] ?? 0) / (lonS as number)),
					altitude: fmt((g[2] ?? 0) / (altS as number), 3),
					speed2d: fmt((g[3] ?? 0) / (s2S as number), 3),
					speed3d: fmt((g[4] ?? 0) / (s3S as number), 3),
					stream: streamIndex,
				});
			}
		}
	}

	if (samples.length === 0) {
		throw new Error(
			"No GPS track found: expected GPMF DEVC/STRM boxes with GPS5 samples (accelerometer/gyro-only payloads are out of scope).",
		);
	}
	return samples;
}

function csvCell(s: string): string {
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function convertGpmfToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading telemetry boxes...");
	const samples = parseGpmf(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${samples.length} fixes...`);
	const head = "time,latitude,longitude,altitude,speed2d,speed3d,stream";
	const lines = samples.map((s) =>
		[
			s.time,
			s.latitude,
			s.longitude,
			s.altitude,
			s.speed2d,
			s.speed3d,
			String(s.stream),
		]
			.map(csvCell)
			.join(","),
	);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(`\uFEFF${head}\n${lines.join("\n")}\n`)
		.buffer as ArrayBuffer;
}
