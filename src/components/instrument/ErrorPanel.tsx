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
			className="flex flex-col gap-3 p-4"
			style={{
				// Spec §4.5's one permitted inversion, done by redefining the
				// system's own tokens on this root rather than by overriding
				// colour on every child.
				//
				// Hand-inverting was the root of two separate defects. It put
				// the page's `--ink` behind the panel, so
				// `globals.css`'s `:focus-visible { outline: 1px solid
				// var(--ink) }` drew black on black in light mode and white on
				// white in dark — RETRY, DISMISS and TECHNICAL DETAIL had no
				// focus indication whatever, in the one place a keyboard user
				// is already stuck. And it put `--rule` out of reach, so the
				// detail divider was drawn in full-opacity `--ground`: the
				// heaviest hairline on a site where every other rule is 10%.
				//
				// Neither could be fixed child by child: the focus rule is
				// not this component's to restate. Redefining the tokens here
				// fixes both at once, and gives `--terminal*` the consumer
				// the spec assigns them.
				["--ground" as string]: "var(--terminal)",
				["--ink" as string]: "var(--terminal-ink)",
				["--rule" as string]: "var(--terminal-rule)",
				// The muted tier has no inverted counterpart in tokens.css:
				// `--ink-muted` is tuned against the page ground and is
				// illegible here. Pointing it at the full-strength terminal
				// ink keeps any descendant that reaches for it readable; the
				// recession itself is `opacity: 0.7` on the individual leaf,
				// which is where it has to be — opacity composites a whole
				// subtree and cannot be overridden by a child, so putting it
				// on a container would dim that container's siblings too.
				["--ink-muted" as string]: "var(--terminal-ink)",
				background: "var(--ground)",
				color: "var(--ink)",
				borderRadius: "var(--radius)",
			}}
		>
			<span className="mono text-[11px] tracking-[0.08em]">{copy.title}</span>

			<span className="text-[13px]">{copy.explain(inputFormat)}</span>

			<span className="text-[13px]" style={{ opacity: 0.7 }}>
				{copy.action}
			</span>

			<div className="flex items-center gap-4">
				{/*
				 * `color` is restated on each button and nowhere else: a
				 * <button> does not inherit colour from its parent, so it
				 * would fall back to the UA's `buttontext` and paint page-ink
				 * text on the inverted ground. Every non-button node below
				 * simply inherits from the root.
				 */}
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className="mono text-[11px] tracking-[0.08em]"
						style={{ color: "var(--ink)", background: "transparent" }}
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
							color: "var(--ink)",
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
					style={{ borderColor: "var(--rule)" }}
				>
					<button
						type="button"
						onClick={() => setDetailOpen((value) => !value)}
						aria-expanded={detailOpen}
						className="mono self-start text-[11px] tracking-[0.08em]"
						style={{
							color: "var(--ink)",
							opacity: 0.7,
							background: "transparent",
						}}
					>
						TECHNICAL DETAIL {detailOpen ? "−" : "+"}
					</button>
					{detailOpen && (
						<span className="mono text-[12px]" style={{ opacity: 0.7 }}>
							{detail}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
