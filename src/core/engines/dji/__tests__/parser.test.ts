import { describe, expect, it } from "vitest";
import { djiToCsvEngine } from "../index";
import { convertDjiToCsv, parseDjiSrt } from "../parser";

const BRACKET_SRT = `1
00:00:00,000 --> 00:00:00,033
<font size="28">FrameCnt: 1, DiffTime: 33ms
2024-03-20 12:59:17.852
[iso: 400] [shutter: 1/320] [fnum: 1.7] [ev: 2.0]
[latitude: 30.123] [longitude: -81.456]
[rel_alt: 6.500 abs_alt: -32.309] </font>

2
00:00:00,033 --> 00:00:00,066
<font size="28">FrameCnt: 2, DiffTime: 33ms
2024-03-20 12:59:17.885
[iso: 400] [latitude: 30.124] [longitude: -81.457] [rel_alt: 6.600] </font>
`;

const LEGACY_SRT = `1
00:00:01,000 --> 00:00:02,000
HOME(149.0251,-20.2532) 2017.08.05 14:11:51
GPS(149.0251,-20.2533,16) BAROMETER:1.9
ISO:100 Shutter:60 EV: 0 Fnum:2.2
`;

function bytes(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("DJI SRT telemetry Parser & Engine", () => {
	it("parses the bracket family with split pairs", () => {
		const rows = parseDjiSrt(bytes(BRACKET_SRT));
		expect(rows).toHaveLength(2);
		expect(rows[0]?.fields.latitude).toBe("30.123");
		expect(rows[0]?.fields.rel_alt).toBe("6.500");
		expect(rows[0]?.fields.abs_alt).toBe("-32.309");
		expect(rows[0]?.fields.iso).toBe("400");
		expect(rows[0]?.fields.datetime).toBe("2024-03-20 12:59:17.852");
		expect(rows[0]?.srtStart).toBe("00:00:00,000");
		expect(rows[1]?.fields.rel_alt).toBe("6.600");
	});

	it("parses the legacy HOME/GPS family", () => {
		const rows = parseDjiSrt(bytes(LEGACY_SRT));
		expect(rows).toHaveLength(1);
		expect(rows[0]?.fields.home_lon).toBe("149.0251");
		expect(rows[0]?.fields.home_lat).toBe("-20.2532");
		expect(rows[0]?.fields.longitude).toBe("149.0251");
		expect(rows[0]?.fields.gps_alt).toBe("16");
		expect(rows[0]?.fields.barometer).toBe("1.9");
		expect(rows[0]?.fields.datetime).toBe("2017.08.05 14:11:51");
	});

	it("emits a union-column CSV through the engine", async () => {
		expect(await djiToCsvEngine.probe()).toBe(true);
		const out = await convertDjiToCsv(
			bytes(BRACKET_SRT).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const csv = new TextDecoder().decode(out);
		expect(csv).toContain("latitude,longitude");
		expect(csv).toContain("30.123");
	});

	it("rejects caption-only subtitles", () => {
		const caps = "1\n00:00:01,000 --> 00:00:02,000\nHello there\n";
		expect(() => parseDjiSrt(bytes(caps))).toThrow("No DJI telemetry cues");
	});
});
