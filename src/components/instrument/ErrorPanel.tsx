"use client";

import { useState } from "react";
import type { ErrorCode } from "@/core/pipeline/protocol";

type Props = {
	code: ErrorCode;
	detail?: string;
	inputFormat?: string;
	onRetry?: () => void;
	onDismiss?: () => void;
};

type Copy = {
	title: string;
	explain: (inputFormat?: string) => string;
	action: string;
};

/**
 * One entry per `ErrorCode`. Using `Record<ErrorCode, Copy>` rather than a
 * switch means adding a code to the taxonomy in `protocol.ts` is a type
 * error here until this map is updated — exhaustiveness is enforced by the
 * compiler, not by whoever reviews the diff.
 *
 * `USER_CANCELLED` still needs an entry to satisfy the `Record`, even though
 * the component returns `null` for it before this copy is ever read.
 */
const COPY: Record<ErrorCode, Copy> = {
	UNSUPPORTED_INPUT: {
		title: "FORMAT NOT SUPPORTED",
		explain: (inputFormat) =>
			inputFormat
				? `This converter does not read ${inputFormat} yet. The file was never opened.`
				: "This converter does not read the input format yet. The file was never opened.",
		action:
			"Export the source as a format this tool lists as accepted, then load it again — the file you dropped is still right here.",
	},
	CORRUPT_INPUT: {
		title: "FILE DID NOT PARSE",
		explain: () =>
			"The file's internal structure did not parse — the bytes on disk don't match what the format expects.",
		action:
			"Re-export the file from the application that made it and try that copy. The file already loaded here is untouched, so retry once you have a new export.",
	},
	CAPABILITY_MISSING: {
		title: "BROWSER MISSING A CODEC",
		explain: () =>
			"This device or browser lacks a codec this conversion needs. The file itself is fine.",
		action:
			"A different browser may already have the codec built in. Retrying here can also fall back to a path that needs a larger one-time download.",
	},
	OUT_OF_MEMORY: {
		title: "DEVICE MEMORY LIMIT",
		explain: () =>
			"The file exceeded the memory this device could give the conversion. This is a limit of the machine, not a flaw in the file.",
		action:
			"Split the file into smaller pieces, or run the conversion on a machine with more memory. The loaded file is still here if you want to retry as-is.",
	},
	ENGINE_FAILURE: {
		title: "CONVERTER FAILED",
		explain: () => "The conversion engine itself failed partway through.",
		action:
			"Retry — transient failures often clear on a second pass. A different quality setting sometimes routes around it entirely.",
	},
	USER_CANCELLED: {
		title: "",
		explain: () => "",
		action: "",
	},
};

/**
 * Presents a failed job's `ErrorCode` as instrument-panel copy: a title,
 * a plain-English cause, and a concrete next action. Deliberately renders
 * nothing for `USER_CANCELLED` — a cancellation is not an error, and convrtr
 * never discards the loaded input on failure, so every code above offers
 * retry rather than "select your file again".
 */
export function ErrorPanel({
	code,
	detail,
	inputFormat,
	onRetry,
	onDismiss,
}: Props) {
	const [detailOpen, setDetailOpen] = useState(false);

	if (code === "USER_CANCELLED") {
		return null;
	}

	const copy = COPY[code];

	return (
		<div
			// The test id lives on this root rather than on a wrapper in the
			// caller, so that returning null for USER_CANCELLED renders nothing
			// at all. A wrapper would still match `getByTestId("error")` while
			// empty, and the cancel e2e asserts that count is zero.
			data-testid="error"
			role="alert"
			className="flex flex-col gap-3 border-l p-4"
			style={{
				background: "var(--text-primary)",
				color: "var(--surface-base)",
				borderRadius: "var(--radius)",
			}}
		>
			<span
				className="mono text-[11px] tracking-[0.08em]"
				style={{ color: "var(--surface-base)" }}
			>
				{copy.title}
			</span>

			<span className="text-[13px]" style={{ color: "var(--surface-base)" }}>
				{copy.explain(inputFormat)}
			</span>

			<span
				className="text-[13px]"
				style={{ color: "var(--surface-base)", opacity: 0.7 }}
			>
				{copy.action}
			</span>

			<div className="flex items-center gap-4">
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className="mono text-[11px] tracking-[0.08em]"
						style={{ color: "var(--surface-base)", background: "transparent" }}
					>
						RETRY
					</button>
				)}
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						className="mono text-[11px] tracking-[0.08em]"
						style={{
							color: "var(--surface-base)",
							opacity: 0.7,
							background: "transparent",
						}}
					>
						DISMISS
					</button>
				)}
			</div>

			{detail && (
				<div
					className="flex flex-col gap-2 border-t pt-3"
					style={{ borderColor: "var(--surface-base)" }}
				>
					<button
						type="button"
						onClick={() => setDetailOpen((value) => !value)}
						aria-expanded={detailOpen}
						className="mono self-start text-[11px] tracking-[0.08em]"
						style={{
							color: "var(--surface-base)",
							opacity: 0.7,
							background: "transparent",
						}}
					>
						TECHNICAL DETAIL {detailOpen ? "−" : "+"}
					</button>
					{detailOpen && (
						<span
							className="mono text-[12px]"
							style={{ color: "var(--surface-base)", opacity: 0.7 }}
						>
							{detail}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
