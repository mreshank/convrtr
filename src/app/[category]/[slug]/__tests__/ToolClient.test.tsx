import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolClient } from "../ToolClient";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	usePathname: () => "/",
}));

vi.mock("@/core/pipeline/client", () => ({
	runJob: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
	runManyJob: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
	JobError: class JobError extends Error {
		code = "ENGINE_FAILURE" as const;
	},
}));

describe("ToolClient Master Converter link", () => {
	it("renders Open in Master Converter button and links to configured converter route", () => {
		render(<ToolClient toolId="image/png-to-webp" />);

		const masterBtn = screen.getByTestId("open-master-converter-btn");
		expect(masterBtn).toBeDefined();
		expect(masterBtn.getAttribute("href")).toBe("/convert?from=png&to=webp");
		expect(masterBtn.textContent).toContain("OPEN IN MASTER CONVERTER");
		expect(masterBtn.textContent).toContain("PNG → WEBP");
	});

	it("renders batch studio callout banner when dropfield is empty", () => {
		render(<ToolClient toolId="image/png-to-webp" />);

		expect(
			screen.getByText("BATCH & MULTI-FILE STUDIO", { exact: false }),
		).toBeDefined();
		const link = screen.getByRole("link", {
			name: /Open this config in Master Studio/i,
		});
		expect(link.getAttribute("href")).toBe("/convert?from=png&to=webp");
	});

	it("stages the output file and enables continuing conversion when CONTINUE CONVERTING is clicked", async () => {
		const { fireEvent } = await import("@testing-library/react");
		const { consumeStagedFiles } = await import("@/core/io");

		render(<ToolClient toolId="video/mlw-to-mp4" />);

		const dropField = screen.getByTestId("drop-field");
		const file = new File(["mlw-content"], "lecture.mlw", {
			type: "application/octet-stream",
		});

		fireEvent.drop(dropField, {
			dataTransfer: { files: [file] },
		});

		// Trigger conversion
		const convertBtn = screen.getByRole("button", { name: "CONVERT" });
		fireEvent.click(convertBtn);

		// Wait for conversion completion
		const continueBtn = await screen.findByTestId("continue-conversion-btn");
		expect(continueBtn).toBeDefined();
		expect(continueBtn.textContent).toContain("CONTINUE CONVERTING →");

		// Click continue conversion
		fireEvent.click(continueBtn);

		// Verify that the output MP4 was staged for the next converter session!
		const staged = consumeStagedFiles();
		expect(staged).toHaveLength(1);
		expect(staged[0]?.file.name).toBe("lecture.mp4");
	});

	it("renders direct target continuation pills (CONTINUE AS: → ...) and stages with targetExt and lineage", async () => {
		const { fireEvent } = await import("@testing-library/react");
		const { consumeStagedFiles } = await import("@/core/io");

		render(<ToolClient toolId="video/mlw-to-mp4" />);

		const dropField = screen.getByTestId("drop-field");
		const file = new File(["mlw-content"], "lecture.mlw", {
			type: "application/octet-stream",
		});

		fireEvent.drop(dropField, {
			dataTransfer: { files: [file] },
		});

		// Trigger conversion
		const convertBtn = screen.getByRole("button", { name: "CONVERT" });
		fireEvent.click(convertBtn);

		// Wait for conversion completion
		await screen.findByTestId("continue-conversion-btn");

		// Target pills should be rendered (e.g., CONTINUE AS: → ...)
		const pills = screen.getByTestId("direct-target-pills");
		expect(pills).toBeDefined();
		expect(pills.textContent).toContain("CONTINUE AS:");

		// Check if a target like WEBM exists and can be clicked
		const webmPill = screen.queryByTestId("continue-as-webm");
		if (webmPill) {
			fireEvent.click(webmPill);
			const staged = consumeStagedFiles();
			expect(staged).toHaveLength(1);
			expect(staged[0]?.targetExt).toBe("webm");
			expect(staged[0]?.parentName).toBe("lecture.mlw");
			expect(staged[0]?.step).toBe(2);
		}
	});
});
