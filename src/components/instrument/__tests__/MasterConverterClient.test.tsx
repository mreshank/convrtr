import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MasterConverterClient } from "../MasterConverterClient";

// Mock runJob and readFile
vi.mock("@/core/pipeline/client", () => ({
	runJob: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
	JobError: class JobError extends Error {
		code = "ENGINE_FAILURE" as const;
	},
}));

vi.mock("@/core/io", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/core/io")>();
	return {
		...actual,
		readFile: vi.fn().mockResolvedValue(new ArrayBuffer(200)),
		saveOutput: vi.fn().mockResolvedValue(undefined),
	};
});

vi.mock("@/core/io/zip", () => ({
	zipOutputs: vi.fn().mockResolvedValue(new Blob([new Uint8Array(500)])),
}));

describe("MasterConverterClient", () => {
	it("renders the initial dropzone when empty", () => {
		render(<MasterConverterClient />);
		expect(screen.getByTestId("drop-field")).toBeDefined();
		expect(screen.getByText("DROP FILES HERE TO CONVERT")).toBeDefined();
	});

	it("populates files when dropped and defaults all to selected", () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [
			new File(["a"], "photo-1.png", { type: "image/png" }),
			new File(["b"], "photo-2.png", { type: "image/png" }),
		];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		const rows = screen.getAllByTestId("converter-item-row");
		expect(rows).toHaveLength(2);
		expect(screen.getByText("2 of 2 selected")).toBeDefined();
	});

	it("allows customizing selection on the go (e.g., 7 out of 10 selected)", () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		// Create 10 files
		const files = Array.from(
			{ length: 10 },
			(_, i) =>
				new File([`data-${i}`], `file-${i + 1}.png`, { type: "image/png" }),
		);

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		const rows = screen.getAllByTestId("converter-item-row");
		expect(rows).toHaveLength(10);
		expect(screen.getByText("10 of 10 selected")).toBeDefined();
		expect(
			screen.getByRole("button", { name: /CONVERT 10 FILES/i }),
		).toBeDefined();

		// Uncheck first 3 files
		const checkboxes = screen.getAllByRole("checkbox");
		// First checkbox is header 'select-all', next 10 are file rows
		fireEvent.click(checkboxes[1] as HTMLElement);
		fireEvent.click(checkboxes[2] as HTMLElement);
		fireEvent.click(checkboxes[3] as HTMLElement);

		// Now 7 should be selected!
		expect(screen.getByText("7 of 10 selected")).toBeDefined();
		expect(
			screen.getByRole("button", { name: /CONVERT 7 FILES/i }),
		).toBeDefined();

		// Click DESELECT to uncheck all
		fireEvent.click(screen.getByRole("button", { name: "DESELECT" }));
		expect(screen.getByText("0 of 10 selected")).toBeDefined();

		// Click SELECT ALL to check all
		fireEvent.click(screen.getByRole("button", { name: "SELECT ALL" }));
		expect(screen.getByText("10 of 10 selected")).toBeDefined();
	});

	it("allows individual target format customization per file row", () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [
			new File(["content"], "document.png", { type: "image/png" }),
		];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		const targetSelect = screen.getByRole("combobox", {
			name: "Target format for document.png",
		}) as HTMLSelectElement;

		expect(targetSelect).toBeDefined();

		// Switch target format to PDF
		fireEvent.change(targetSelect, { target: { value: "pdf" } });
		expect(targetSelect.value).toBe("pdf");
	});

	it("allows removing files individually", () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [
			new File(["1"], "one.png", { type: "image/png" }),
			new File(["2"], "two.png", { type: "image/png" }),
		];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		expect(screen.getAllByTestId("converter-item-row")).toHaveLength(2);

		const removeBtn = screen.getByRole("button", { name: "Remove one.png" });
		fireEvent.click(removeBtn);

		expect(screen.getAllByTestId("converter-item-row")).toHaveLength(1);
		expect(screen.getByText("two.png")).toBeDefined();
		expect(screen.queryByText("one.png")).toBeNull();
	});

	it("updates compatible selected files when global target is changed", () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [
			new File(["a"], "photo-1.png", { type: "image/png" }),
			new File(["b"], "photo-2.jpg", { type: "image/jpeg" }),
		];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		const globalSelect = screen.getByLabelText(
			"CONVERT SELECTED TO:",
		) as HTMLSelectElement;
		fireEvent.change(globalSelect, { target: { value: "avif" } });

		// Both photo-1.png and photo-2.jpg can convert to AVIF
		const select1 = screen.getByRole("combobox", {
			name: "Target format for photo-1.png",
		}) as HTMLSelectElement;
		const select2 = screen.getByRole("combobox", {
			name: "Target format for photo-2.jpg",
		}) as HTMLSelectElement;

		expect(select1.value).toBe("avif");
		expect(select2.value).toBe("avif");
	});

	it("executes conversion and enables individual SAVE and ZIP download", async () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [
			new File(["1"], "img1.png", { type: "image/png" }),
			new File(["2"], "img2.png", { type: "image/png" }),
		];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		const convertBtn = screen.getByRole("button", { name: /CONVERT 2 FILES/i });
		fireEvent.click(convertBtn);

		// Wait for completion
		const saveBtns = await screen.findAllByRole("button", {
			name: /Save img/i,
		});
		expect(saveBtns).toHaveLength(2);

		const zipBtn = screen.getByRole("button", { name: "DOWNLOAD ALL (ZIP)" });
		expect(zipBtn).toBeDefined();

		fireEvent.click(zipBtn);
	});

	it("filters items by search query and category", () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [
			new File(["a"], "landscape.png", { type: "image/png" }),
			new File(["b"], "portrait.jpg", { type: "image/jpeg" }),
			new File(["c"], "podcast.mp3", { type: "audio/mpeg" }),
		];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		expect(screen.getAllByTestId("converter-item-row")).toHaveLength(3);

		// Search for "land"
		const searchInput = screen.getByLabelText("Filter batch files table");
		fireEvent.change(searchInput, { target: { value: "land" } });

		let rows = screen.getAllByTestId("converter-item-row");
		expect(rows).toHaveLength(1);
		expect(screen.getByText("landscape.png")).toBeDefined();

		// Clear search
		fireEvent.change(searchInput, { target: { value: "" } });
		expect(screen.getAllByTestId("converter-item-row")).toHaveLength(3);

		// Filter by category: AUDIO
		const audioPill = screen.getByRole("button", { name: /AUDIO \(1\)/i });
		fireEvent.click(audioPill);

		rows = screen.getAllByTestId("converter-item-row");
		expect(rows).toHaveLength(1);
		expect(screen.getByText("podcast.mp3")).toBeDefined();

		// Reset category filter: ALL TYPES
		const allTypesPill = screen.getByRole("button", { name: "ALL TYPES" });
		fireEvent.click(allTypesPill);
		expect(screen.getAllByTestId("converter-item-row")).toHaveLength(3);
	});

	it("supports sorting by name and size", () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [
			new File(["medium content"], "zebra.png", { type: "image/png" }),
			new File(["tiny"], "alpha.png", { type: "image/png" }),
		];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		// Click FILE column header to sort
		const fileHeader = screen.getByRole("columnheader", { name: /^FILE/ });
		fireEvent.click(fileHeader);

		let rows = screen.getAllByTestId("converter-item-row");
		expect(rows[0]?.textContent).toContain("alpha.png");
		expect(rows[1]?.textContent).toContain("zebra.png");

		// Click again to reverse sort
		fireEvent.click(fileHeader);
		rows = screen.getAllByTestId("converter-item-row");
		expect(rows[0]?.textContent).toContain("zebra.png");
		expect(rows[1]?.textContent).toContain("alpha.png");
	});

	it("supports pruning completed items and copying report", async () => {
		render(<MasterConverterClient />);
		const dropField = screen.getByTestId("drop-field");

		const files = [new File(["1"], "done-item.png", { type: "image/png" })];

		fireEvent.drop(dropField, {
			dataTransfer: { files },
		});

		const convertBtn = screen.getByRole("button", { name: /CONVERT 1 FILE/i });
		fireEvent.click(convertBtn);

		await screen.findByRole("button", { name: /Save done-item/i });

		// COPY REPORT button is present
		const copyReportBtn = screen.getByRole("button", { name: "COPY REPORT" });
		expect(copyReportBtn).toBeDefined();

		// PRUNE COMPLETED button removes the completed item
		const pruneCompletedBtn = screen.getByRole("button", {
			name: "PRUNE COMPLETED",
		});
		fireEvent.click(pruneCompletedBtn);

		// With all items pruned, dropzone should reappear
		expect(screen.getByTestId("drop-field")).toBeDefined();
	});
});
