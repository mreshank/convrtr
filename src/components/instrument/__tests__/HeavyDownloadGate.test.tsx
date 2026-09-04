import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeavyDownloadGate } from "../HeavyDownloadGate";

describe("HeavyDownloadGate", () => {
	it("states the size and the format before anything is fetched", () => {
		render(
			<HeavyDownloadGate megabytes={31} formatLabel="AVI" onAccept={vi.fn()} />,
		);
		const text = screen.getByTestId("download-gate").textContent ?? "";
		expect(text).toContain("31MB");
		expect(text).toContain("AVI");
	});
});

/**
 * A gate is an incomplete step — nothing has been downloaded and nothing has
 * been converted — and in a system with no colour that is what the broken
 * stroke says. Without this assertion the vocabulary rested on human
 * inspection alone.
 */
describe("monochrome state encoding", () => {
	it("draws the gate with a dashed stroke, because the step is unfinished", () => {
		render(
			<HeavyDownloadGate megabytes={31} formatLabel="AVI" onAccept={vi.fn()} />,
		);
		expect(screen.getByTestId("download-gate").style.borderStyle).toBe(
			"dashed",
		);
	});
});
