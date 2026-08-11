import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FidelityBadge } from "../FidelityBadge";
import { FileReadout } from "../FileReadout";
import { ProgressBar } from "../ProgressBar";

describe("FileReadout", () => {
	it("joins facts with a middot", () => {
		render(
			<FileReadout name="diagram.png" facts={["PNG", "RGBA8", "1.84 MB"]} />,
		);
		expect(screen.getByTestId("facts").textContent).toBe(
			"PNG · RGBA8 · 1.84 MB",
		);
	});
});

describe("FidelityBadge", () => {
	it("uses the signal colour for lossless", () => {
		render(<FidelityBadge label="LOSSLESS" />);
		expect(screen.getByText("LOSSLESS").getAttribute("data-tone")).toBe(
			"lossless",
		);
	});

	it("uses the lossy tone for anything else", () => {
		render(<FidelityBadge label="LOSSY · Q61" />);
		expect(screen.getByText("LOSSY · Q61").getAttribute("data-tone")).toBe(
			"lossy",
		);
	});
});

describe("ProgressBar", () => {
	it("exposes an accessible progress value", () => {
		render(<ProgressBar ratio={0.67} phase="encode" elapsedSeconds={4.2} />);
		const bar = screen.getByRole("progressbar");
		expect(bar.getAttribute("aria-valuenow")).toBe("67");
	});

	it("renders the readout row", () => {
		render(<ProgressBar ratio={0.67} phase="encode" elapsedSeconds={4.2} />);
		expect(screen.getByTestId("progress-readout").textContent).toContain("67%");
		expect(screen.getByTestId("progress-readout").textContent).toContain(
			"00:04.2",
		);
	});
});
