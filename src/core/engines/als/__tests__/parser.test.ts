import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { alsToJsonEngine } from "../index";
import { convertAlsToJson, parseAls } from "../parser";

const LIVE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="11.0_344" SchemaChangeCount="4" Creator="Ableton Live 11.3.13" Revision="abc">
<LiveSet>
<MasterTrack Id="0">
<Name><EffectiveName Value="Master" /><UserName Value="" /></Name>
<LomId Value="0" />
<Tempo><LomId Value="0" /><Manual Value="124" /><MidiControllerRange><Min Value="60" /><Max Value="200" /></MidiControllerRange></Tempo>
<TimeSignature><LomId Value="0" /><Numerator Value="4" /><Denominator Value="4" /></TimeSignature>
</MasterTrack>
<Tracks>
<AudioTrack Id="1">
<Name><EffectiveName Value="Drums" /><UserName Value="Drums" /></Name>
<DeviceChain><Devices>
<AudioEffectGroupDevice><UserName Value="Drum Buss" /></AudioEffectGroupDevice>
</Devices></DeviceChain>
<Sample><FileRef><Path Value="/Users/artist/Samples/kick-909.wav" /><Name Value="kick-909.wav" /></FileRef></Sample>
</AudioTrack>
<MidiTrack Id="2">
<Name><EffectiveName Value="Bass" /><UserName Value="" /></Name>
<DeviceChain><Devices>
<VstPluginInfo><PlugName Value="Serum_x64" /><Name Value="Serum" /><PluginName Value="Serum" /></VstPluginInfo>
</Devices></DeviceChain>
<Sample><FileRef><Path Value="C:\\Samples\\bass-C1.wav" /><Name Value="bass-C1.wav" /></FileRef></Sample>
<Sample><FileRef><Path Value="/Users/artist/Samples/kick-909.wav" /><Name Value="kick-909.wav" /></FileRef></Sample>
</MidiTrack>
</Tracks>
</LiveSet>
</Ableton>`;

function makeAls(xml: string = LIVE_XML): ArrayBuffer {
	const gz = fflate.gzipSync(new TextEncoder().encode(xml));
	return gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength);
}

describe("Ableton Live Set (.als) Parser & Engine", () => {
	it("reads version, tempo, time signature and tracks", () => {
		const summary = parseAls(new Uint8Array(makeAls()));

		expect(summary.format).toBe("ableton-live-set");
		expect(summary.abletonVersion).toBe("11.3.13");
		expect(summary.tempo).toBe(124);
		expect(summary.timeSignature).toBe("4/4");
		expect(summary.trackCount).toBe(3);

		const master = summary.tracks[0];
		expect(master?.name).toBe("Master");
		expect(master?.type).toBe("master");

		const drums = summary.tracks[1];
		expect(drums?.name).toBe("Drums");
		expect(drums?.type).toBe("audio");
		expect(drums?.devices).toContain("Drum Buss");
		expect(drums?.sampleRefs).toContain("kick-909.wav");

		const bass = summary.tracks[2];
		expect(bass?.name).toBe("Bass");
		expect(bass?.type).toBe("midi");
		expect(bass?.devices).toContain("Serum");
	});

	it("deduplicates device and sample lists across tracks", () => {
		const summary = parseAls(new Uint8Array(makeAls()));
		expect(summary.sampleRefs).toEqual(["kick-909.wav", "bass-C1.wav"]);
		expect(summary.sampleRefs.length, "duplicate kick must appear once").toBe(
			2,
		);
	});

	it("emits valid JSON end-to-end through the engine", async () => {
		expect(await alsToJsonEngine.probe()).toBe(true);
		const out = await convertAlsToJson(makeAls(), () => {});
		const parsed = JSON.parse(new TextDecoder().decode(out)) as {
			tempo: number;
			trackCount: number;
		};
		expect(parsed.tempo).toBe(124);
		expect(parsed.trackCount).toBe(3);
	});

	it("throws on garbage input", () => {
		expect(() => parseAls(new Uint8Array([1, 2, 3, 4, 5]))).toThrow(
			"expected gzip magic",
		);
	});

	it("throws when the gzip payload is not a Live Set", () => {
		const gz = fflate.gzipSync(new TextEncoder().encode("<html></html>"));
		expect(() => parseAls(gz)).toThrow("Not an Ableton Live Set");
	});
});
