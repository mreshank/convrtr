import { describe, expect, it, vi } from "vitest";
import { selectEngine } from "../index";
import type { Engine } from "../types";

function stub(id: string, supported: boolean): Engine {
	return {
		id,
		probe: vi.fn(async () => supported),
		run: vi.fn(async () => new ArrayBuffer(0)),
	};
}

describe("selectEngine", () => {
	it("returns the first engine whose probe succeeds", async () => {
		const registry = new Map([
			["a", stub("a", false)],
			["b", stub("b", true)],
		]);
		const chosen = await selectEngine(["a", "b"], registry);
		expect(chosen?.id).toBe("b");
	});

	it("returns undefined when no engine is supported", async () => {
		const registry = new Map([["a", stub("a", false)]]);
		expect(await selectEngine(["a"], registry)).toBeUndefined();
	});

	it("ignores ids that are not registered", async () => {
		const registry = new Map([["b", stub("b", true)]]);
		const chosen = await selectEngine(["missing", "b"], registry);
		expect(chosen?.id).toBe("b");
	});
});
