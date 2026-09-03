import { describe, expect, it } from "vitest";
import { ENGINES } from "@/core/engines";
import { supportsStreaming } from "@/core/engines/types";
import { TOOLS } from "..";

/**
 * `Tool.streamable` is a copy of a fact that really lives on the engine, kept
 * in the registry because the main thread has to consult it before opening the
 * save dialog and the registry may not import engines.
 *
 * Copied facts drift. This is the test that stops the drift being discovered
 * by a user instead: a tool claiming to stream whose engine cannot would open
 * a save dialog and then fail, and — worse — a tool that *can* stream but
 * forgot to say so quietly buffers a file chosen precisely because it does not
 * fit in memory.
 */
describe("streamable parity between registry and engines", () => {
	for (const tool of TOOLS) {
		it(`${tool.id} declares streamable to match its engines`, () => {
			const engines = tool.engines
				.map((id) => ENGINES.get(id))
				.filter((engine) => engine !== undefined);

			// Engine presence is asserted by `mime-parity`; here an unregistered
			// engine would silently make the check vacuous.
			expect(engines).toHaveLength(tool.engines.length);

			// Streaming is only claimable if *every* engine the tool might select
			// can do it — selection depends on runtime probing, so a partial
			// claim would be true only on some browsers.
			const allStream = engines.every((engine) => supportsStreaming(engine));

			expect(tool.streamable === true).toBe(allStream);
		});
	}

	it("covers at least one streaming and one buffered tool", () => {
		// Guards against the suite passing because nothing streams at all, which
		// would make every assertion above trivially true.
		const streaming = TOOLS.filter((tool) => tool.streamable === true);
		const buffered = TOOLS.filter((tool) => tool.streamable !== true);

		expect(streaming.length).toBeGreaterThan(0);
		expect(buffered.length).toBeGreaterThan(0);
	});
});
