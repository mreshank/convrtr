"use client";

import { useEffect, useState } from "react";

type Props = {
	/** Hook lines, rotated in order. Every line must be a checkable fact. */
	lines: string[];
	/** Time each line holds the stage. */
	intervalMs?: number;
};

/**
 * The hero's rotating hook line: one provocative claim at a time, swapped
 * on an interval with a short cross-fade. Original implementation, no
 * third-party animation dependency -- a timer plus the system's own
 * opacity transition.
 *
 * Reduced motion (or a single line) renders the first line statically with
 * no timer at all. `aria-live="polite"` announces rotations to assistive
 * technology without interrupting.
 */
export function RotatingHook({ lines, intervalMs = 3000 }: Props) {
	const [index, setIndex] = useState(0);
	const [fading, setFading] = useState(false);

	useEffect(() => {
		if (
			lines.length < 2 ||
			(typeof window !== "undefined" &&
				typeof window.matchMedia !== "undefined" &&
				window.matchMedia("(prefers-reduced-motion: reduce)").matches)
		) {
			return;
		}
		const hold = setInterval(() => {
			setFading(true);
			setTimeout(() => {
				setIndex((current) => (current + 1) % lines.length);
				setFading(false);
			}, 150);
		}, intervalMs);
		return () => clearInterval(hold);
	}, [lines.length, intervalMs]);

	if (lines.length === 0) return null;
	const line = lines[index] ?? lines[0] ?? "";

	return (
		<p
			aria-live="polite"
			className="mono"
			style={{
				fontSize: "var(--mono-size)",
				letterSpacing: "0.06em",
				color: "var(--ink-muted)",
				margin: 0,
				opacity: fading ? 0 : 1,
				transition: "opacity var(--dur-fade) var(--ease)",
			}}
		>
			<span style={{ color: "var(--accent)" }}>{"» "}</span>
			{line}
		</p>
	);
}
