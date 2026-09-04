import { Fragment } from "react";
import type { ErrorCode } from "@/core/pipeline/protocol";
import type { FidelityState } from "@/core/quality";
import { formatBytes, formatDelta, formatPercent } from "@/lib/format";
import { ErrorPanel } from "./ErrorPanel";
import { FidelityScore } from "./FidelityScore";

/**
 * One row's state. Deliberately a discriminated union rather than a single
 * shape with optional fields — a row that hasn't started has no ratio to
 * show, and a row that hasn't finished has no output size to show, so the
 * type only carries what that status actually has.
 *
 * This is *not* `BatchOutcome` (see `@/core/pipeline/batch`): `BatchOutcome`
 * only exists once an item has fully settled, but a row also needs to
 * render while queued or mid-conversion. `ToolClient` is what bridges the
 * two — folding live `BatchItemEvent`s and the eventual `BatchOutcome[]`
 * into this shape — so this component itself never has to know about the
 * pipeline's async machinery, only how to render a snapshot of it.
 *
 * `done`'s `outputSize` is optional for a real architectural reason, not
 * laziness: `runBatch` (see `@/core/pipeline/batch`) reports a `"done"`
 * event for an item the moment *that* item finishes, but the output bytes
 * (and therefore the exact size) only become available once *every* item in
 * the batch has settled and the whole promise resolves. So a row can enter
 * `"done"` — and this table can say so, honestly — well before its size or
 * SAVE action are ready. `outputSize` present is exactly the signal this
 * component uses to know bytes have actually landed; see the OUT/DELTA
 * cells and the SAVE button below.
 */
export type BatchRowState =
	| { id: string; name: string; inputSize: number; status: "queued" }
	| {
			id: string;
			name: string;
			inputSize: number;
			status: "converting";
			ratio: number;
			phase: string;
	  }
	| {
			id: string;
			name: string;
			inputSize: number;
			status: "done";
			outputSize?: number;
	  }
	| {
			id: string;
			name: string;
			inputSize: number;
			status: "error";
			code: ErrorCode;
			message: string;
	  }
	| { id: string; name: string; inputSize: number; status: "cancelled" };

type Props = {
	rows: BatchRowState[];
	/**
	 * The batch's single declared fidelity figure (see `fidelityScore` in
	 * `@/core/quality`) — one `OptionsPanel` governs the whole batch, so
	 * every row shares the same score. Rendered per row anyway, since a
	 * dense results table reads as one subdivided instrument, not a summary
	 * line plus a list.
	 *
	 * `state` rides alongside the number because the ring's stroke pattern
	 * is categorical — see `fidelityState` — and cannot be recovered from
	 * the score.
	 */
	fidelity: { score: number; label: string; state: FidelityState };
	/** Called with a row's id when its SAVE action is activated. Only
	 * reachable for `status: "done"` rows — see the disabled state below. */
	onSaveRow: (id: string) => void;
	/** Forwarded to each row's `ErrorPanel` so `UNSUPPORTED_INPUT` copy can
	 * name the format, matching the single-file error experience. */
	inputFormat?: string;
};

const COLUMN_COUNT = 7;

function statusLabel(row: BatchRowState): string {
	switch (row.status) {
		case "queued":
			return "QUEUED";
		case "converting":
			return `${formatPercent(row.ratio)} · ${row.phase || "CONVERTING"}`;
		case "done":
			return "DONE";
		case "error":
			return "ERROR";
		case "cancelled":
			return "CANCELLED";
	}
}

function statusColor(row: BatchRowState): string {
	switch (row.status) {
		case "done":
			return "var(--ink)";
		case "error":
			return "var(--ink)";
		case "converting":
			return "var(--ink)";
		default:
			return "var(--ink-muted)";
	}
}

const cellStyle = {
	borderColor: "var(--rule)",
} as const;

/**
 * The multi-file results instrument: a dense table, one row per file,
 * subdivided by hairlines rather than presented as a stack of cards. A row
 * that errors renders `ErrorPanel` inline directly beneath itself — it
 * never replaces or dims the rows around it, so one bad file in a batch of
 * fifty reads as exactly that.
 */
