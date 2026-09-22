import { describe, expect, it } from "vitest";
import { rppToJsonEngine } from "../index";
import { convertRppToJson, parseRpp } from "../parser";

const RPP = `<REAPER_PROJECT 0.1 "7.02/win64" 1700000000
  RIPPLE 0
  TEMPO 128 4 4
  <TRACK
    NAME "Drums"
    <ITEM
      POSITION 0.0
      LENGTH 4.0
      NAME "Break"
      <SOURCE WAVE
        FILE "break-128.wav"
      >
    >
    <FXCHAIN
      <VST "VST3i: DrumBus+ (Audio Assault)" DrumBus.vst3 0 "" 0
      >
    >
  >
  <TRACK
    NAME "Bass"
    <ITEM
      POSITION 4.0
      LENGTH 8.0
      <SOURCE MIDI
        FILE "bassline.mid"
      >
    >
  >
  MARKER 1 16.0 "Drop" 0
  REGION 2 32.0 64.0 "Chorus" 0
>
`;

function bytes(s: string = RPP): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("REAPER (.rpp) Parser & Engine", () => {
	it("reads version, tempo, tracks, items, markers and regions", () => {
		const s = parseRpp(bytes());

		expect(s.format).toBe("reaper-project");
		expect(s.appVersion).toBe("7.02/win64");
		expect(s.tempo).toBe(128);
		expect(s.timeSignature).toBe("4/4");
		expect(s.trackCount).toBe(2);
		expect(s.itemCount).toBe(2);

		const drums = s.tracks[0];
		expect(drums?.name).toBe("Drums");
		expect(drums?.items[0]?.position).toBe(0);
		expect(drums?.items[0]?.length).toBe(4);
		expect(drums?.items[0]?.name).toBe("Break");
		expect(drums?.items[0]?.sources).toContain("break-128.wav");
		expect(drums?.fx).toContain("DrumBus+");

		expect(s.tracks[1]?.items[0]?.sources).toContain("bassline.mid");
		expect(s.sourceFiles).toEqual(["break-128.wav", "bassline.mid"]);

		expect(s.markers).toHaveLength(2);
		expect(s.markers[0]).toMatchObject({
			position: 16,
			name: "Drop",
			isRegion: false,
		});
		expect(s.markers[1]).toMatchObject({
			position: 32,
			end: 64,
			name: "Chorus",
			isRegion: true,
		});
	});

	it("reads .rpp-bak content identically (same grammar)", () => {
		const s = parseRpp(bytes());
		expect(s.trackCount).toBe(2);
	});

	it("emits valid JSON end-to-end through the engine", async () => {
		expect(await rppToJsonEngine.probe()).toBe(true);
		const out = await convertRppToJson(
			bytes().buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const parsed = JSON.parse(new TextDecoder().decode(out)) as {
			tempo: number;
			trackCount: number;
		};
		expect(parsed.tempo).toBe(128);
		expect(parsed.trackCount).toBe(2);
	});

	it("throws on non-project input", () => {
		expect(() => parseRpp(bytes("hello world"))).toThrow(
			"Not a REAPER project",
		);
	});
});
