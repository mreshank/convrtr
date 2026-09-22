import { describe, expect, it } from "vitest";
import { convertStyToMid, extractMidiFromSty, inspectStyMidi } from "../parser";

describe("sty parser", () => {
	function createMockMidiTrack(events: number[]): Uint8Array {
		const track = new Uint8Array(8 + events.length);
		// 'MTrk'
		track[0] = 0x4d;
		track[1] = 0x54;
		track[2] = 0x72;
		track[3] = 0x6b;
		// Length
		track[4] = (events.length >> 24) & 0xff;
		track[5] = (events.length >> 16) & 0xff;
		track[6] = (events.length >> 8) & 0xff;
		track[7] = events.length & 0xff;
		track.set(events, 8);
		return track;
	}

	function createMockYamahaSty(): Uint8Array {
		// Proprietary preamble: 'CASM' chunk before MThd
		const casmChunk = new TextEncoder().encode(
			"CASM\x00\x00\x00\x10ProprietaryDataYamaha",
		);

		// MThd header: 14 bytes (Type 0, 1 track, 480 division)
		const mthd = new Uint8Array([
			0x4d,
			0x54,
			0x68,
			0x64, // MThd
			0x00,
			0x00,
			0x00,
			0x06, // len = 6
			0x00,
			0x00, // format = 0
			0x00,
			0x01, // tracks = 1
			0x01,
			0xe0, // division = 480
		]);

		// MTrk events: delta-time 0, marker event 'Main A', end of track
		const markerText = new TextEncoder().encode("Main A");
		const events = [
			0x00,
			0xff,
			0x06,
			markerText.length,
			...markerText,
			0x00,
			0xff,
			0x2f,
			0x00, // end of track
		];
		const track = createMockMidiTrack(events);

		// Proprietary trailing chunk: 'OTS '
		const otsChunk = new TextEncoder().encode("OTS \x00\x00\x00\x08OneTouch");

		const totalLen =
			casmChunk.length + mthd.length + track.length + otsChunk.length;
		const sty = new Uint8Array(totalLen);
		let pos = 0;
		sty.set(casmChunk, pos);
		pos += casmChunk.length;
		sty.set(mthd, pos);
		pos += mthd.length;
		sty.set(track, pos);
		pos += track.length;
		sty.set(otsChunk, pos);

		return sty;
	}

	it("locates embedded MThd chunk and extracts pure SMF MIDI file", () => {
		const sty = createMockYamahaSty();
		const midi = extractMidiFromSty(sty);

		// Must start with 'MThd' at byte 0
		expect(midi[0]).toBe(0x4d);
		expect(midi[1]).toBe(0x54);
		expect(midi[2]).toBe(0x68);
		expect(midi[3]).toBe(0x64);

		// Contains 'MTrk'
		const trackPos = 14;
		expect(midi[trackPos]).toBe(0x4d);
		expect(midi[trackPos + 1]).toBe(0x54);
		expect(midi[trackPos + 2]).toBe(0x72);
		expect(midi[trackPos + 3]).toBe(0x6b);

		// Trailing OTS and prepended CASM chunks must be stripped
		const text = new TextDecoder("latin1").decode(midi);
		expect(text).not.toContain("CASM\x00");
		expect(text).not.toContain("OTS \x00");
	});

	it("inspects style metadata and extracts markers", () => {
		const sty = createMockYamahaSty();
		const info = inspectStyMidi(sty);
		expect(info.format).toBe(0);
		expect(info.tracksCount).toBe(1);
		expect(info.division).toBe(480);
		expect(info.markerSections).toContain("Main A");
	});

	it("converts through convertStyToMid engine helper", () => {
		const sty = createMockYamahaSty();
		const out = convertStyToMid(sty.buffer as ArrayBuffer);
		expect(out.byteLength).toBeGreaterThan(14);
		const view = new Uint8Array(out);
		expect(view[0]).toBe(0x4d);
		expect(view[1]).toBe(0x54);
		expect(view[2]).toBe(0x68);
		expect(view[3]).toBe(0x64);
	});

	it("throws error when no MThd chunk is present", () => {
		const bad = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
		expect(() => extractMidiFromSty(bad)).toThrow(
			"no 'MThd' Standard MIDI header found",
		);
	});
});
