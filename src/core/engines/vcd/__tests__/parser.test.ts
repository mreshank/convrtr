import { describe, expect, it } from "vitest";
import { convertVcd, parseVcd } from "../parser";

const SAMPLE_VCD = `$date
   Tue Sep 22 20:00:00 2026
$end
$version
   Icarus Verilog
$end
$timescale
   1ns
$end
$scope module top $end
$var wire 1 ! clk $end
$var wire 1 " rst $end
$scope module alu $end
$var wire 8 # result [7:0] $end
$upscope $end
$upscope $end
$enddefinitions $end
#0
$dumpvars
0!
1"
b00000000 #
$end
#10
1!
#20
0!
0"
b00001010 #
#30
1!
`;

describe("IEEE 1364 Value Change Dump (VCD) Parser", () => {
	it("parses header declarations and module scopes", () => {
		const parsed = parseVcd(SAMPLE_VCD);
		expect(parsed.version).toContain("Icarus Verilog");
		expect(parsed.timescale).toBe("1ns");
		expect(parsed.signals).toHaveLength(3);

		expect(parsed.signals[0]).toEqual({
			id: "!",
			name: "top.clk",
			type: "wire",
			size: 1,
			scope: "top",
		});

		expect(parsed.signals[1]).toEqual({
			id: '"',
			name: "top.rst",
			type: "wire",
			size: 1,
			scope: "top",
		});

		expect(parsed.signals[2]).toEqual({
			id: "#",
			name: "top.alu.result [7:0]",
			type: "wire",
			size: 8,
			scope: "top.alu",
		});
	});

	it("tracks time snapshots and scalar/vector value updates", () => {
		const parsed = parseVcd(SAMPLE_VCD);
		expect(parsed.snapshots.length).toBeGreaterThanOrEqual(4);

		const snap0 = parsed.snapshots.find((s) => s.time === 0);
		expect(snap0).toBeDefined();
		expect(snap0?.values["top.clk"]).toBe("0");
		expect(snap0?.values["top.rst"]).toBe("1");
		expect(snap0?.values["top.alu.result [7:0]"]).toBe("00000000");

		const snap20 = parsed.snapshots.find((s) => s.time === 20);
		expect(snap20).toBeDefined();
		expect(snap20?.values["top.clk"]).toBe("0");
		expect(snap20?.values["top.rst"]).toBe("0");
		expect(snap20?.values["top.alu.result [7:0]"]).toBe("00001010");
	});

	it("formats CSV spreadsheet correctly", () => {
		const csv = convertVcd(SAMPLE_VCD, { json: false });
		const lines = csv.split("\r\n");
		expect(lines[0]).toBe("time,top.clk,top.rst,top.alu.result [7:0]");
		expect(lines[1]).toBe("0,0,1,00000000");
	});

	it("formats JSON output with structured metadata", () => {
		const jsonStr = convertVcd(SAMPLE_VCD, { json: true });
		const parsedJson = JSON.parse(jsonStr);
		expect(parsedJson.timescale).toBe("1ns");
		expect(parsedJson.signals).toHaveLength(3);
		expect(parsedJson.snapshotsCount).toBeGreaterThanOrEqual(4);
	});
});
