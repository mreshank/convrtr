import { describe, expect, it } from "vitest";
import { sbvToSrtEngine } from "../index";
import { convertSbvToSrt, parseSbv } from "../parser";

const SBV = `0:00:01.000,0:00:04.000
Hello <b>world</b>

0:01:02.500,0:01:05.000
Second line
wrapped
`;

function bytes(s: string = SBV): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("YouTube SBV Parser & Engine", () => {
	it("converts dotted timestamps and numbers cues", () => {
		const cues = parseSbv(bytes());
		expect(cues).toHaveLength(2);
		expect(cues[0]?.startMs).toBe(1000);
		expect(cues[0]?.endMs).toBe(4000);
		expect(cues[0]?.text).toBe("Hello <b>world</b>");
		expect(cues[1]?.startMs).toBe(62500);
		expect(cues[1]?.text).toBe("Second line\nwrapped");
	});

	it("emits numbered SRT through the engine", async () => {
		expect(await sbvToSrtEngine.probe()).toBe(true);
		const out = await convertSbvToSrt(
			bytes().buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const srt = new TextDecoder().decode(out);
		expect(srt).toBe(
			"1\n00:00:01,000 --> 00:00:04,000\nHello <b>world</b>\n\n2\n00:01:02,500 --> 00:01:05,000\nSecond line\nwrapped\n\n",
		);
	});

	it("rejects captionless input", () => {
		expect(() => parseSbv(bytes("no timestamps here\nat all\n"))).toThrow(
			"No SBV cues",
		);
	});
});
