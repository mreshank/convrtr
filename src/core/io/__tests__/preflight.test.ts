import { describe, expect, it } from "vitest";
import { memoryBudgetBytes, preflight } from "../preflight";

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** A 4GB device: budget is a quarter of that, so 1GB. */
const BUDGET_4GB_DEVICE = 1 * GB;

describe("memoryBudgetBytes", () => {
	it("budgets a fraction of reported device memory, not all of it", () => {
		// A tab never gets the whole machine — the OS, the browser and other
		// tabs are all competing, and browsers cap a single tab's heap anyway.
		const nav = { deviceMemory: 8 } as Navigator;
		expect(memoryBudgetBytes(nav)).toBeLessThan(8 * GB);
		expect(memoryBudgetBytes(nav)).toBeGreaterThan(0);
	});

	it("assumes a reasonable default when the API is unavailable", () => {
		// deviceMemory is absent in Safari and Firefox. Refusing all large work
		// there would be worse than assuming a mid-range machine.
		const nav = {} as Navigator;
		expect(memoryBudgetBytes(nav)).toBe(4 * GB * 0.25);
	});
});

describe("preflight", () => {
	it("lets an ordinary photo through in memory", () => {
		const verdict = preflight(4 * MB, true, BUDGET_4GB_DEVICE);
		expect(verdict.ok).toBe(true);
		if (verdict.ok) expect(verdict.strategy).toBe("memory");
	});

	it("routes a large-but-workable file to the streaming path", () => {
		const verdict = preflight(200 * MB, true, BUDGET_4GB_DEVICE);
		expect(verdict.ok).toBe(true);
		if (verdict.ok) expect(verdict.strategy).toBe("stream");
	});

	it("refuses a file that cannot fit, before any work starts", () => {
		// The whole point: two minutes of decoding followed by a tab crash is
		// strictly worse than an immediate, explainable refusal.
		const verdict = preflight(3 * GB, true, BUDGET_4GB_DEVICE);
		expect(verdict.ok).toBe(false);
	});

	it("accounts for peak usage, not just the file size", () => {
		// A conversion holds the input, the decoded pixels and the output at
		// once, so a file well under the budget can still blow past it.
		const justUnderBudget = 900 * MB;
		const verdict = preflight(justUnderBudget, false, BUDGET_4GB_DEVICE);
		expect(verdict.ok).toBe(false);
	});

	it("explains what is wrong and what to do about it", () => {
		const verdict = preflight(3 * GB, true, BUDGET_4GB_DEVICE);
		expect(verdict.ok).toBe(false);
		if (!verdict.ok) {
			expect(verdict.reason).toMatch(/GB/);
			expect(verdict.suggestion.length).toBeGreaterThan(10);
			// Must locate the limit in the device, not blame the user's file.
			expect(verdict.reason).toMatch(/device|browser/i);
		}
	});

	it("names the browser as the constraint when it cannot stream to disk", () => {
		// This is a fixable situation and the message should say so, rather
		// than implying the file itself is the problem.
		const verdict = preflight(1.5 * GB, false, BUDGET_4GB_DEVICE);
		expect(verdict.ok).toBe(false);
		if (!verdict.ok) {
			expect(verdict.reason).toMatch(/browser/i);
			expect(verdict.suggestion).toMatch(/Chrome|Edge/);
		}
	});

	it("accepts a file that only fits because streaming removes the output copy", () => {
		const withStreaming = preflight(400 * MB, true, BUDGET_4GB_DEVICE);
		const withoutStreaming = preflight(400 * MB, false, BUDGET_4GB_DEVICE);
		expect(withStreaming.ok).toBe(true);
		expect(withoutStreaming.ok).toBe(false);
	});

	it("rejects an empty file with a distinct message", () => {
		const verdict = preflight(0, true, BUDGET_4GB_DEVICE);
		expect(verdict.ok).toBe(false);
		if (!verdict.ok) expect(verdict.reason).toMatch(/empty/i);
	});
});
