import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCTA } from "../ToolCTA";

describe("ToolCTA", () => {
	it("renders the real tool's title and links to its page", () => {
		render(<ToolCTA toolId="video/mlw-to-mp4" />);
		expect(
			screen.getByText("Extract MP4 video from an MLW file"),
		).toBeDefined();
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe("/video/mlw-to-mp4");
	});

	it("throws a clear error for an unregistered tool id", () => {
		expect(() => render(<ToolCTA toolId="not/a-real-tool" />)).toThrow(
			/not\/a-real-tool/,
		);
	});
});
