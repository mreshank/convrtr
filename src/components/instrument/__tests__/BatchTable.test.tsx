import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatBytes, formatDelta } from "@/lib/format";
import { type BatchRowState, BatchTable } from "../BatchTable";

const fidelity = { score: 82, label: "LOSSY · Q82" };

const mixedRows: BatchRowState[] = [
	{ id: "a", name: "photo-1.png", inputSize: 200_000, status: "queued" },
	{
		id: "b",
		name: "photo-2.png",
		inputSize: 400_000,
		status: "converting",
		ratio: 0.4,
		phase: "ENCODING",
	},
	{
		id: "c",
		name: "photo-3.png",
		inputSize: 1_000_000,
		status: "done",
		outputSize: 250_000,
	},
	{
		id: "d",
		name: "photo-4.png",
		inputSize: 50_000,
		status: "error",
		code: "CORRUPT_INPUT",
		message: "bad header",
	},
	{ id: "e", name: "photo-5.png", inputSize: 300_000, status: "cancelled" },
];

describe("BatchTable", () => {
	it("renders one row per file, in input order", () => {
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={vi.fn()} />,
		);
		const rows = screen.getAllByTestId("batch-row");
		expect(rows).toHaveLength(5);
		expect(
			within(rows[0] as HTMLElement).getByText("photo-1.png"),
		).toBeDefined();
		expect(
			within(rows[4] as HTMLElement).getByText("photo-5.png"),
		).toBeDefined();
	});

	it("labels each row's status distinctly", () => {
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={vi.fn()} />,
		);
		const rows = screen.getAllByTestId("batch-row");
		expect(within(rows[0] as HTMLElement).getByText("QUEUED")).toBeDefined();
		expect(
			within(rows[1] as HTMLElement).getByText(/40%.*ENCODING/),
		).toBeDefined();
		expect(within(rows[2] as HTMLElement).getByText("DONE")).toBeDefined();
		expect(within(rows[3] as HTMLElement).getByText("ERROR")).toBeDefined();
		expect(within(rows[4] as HTMLElement).getByText("CANCELLED")).toBeDefined();
	});

	it("shows output size and delta only for done rows, and a placeholder otherwise", () => {
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={vi.fn()} />,
		);
		const rows = screen.getAllByTestId("batch-row");
		expect(
			within(rows[2] as HTMLElement).getByText(formatBytes(250_000)),
		).toBeDefined();
		expect(
			within(rows[2] as HTMLElement).getByText(formatDelta(1_000_000, 250_000)),
		).toBeDefined();

		for (const index of [0, 1, 3, 4]) {
			const cells = within(rows[index] as HTMLElement).getAllByText("—");
			expect(cells.length).toBeGreaterThan(0);
		}
	});

	it("renders an inline ErrorPanel for an error row without suppressing sibling rows", () => {
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={vi.fn()} />,
		);
		// Exactly one error panel, for the one errored file.
		expect(screen.getAllByRole("alert")).toHaveLength(1);
		// The message is passed through as ErrorPanel's collapsed technical
		// detail, matching how the single-file view surfaces it — expand it
		// before asserting on its content.
		fireEvent.click(screen.getByText(/TECHNICAL DETAIL/));
		expect(screen.getByRole("alert").textContent).toContain("bad header");

		// Every row is still present and readable — the error did not blank
		// out or replace its neighbours.
		const rows = screen.getAllByTestId("batch-row");
		expect(rows).toHaveLength(5);
		for (const name of [
			"photo-1.png",
			"photo-2.png",
			"photo-3.png",
			"photo-4.png",
			"photo-5.png",
		]) {
			expect(screen.getByText(name)).toBeDefined();
		}
	});

	it("shows DONE without a size or SAVE action when an item has settled but its bytes have not landed yet", () => {
		// This is the live-progress interim state: `runBatch` reports a
		// "done" event for one item well before the whole batch's output
		// bytes are available (see the comment on `BatchRowState`), so a row
		// can be `status: "done"` with `outputSize` still undefined.
		const rows: BatchRowState[] = [
			{ id: "p", name: "pending-bytes.png", inputSize: 10_000, status: "done" },
		];
		render(<BatchTable rows={rows} fidelity={fidelity} onSaveRow={vi.fn()} />);
		const row = screen.getByTestId("batch-row");
		expect(within(row).getByText("DONE")).toBeDefined();
		expect(within(row).getAllByText("—")).toHaveLength(2);
		expect(
			screen.queryByRole("button", { name: "Save pending-bytes.png" }),
		).toBeNull();
	});

	it("only offers a SAVE action for done rows, with an accessible per-file name", () => {
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={vi.fn()} />,
		);
		expect(
			screen.getByRole("button", { name: "Save photo-3.png" }),
		).toBeDefined();
		expect(
			screen.queryByRole("button", { name: "Save photo-1.png" }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Save photo-4.png" }),
		).toBeNull();
	});

	it("calls onSaveRow with the row's id when SAVE is clicked", () => {
		const onSaveRow = vi.fn();
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={onSaveRow} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Save photo-3.png" }));
		expect(onSaveRow).toHaveBeenCalledWith("c");
	});

	it("renders real table semantics with column headers", () => {
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={vi.fn()} />,
		);
		expect(screen.getByRole("table")).toBeDefined();
		expect(screen.getByRole("columnheader", { name: "FILE" })).toBeDefined();
		expect(screen.getByRole("columnheader", { name: "STATUS" })).toBeDefined();
	});

	it("renders a fidelity indicator per row", () => {
		render(
			<BatchTable rows={mixedRows} fidelity={fidelity} onSaveRow={vi.fn()} />,
		);
		expect(screen.getAllByRole("img", { name: /Fidelity 82/ })).toHaveLength(5);
	});

	it("passes inputFormat through to the error row's ErrorPanel", () => {
		// CORRUPT_INPUT copy does not mention the format, so assert indirectly
		// via UNSUPPORTED_INPUT instead, which does.
		const unsupportedRows: BatchRowState[] = [
			{
				id: "x",
				name: "clip.mov",
				inputSize: 10,
				status: "error",
				code: "UNSUPPORTED_INPUT",
				message: "nope",
			},
		];
		render(
			<BatchTable
				rows={unsupportedRows}
				fidelity={fidelity}
				onSaveRow={vi.fn()}
				inputFormat="AVI"
			/>,
		);
		expect(screen.getByRole("alert").textContent).toContain("AVI");
	});

	it("renders an empty table body for zero rows without throwing", () => {
		render(<BatchTable rows={[]} fidelity={fidelity} onSaveRow={vi.fn()} />);
		expect(screen.getByRole("table")).toBeDefined();
		expect(screen.queryAllByTestId("batch-row")).toHaveLength(0);
	});
});
