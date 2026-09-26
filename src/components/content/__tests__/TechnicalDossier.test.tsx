import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Tool } from "@/core/registry";
import { TechnicalDossier } from "../TechnicalDossier";

const sampleTool: Tool = {
	id: "image/png-to-webp",
	slug: "png-to-webp",
	category: "image",
	accept: { mime: ["image/png"], ext: ["png"] },
	output: { mime: "image/webp", ext: "webp" },
	kind: "convert",
	engines: ["libvips-wasm"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation: "Exact bit preservation",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "PNG to WebP Converter",
		h1: "Convert PNG to WebP",
		intent: "Convert PNG to WebP in browser",
		faq: [],
		related: [],
	},
};

describe("TechnicalDossier", () => {
	it("renders technical specifications matrix with input and output formats", () => {
		render(<TechnicalDossier tool={sampleTool} />);

		expect(screen.getByTestId("technical-dossier")).toBeDefined();
		expect(screen.getByTestId("technical-specs-table")).toBeDefined();
		expect(
			screen.getByText("Technical Specifications & Architecture Matrix"),
		).toBeDefined();
		expect(screen.getByText("Input: PNG")).toBeDefined();
		expect(screen.getByText("Output: WEBP")).toBeDefined();
		expect(screen.getByText("Portable Network Graphics")).toBeDefined();
		expect(screen.getByText("WebP Image Format")).toBeDefined();
	});

	it("renders runtime execution benchmarks and privacy guarantee", () => {
		render(<TechnicalDossier tool={sampleTool} />);

		expect(screen.getByTestId("execution-benchmark-panel")).toBeDefined();
		expect(screen.getByText("0 BYTES TRANSFERRED")).toBeDefined();
		expect(screen.getByText("PROCESSING ENGINE")).toBeDefined();
		expect(screen.getByText("ESTIMATED PAYLOAD DELTA")).toBeDefined();
	});

	it("renders step-by-step conversion protocol and CLI recipe", () => {
		render(<TechnicalDossier tool={sampleTool} />);

		expect(screen.getByTestId("conversion-protocol-steps")).toBeDefined();
		expect(
			screen.getByText("How to Convert PNG to WEBP Locally"),
		).toBeDefined();
		expect(screen.getByTestId("cli-recipe-panel")).toBeDefined();
		expect(screen.getByText(/cwebp/)).toBeDefined();
	});
});