export function BatchTable({ rows, fidelity, onSaveRow, inputFormat }: Props) {
	return (
		<table
			data-testid="batch-table"
			className="mono w-full border-collapse text-[12px]"
			style={{ borderColor: "var(--rule)" }}
		>
			<caption className="sr-only">Batch conversion results</caption>
			<thead>
				<tr>
					<th
						scope="col"
						className="border-b px-2 py-2 text-left font-normal"
						style={{ ...cellStyle, color: "var(--ink-muted)" }}
					>
						FILE
					</th>
					<th
						scope="col"
						className="border-b px-2 py-2 text-right font-normal"
						style={{ ...cellStyle, color: "var(--ink-muted)" }}
					>
						IN
					</th>
					<th
						scope="col"
						className="border-b px-2 py-2 text-right font-normal"
						style={{ ...cellStyle, color: "var(--ink-muted)" }}
					>
						OUT
					</th>
					<th
						scope="col"
						className="border-b px-2 py-2 text-right font-normal"
						style={{ ...cellStyle, color: "var(--ink-muted)" }}
					>
						DELTA
					</th>
					<th
						scope="col"
						className="border-b px-2 py-2 text-center font-normal"
						style={{ ...cellStyle, color: "var(--ink-muted)" }}
					>
						FIDELITY
					</th>
					<th
						scope="col"
						className="border-b px-2 py-2 text-left font-normal"
						style={{ ...cellStyle, color: "var(--ink-muted)" }}
					>
						STATUS
					</th>
					<th
						scope="col"
						className="border-b px-2 py-2 text-right font-normal"
						style={{ ...cellStyle, color: "var(--ink-muted)" }}
					>
						<span className="sr-only">Actions</span>
					</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<Fragment key={row.id}>
						<tr data-testid="batch-row" data-status={row.status}>
							<td
								className={`border-b px-2 py-2 text-left${
									row.status === "error" ? " border-l" : ""
								}`}
								style={
									row.status === "error"
										? {
												...cellStyle,
												borderLeftColor: "var(--ink)",
												borderLeftStyle: "dashed",
											}
										: cellStyle
								}
							>
								{row.name}
							</td>
							<td
								className="mono border-b px-2 py-2 text-right"
								style={cellStyle}
							>
								{formatBytes(row.inputSize)}
							</td>
							<td
								className="mono border-b px-2 py-2 text-right"
								style={cellStyle}
							>
								{row.status === "done" && row.outputSize !== undefined
									? formatBytes(row.outputSize)
									: "—"}
							</td>
							<td
								className="mono border-b px-2 py-2 text-right"
								style={cellStyle}
							>
								{row.status === "done" && row.outputSize !== undefined
									? formatDelta(row.inputSize, row.outputSize)
									: "—"}
							</td>
							<td className="border-b px-2 py-2 text-center" style={cellStyle}>
								<FidelityScore
									score={fidelity.score}
									label={fidelity.label}
									fidelity={fidelity.state}
									size={20}
								/>
							</td>
							<td
								className="border-b px-2 py-2 text-left"
								style={{ ...cellStyle, color: statusColor(row) }}
							>
								{statusLabel(row)}
							</td>
							<td className="border-b px-2 py-2 text-right" style={cellStyle}>
								{row.status === "done" && row.outputSize !== undefined && (
									<button
										type="button"
										onClick={() => onSaveRow(row.id)}
										aria-label={`Save ${row.name}`}
										className="mono border px-2 py-1 text-[11px]"
										style={{
											color: "var(--ink)",
											borderColor: "var(--ink)",
											borderRadius: "var(--radius)",
											background: "transparent",
										}}
									>
										SAVE
									</button>
								)}
							</td>
						</tr>
						{row.status === "error" && (
							<tr data-testid="batch-row-error">
								<td
									colSpan={COLUMN_COUNT}
									className="border-b p-0"
									style={cellStyle}
								>
									<ErrorPanel
										code={row.code}
										detail={row.message}
										inputFormat={inputFormat}
									/>
								</td>
							</tr>
						)}
					</Fragment>
				))}
			</tbody>
		</table>
	);
}
