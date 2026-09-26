"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
	/** Final value. Rendered locale-formatted (e.g. 1424 -> "1,424"). */
	end: number;
	/** Animation length. The system's motion stays in the 0.2-1.2s band. */
	durationMs?: number;
	className?: string;
};

/**
 * A number that counts up to its final value on mount -- the honest way to
 * present a live registry or subscriber count, which is computed at render
 * time rather than typed by hand.
 *
 * Original implementation (no third-party animation dependency): a single
 * requestAnimationFrame loop with an ease-out curve. Reduced motion renders
 * the final value immediately with no loop at all. The formatted value is
 * always in the DOM, so static export, no-JS, and assistive technology all
 * get the number, never a "0" placeholder.
 */
export function CountUp({ end, durationMs = 900, className }: Props) {
	const [display, setDisplay] = useState(() =>
		typeof window !== "undefined" &&
		typeof window.matchMedia !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
			? end
			: 0,
	);
	const frame = useRef(0);

	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			typeof window.matchMedia !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			setDisplay(end);
			return;
		}
		if (end <= 0 || durationMs <= 0) {
			setDisplay(end);
			return;
		}
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min((now - start) / durationMs, 1);
			const eased = 1 - (1 - progress) ** 3;
			setDisplay(Math.round(eased * end));
			if (progress < 1) frame.current = requestAnimationFrame(tick);
		};
		frame.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame.current);
	}, [end, durationMs]);

	return (
		// role="img" makes aria-label a valid accessible name: a bare span
		// has role "generic", which the accessible-name spec does not allow
		// to be named -- the same pattern `Reveal` uses for fragmented text.
		// The label is the final value, so assistive technology hears the
		// number once instead of every animation frame.
		<span role="img" aria-label={String(end)} className={className}>
			{display.toLocaleString("en-US")}
		</span>
	);
}
