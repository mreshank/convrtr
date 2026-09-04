"use client";

import { useEffect, useRef, useState } from "react";

const SIZE = 32;

/**
 * DESIGN.md's custom cursor: a 32px circle blended with `difference`, so it
 * inverts whatever it passes over and stays visible on any ground.
 *
 * Three rules keep it from making the site worse than it was.
 *
 * `cursor: none` is applied from HERE, by adding a class to <body> on
 * mount, and never written statically into globals.css. A static rule
 * hides the system cursor for everyone — including anyone whose
 * JavaScript failed, was blocked, or has not hydrated yet — and leaves
 * them with no pointer and no way to get one back. Tying it to this
 * component means the system cursor can only disappear when a replacement
 * is genuinely on screen.
 *
 * Coarse pointers render nothing at all. There is no cursor to replace on
 * a touch screen.
 *
 * Reduced motion drops the interpolation. The lag IS the motion here, so
 * under `prefers-reduced-motion` the circle tracks the pointer exactly
 * rather than easing toward it.
 *
 * `transform` never carries a CSS transition, in either motion mode. Its
 * value is always set imperatively — the rAF lerp below when motion is
 * fine, a direct snap to the pointer when it is not — so a CSS transition
 * on top of that would double-ease every already-eased frame in the normal
 * case, and would silently reintroduce the exact delay reduced motion
 * exists to remove in the other. Only `scale` gets a transition, because
 * DESIGN.md's 2.5x hover scale (declared in primitives.css, since it
 * depends on `:hover`/`:has()` this component never sees) is a genuine
 * hover state and spec §4.6 requires a minimum 500ms ease on those — and
 * that transition is itself dropped under reduced motion, so the hover
 * scale snaps instead of easing.
 */
export function DifferenceCursor() {
	const [enabled, setEnabled] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);
	const dotRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!window.matchMedia("(pointer: fine)").matches) return;
		setEnabled(true);
		setReducedMotion(
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		);
		document.body.classList.add("has-custom-cursor");
		return () => {
			document.body.classList.remove("has-custom-cursor");
		};
	}, []);

	useEffect(() => {
		if (!enabled) return;

		// Target is where the pointer is; current is where the circle is.
		// Interpolating between them each frame is what produces the lag.
		let targetX = 0;
		let targetY = 0;
		let currentX = 0;
		let currentY = 0;
		let frame = 0;

		const onMove = (event: PointerEvent) => {
			targetX = event.clientX;
			targetY = event.clientY;
			if (reducedMotion) {
				currentX = targetX;
				currentY = targetY;
				paint();
			}
		};

		const paint = () => {
			const dot = dotRef.current;
			if (!dot) return;
			dot.style.transform = `translate3d(${currentX - SIZE / 2}px, ${
				currentY - SIZE / 2
			}px, 0)`;
		};

		const tick = () => {
			// 0.18 is slow enough to read as lag and fast enough that the
			// circle never feels detached from the pointer.
			currentX += (targetX - currentX) * 0.18;
			currentY += (targetY - currentY) * 0.18;
			paint();
			frame = requestAnimationFrame(tick);
		};

		window.addEventListener("pointermove", onMove, { passive: true });
		if (!reducedMotion) frame = requestAnimationFrame(tick);

		return () => {
			window.removeEventListener("pointermove", onMove);
			if (frame) cancelAnimationFrame(frame);
		};
	}, [enabled, reducedMotion]);

	if (!enabled) return null;

	return (
		<div
			ref={dotRef}
			data-cursor
			aria-hidden="true"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: SIZE,
				height: SIZE,
				borderRadius: "50%",
				background: "#ffffff",
				mixBlendMode: "difference",
				pointerEvents: "none",
				zIndex: 9999,
				// transform is deliberately absent from this list — see the
				// doc comment above. Only scale transitions, and only when
				// motion is not reduced.
				transition: reducedMotion
					? undefined
					: "scale var(--dur-min) var(--ease)",
			}}
		/>
	);
}
