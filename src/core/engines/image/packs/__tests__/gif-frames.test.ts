import { describe, expect, it } from "vitest";
import { gifFramesEngine } from "../gif-frames";

/**
 * happy-dom has no WebCodecs `ImageDecoder` and no `OffscreenCanvas`, so the
 * decode path itself cannot run here — the browser's own GIF decoder is doing
 * the work and is not ours to verify. What these cover is the part that is
 * ours: refusing cleanly where the API is absent rather than failing mid-run,
 * and being selectable only where it can actually succeed.
 */
describe("gifFramesEngine", () => {
	it("probes false where the platform decoder is absent", async () => {
		// Firefox has no ImageDecoder at time of writing. The engine must not be
		// selected there, so a user gets an honest "unsupported" rather than a
		// crash partway through a conversion.
		expect(await gifFramesEngine.probe()).toBe(false);
	});

	it("names the browsers that do support it when it cannot run", async () => {
		// A bare "not supported" leaves someone stuck. Naming the browsers that
		// work turns a dead end into an action.
		await expect(
			gifFramesEngine.run(new ArrayBuffer(8), {}, () => {}),
		).rejects.toThrow(/Chrome|Edge|Safari/);
	});

	it("keeps its own id distinct from the conversion engines", () => {
		// Registered as a pack: one-to-many, ZIP output, no decoder/encoder
		// pair — the registry's id-shape guard depends on this suffix.
		expect(gifFramesEngine.id).toMatch(/-pack$/);
	});
});
