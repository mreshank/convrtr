import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

/**
 * v2's dot-matrix grain: "small, angular, dithered", over the topmost strip
 * and faintly behind code panels.
 *
 * Drawn as a repeating radial-gradient rather than shipped as an image. A
 * lattice is exactly what a gradient expresses well, it costs no request --
 * which matters in a product whose whole claim is that nothing leaves the
 * device -- and its colour comes from `--rule`, so the palette guard covers
 * it like everything else.
 *
 * `pointer-events: none` is load-bearing, not hygiene. The grain is painted
 * over the content it textures, so without it the entire band stops accepting
 * clicks, and nothing in a DOM-only test suite would notice.
 */
export function DotMatrix({ children }: Props) {
	return (
		<div style={{ position: "relative", isolation: "isolate" }}>
			{children}
			<div
				data-grain
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					backgroundImage: "radial-gradient(var(--rule) 1px, transparent 1px)",
					backgroundSize: "var(--gap-sm) var(--gap-sm)",
				}}
			/>
		</div>
	);
}
