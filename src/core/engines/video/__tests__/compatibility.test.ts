import { describe, expect, it } from "vitest";
import { isPureRemux, planRemux } from "../compatibility";

/**
 * These encode the table from docs/roadmap/PHASE-2-VIDEO-PLAN.md. Each case is
 * a claim about a real file people actually convert, so getting one wrong
 * means either a needless re-encode (slow, lossy) or a copy that produces a
 * file nobody can play.
 */
describe("planRemux — the cases that matter", () => {
	it("copies H.264 + AAC from MKV into MP4", () => {
		// The headline case: both streams are native to MP4, so this is a
		// container rewrite in seconds rather than minutes of re-encoding.
		const plan = planRemux(
			{ container: "mkv", video: "h264", audio: "aac" },
			"mp4",
		);
		expect(plan.video?.action).toBe("copy");
		expect(plan.audio?.action).toBe("copy");
		expect(isPureRemux(plan)).toBe(true);
	});

	it("copies H.264 + AAC from MOV into MP4", () => {
		// MOV and MP4 are both ISOBMFF, which is why this is so often free.
		const plan = planRemux(
			{ container: "mov", video: "h264", audio: "aac" },
			"mp4",
		);
		expect(isPureRemux(plan)).toBe(true);
	});

	it("copies H.264 + AAC out of a transport stream into MP4", () => {
		const plan = planRemux(
			{ container: "ts", video: "h264", audio: "aac" },
			"mp4",
		);
		expect(isPureRemux(plan)).toBe(true);
	});

	it("copies AV1 + Opus from WebM into MP4 — both are legal there", () => {
		// Easy to get wrong by assuming WebM codecs never belong in MP4.
		const plan = planRemux(
			{ container: "webm", video: "av1", audio: "opus" },
			"mp4",
		);
		expect(plan.video?.action).toBe("copy");
		expect(plan.audio?.action).toBe("copy");
		expect(isPureRemux(plan)).toBe(true);
	});

	it("copies VP9 into MP4 by default, and warns that it may not play", () => {
		// Spec-legal but widely unplayable. The earlier policy re-encoded here,
		// on the reasoning that an unopenable file is worse than a re-encode.
		// That trade is the wrong way round: a copy that some player rejects is
		// discovered immediately and fixed by re-running, while a re-encode
		// destroys quality permanently to solve a problem this user may not
		// have. So it copies, and the caveat is stated rather than buried.
		const plan = planRemux(
			{ container: "webm", video: "vp9", audio: "opus" },
			"mp4",
		);
		expect(plan.video?.action).toBe("copy");
		expect(plan.caveat).toMatch(/many players/i);
		expect(plan.caveat).toMatch(/nothing was lost/i);
		expect(isPureRemux(plan)).toBe(true);
	});

	it("re-encodes VP9 into MP4 when the caller needs it to play everywhere", () => {
		// The opt-out, for someone who needs the output to open anywhere and
		// accepts the loss to get it.
		const plan = planRemux(
			{ container: "webm", video: "vp9", audio: "opus" },
			"mp4",
			true,
		);
		expect(plan.video?.action).toBe("transcode");
		expect(plan.caveat).toMatch(/for compatibility/i);
		expect(isPureRemux(plan)).toBe(false);
	});

	it("re-encodes H.264 into WebM, which cannot carry it", () => {
		const plan = planRemux(
			{ container: "mp4", video: "h264", audio: "aac" },
			"webm",
		);
		expect(plan.video?.action).toBe("transcode");
		expect(plan.video).toMatchObject({ to: "vp9" });
		expect(plan.audio).toMatchObject({ to: "opus" });
		expect(isPureRemux(plan)).toBe(false);
	});

	it("copies VP8 + Vorbis from MKV into WebM", () => {
		const plan = planRemux(
			{ container: "mkv", video: "vp8", audio: "vorbis" },
			"webm",
		);
		expect(isPureRemux(plan)).toBe(true);
	});
});

describe("planRemux — per-stream independence", () => {
	it("copies video while re-encoding audio when only one is legal", () => {
		// AV1 is legal in MP4; Vorbis is not. Treating the file as a unit would
		// needlessly re-encode the video too.
		const plan = planRemux(
			{ container: "webm", video: "av1", audio: "vorbis" },
			"mp4",
		);
		expect(plan.video?.action).toBe("copy");
		expect(plan.audio?.action).toBe("transcode");
		expect(isPureRemux(plan)).toBe(false);
	});

	it("is lossless for a video-only file whose stream copies", () => {
		const plan = planRemux({ container: "mkv", video: "h264" }, "mp4");
		expect(plan.audio).toBeUndefined();
		expect(isPureRemux(plan)).toBe(true);
	});

	it("is not lossless if any single stream must be re-encoded", () => {
		const plan = planRemux(
			{ container: "mkv", video: "h264", audio: "vorbis" },
			"mp4",
		);
		expect(isPureRemux(plan)).toBe(false);
	});
});

describe("planRemux — explanations", () => {
	it("gives a reason for every decision", () => {
		// The UI must be able to tell the user which path ran. A silent
		// transcode is the dishonesty this whole layer exists to avoid.
		const plan = planRemux(
			{ container: "mkv", video: "h264", audio: "vorbis" },
			"mp4",
		);
		expect(plan.video?.reason.length).toBeGreaterThan(5);
		expect(plan.audio?.reason.length).toBeGreaterThan(5);
	});

	it("names the target codec when re-encoding", () => {
		const plan = planRemux({ container: "mp4", video: "h264" }, "webm");
		expect(plan.video).toMatchObject({ action: "transcode", to: "vp9" });
	});
});
