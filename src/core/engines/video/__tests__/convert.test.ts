import { describe, expect, it } from "vitest";
import { createVideoConversionEngine } from "../convert";

/**
 * happy-dom has no WebCodecs, so the conversion itself cannot execute here —
 * mediabunny does the demuxing and muxing and is not ours to verify. What
 * these cover is the part that is ours: the engine identity the registry
 * depends on, and refusing to be selected on a browser that would fail the
 * moment a file needed re-encoding.
 */
describe("createVideoConversionEngine", () => {
	it("names the source and target containers in its id", () => {
		// The registry's id-shape guard and every tool's `engines` array depend
		// on this exact form.
		expect(createVideoConversionEngine("mp4", "mkv").id).toBe("video:mkv->mp4");
		expect(createVideoConversionEngine("webm", "mp4").id).toBe(
			"video:mp4->webm",
		);
	});

	it("probes false where WebCodecs is unavailable", async () => {
		// Demux and mux alone do not need WebCodecs, but anything requiring a
		// re-encode does. Probing for it here means the engine is not selected
		// on a browser that would fail partway through a conversion.
		const engine = createVideoConversionEngine("mp4", "mkv");
		expect(await engine.probe()).toBe(false);
	});

	it("builds a distinct engine per container pair", () => {
		const ids = new Set([
			createVideoConversionEngine("mp4", "mkv").id,
			createVideoConversionEngine("mp4", "mov").id,
			createVideoConversionEngine("webm", "mp4").id,
		]);
		expect(ids.size).toBe(3);
	});
});
