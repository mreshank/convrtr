import { describe, expect, it } from "vitest";
import { gpmfToCsvEngine } from "../index";
import { convertGpmfToCsv, parseGpmf } from "../parser";

function box(
	fourcc: string,
	type: number,
	repeat: number,
	data: Uint8Array,
): Uint8Array {
	const size = Math.ceil(data.length / repeat);
	const padded = size * repeat + ((4 - ((size * repeat) % 4)) % 4);
	const out = new Uint8Array(8 + padded);
	new TextEncoder().encodeInto(fourcc, out.subarray(0));
	out[4] = type;
	out[5] = size;
	new DataView(out.buffer).setUint16(6, repeat, false);
	out.set(data.subarray(0, size * repeat), 8);
	return out;
}

function u32be(...vals: number[]): Uint8Array {
	const out = new Uint8Array(vals.length * 4);
	const v = new DataView(out.buffer);
	vals.forEach((n, i) => {
		v.setUint32(i * 4, n, false);
	});
	return out;
}

function i32be(...vals: number[]): Uint8Array {
	const out = new Uint8Array(vals.length * 4);
	const v = new DataView(out.buffer);
	vals.forEach((n, i) => {
		v.setInt32(i * 4, n, false);
	});
	return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

function makeGpmf(): Uint8Array {
	const scal = box("SCAL", 76, 5, u32be(10000000, 10000000, 1000, 1000, 1000));
	const gps = box(
		"GPS5",
		108,
		10,
		i32be(
			488520000,
			23500000,
			35000,
			5500,
			5600,
			488530000,
			23510000,
			36000,
			5700,
			5800,
		),
	);
	const utc = box(
		"GPSU",
		85,
		1,
		new TextEncoder().encode("2024-03-20T12:59:17.852Z"),
	);
	const strm = box("STRM", 0, 1, concat(scal, gps, utc));
	return box("DEVC", 0, 1, strm);
}

describe("GPMF telemetry Parser & Engine", () => {
	it("scales GPS5 fixes by SCAL with UTC anchor", () => {
		const samples = parseGpmf(makeGpmf());
		expect(samples).toHaveLength(2);
		expect(samples[0]).toMatchObject({
			latitude: "48.852",
			longitude: "2.35",
			altitude: "35",
			speed2d: "5.5",
			speed3d: "5.6",
			stream: 1,
		});
		expect(samples[0]?.time).toBe("2024-03-20T12:59:17.852Z");
		expect(samples[1]?.latitude).toBe("48.853");
	});

	it("emits a headed CSV through the engine", async () => {
		expect(await gpmfToCsvEngine.probe()).toBe(true);
		const file = makeGpmf();
		const out = await convertGpmfToCsv(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const csv = new TextDecoder().decode(out);
		expect(csv).toContain(
			"time,latitude,longitude,altitude,speed2d,speed3d,stream",
		);
		expect(csv).toContain("48.852,2.35,35");
	});

	it("rejects GPS-less payloads", () => {
		const accOnly = box(
			"DEVC",
			0,
			1,
			box("STRM", 0, 1, box("ACCL", 115, 3, new Uint8Array(12))),
		);
		expect(() => parseGpmf(accOnly)).toThrow("No GPS track");
	});
});
