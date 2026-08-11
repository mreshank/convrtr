import { describe, expect, it } from "vitest";
import { pngToWebp } from "@/core/registry/tools/png-to-webp";
import {
	applyPreset,
	describeFidelity,
	initialQuality,
	setParam,
} from "../index";

describe("initialQuality", () => {
	it("starts at the tool default preset with that preset params", () => {
		const state = initialQuality(pngToWebp);
		expect(state.preset).toBe("lossless");
		expect(state.params.lossless).toBe(1);
	});

	it("merges advanced defaults underneath the preset params", () => {
		const state = initialQuality(pngToWebp);
		expect(state.params.sns_strength).toBe(50);
	});
});

describe("applyPreset", () => {
	it("replaces preset params but keeps advanced defaults", () => {
		const state = applyPreset(pngToWebp, "balanced");
		expect(state.preset).toBe("balanced");
		expect(state.params.quality).toBe(78);
		expect(state.params.sns_strength).toBe(50);
	});
});

describe("setParam", () => {
	it("flips the preset to custom when a parameter deviates", () => {
		const state = setParam(pngToWebp, initialQuality(pngToWebp), "method", 6);
		expect(state.preset).toBe("custom");
		expect(state.params.method).toBe(6);
	});

	it("does not flip to custom when the value equals the current preset value", () => {
		const state = setParam(pngToWebp, initialQuality(pngToWebp), "method", 4);
		expect(state.preset).toBe("lossless");
	});

	it("flips back to the preset when a parameter returns to its preset value", () => {
		let state = setParam(pngToWebp, initialQuality(pngToWebp), "method", 6);
		expect(state.preset).toBe("custom");
		state = setParam(pngToWebp, state, "method", 4);
		expect(state.preset).toBe("lossless");
	});

	it("recognises a configuration that matches a different preset", () => {
		const balanced = applyPreset(pngToWebp, "balanced");
		const state = setParam(pngToWebp, initialQuality(pngToWebp), "quality", 78);
		// initialQuality is lossless (lossless:1); changing only quality must NOT
		// claim to be balanced, because balanced also sets lossless:0.
		expect(state.preset).toBe("custom");
		expect(balanced.preset).toBe("balanced");
	});
});

describe("describeFidelity", () => {
	it("reports LOSSLESS on the lossless preset", () => {
		expect(describeFidelity(pngToWebp, initialQuality(pngToWebp))).toBe(
			"LOSSLESS",
		);
	});

	it("reports VISUALLY LOSSLESS on that preset", () => {
		expect(
			describeFidelity(pngToWebp, applyPreset(pngToWebp, "visually-lossless")),
		).toBe("VISUALLY LOSSLESS");
	});

	it("reports the quality number when custom and lossy", () => {
		const custom = setParam(
			pngToWebp,
			applyPreset(pngToWebp, "balanced"),
			"quality",
			61,
		);
		expect(describeFidelity(pngToWebp, custom)).toBe("LOSSY · Q61");
	});

	it("still reports LOSSLESS when a custom edit keeps lossless on", () => {
		const custom = setParam(
			pngToWebp,
			initialQuality(pngToWebp),
			"sns_strength",
			20,
		);
		expect(describeFidelity(pngToWebp, custom)).toBe("LOSSLESS");
	});
});
