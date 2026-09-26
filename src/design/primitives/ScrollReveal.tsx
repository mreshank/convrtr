"use client";

import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

type Props = {
	children: ReactNode;
	/** Stagger offset for sequenced reveals within a chapter. */
	delayMs?: number;
	className?: string;
	style?: CSSProperties;
};

/**
 * Scroll-triggered slide-fade for story sections -- the page's chapters
 * resolve as they enter the viewport instead of arriving all at once.
 *
 * Original implementation (no third-party animation dependency): one
 * IntersectionObserver per mount, unobserved after the first reveal. The
 * hidden state is applied from the effect, never at server render, so
 * static export, no-JS crawlers, and first paint all see full content --
 * hiding is strictly a runtime enhancement. Motion is the system's own
 * slide-fade (`--dur-fade`/`--ease` in `primitives.css`), and the universal
 * reduced-motion collapse in `globals.css` covers the transition with no
 * extra handling here.
 */
export function ScrollReveal({
	children,
	delayMs = 0,
	className,
	style,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.setAttribute("data-scroll-reveal", "");
		if (delayMs > 0) el.style.transitionDelay = `${delayMs}ms`;
		if (typeof IntersectionObserver === "undefined") {
			setVisible(true);
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setVisible(true);
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.12 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [delayMs]);

	return (
		<div
			ref={ref}
			className={className}
			style={style}
			{...(visible ? { "data-visible": true } : {})}
		>
			{children}
		</div>
	);
}
