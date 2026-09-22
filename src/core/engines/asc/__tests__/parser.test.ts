import { describe, expect, it } from "vitest";
import { convertAscToCsv, formatAscCsv, parseAsc } from "../parser";

describe("Vector ASC CAN Bus Trace Parser", () => {
	const sampleAsc = `date Mon Sep 22 10:15:30 2026
base hex  timestamps absolute
internal events logged
// version 11.0.0
   0.001250 1  1A0             Rx   d 8 00 12 34 56 78 9A BC DE
   0.005100 1  18DAF110x       Tx   d 8 02 01 0D 00 00 00 00 00
   0.010200 2  2B4             Rx   d 4 AA BB CC DD
   0.015000 CANFD 1 Rx 7DF 0 0 8 8 02 01 05 00 00 00 00 00
`;

	it("parses standard, extended, and CAN-FD bus frames accurately", () => {
		const trace = parseAsc(sampleAsc);
		expect(trace.date).toBe("Mon Sep 22 10:15:30 2026");
		expect(trace.base).toBe("hex");
		expect(trace.frames).toHaveLength(4);

		// Frame 1: Standard 11-bit CAN
		const f1 = trace.frames[0];
		expect(f1?.timestampSec).toBeCloseTo(0.00125, 5);
		expect(f1?.channel).toBe(1);
		expect(f1?.idHex).toBe("1A0");
		expect(f1?.idDec).toBe(416);
		expect(f1?.isExtended).toBe(false);
		expect(f1?.direction).toBe("Rx");
		expect(f1?.dlc).toBe(8);
		expect(f1?.payloadHex).toBe("00123456789ABCDE");

		// Frame 2: 29-bit Extended CAN
		const f2 = trace.frames[1];
		expect(f2?.idHex).toBe("18DAF110");
		expect(f2?.isExtended).toBe(true);
		expect(f2?.direction).toBe("Tx");

		// Frame 3: 4-byte short payload
		const f3 = trace.frames[2];
		expect(f3?.dlc).toBe(4);
		expect(f3?.payloadHex).toBe("AABBCCDD");

		// Frame 4: CAN-FD
		const f4 = trace.frames[3];
		expect(f4?.idHex).toBe("7DF");
		expect(f4?.direction).toBe("Rx");
	});

	it("formats RFC 4180 CSV spreadsheet", () => {
		const trace = parseAsc(sampleAsc);
		const csv = formatAscCsv(trace);

		expect(csv).toContain(
			"timestamp_sec,channel,can_id_hex,can_id_dec,is_extended,direction,dlc,payload_hex",
		);
		expect(csv).toContain(
			"0.001250,1,0x1A0,416,false,Rx,8,00123456789ABCDE,00,12,34,56,78,9A,BC,DE",
		);
		expect(csv).toContain(
			"0.005100,1,0x18DAF110,417001744,true,Tx,8,02010D0000000000,02,01,0D,00,00,00,00,00",
		);
	});

	it("converts through convertAscToCsv ArrayBuffer helper and exports JSON", () => {
		const buf = new TextEncoder().encode(sampleAsc).buffer as ArrayBuffer;

		// CSV output
		const csvOut = convertAscToCsv(buf, false);
		const csvStr = new TextDecoder().decode(csvOut);
		expect(csvStr).toContain("0x1A0");

		// JSON output
		const jsonOut = convertAscToCsv(buf, true);
		const jsonStr = new TextDecoder().decode(jsonOut);
		const parsed = JSON.parse(jsonStr);
		expect(parsed.frameCount).toBe(4);
		expect(parsed.frames[0].idHex).toBe("0x1A0");
	});

	it("throws on empty or invalid trace without CAN frames", () => {
		const empty = new TextEncoder().encode("// empty file\n")
			.buffer as ArrayBuffer;
		expect(() => convertAscToCsv(empty, false)).toThrow(
			"No valid CAN bus frames found",
		);
	});
});
