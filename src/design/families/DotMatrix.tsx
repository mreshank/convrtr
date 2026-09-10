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
 * device -- and its colour comes from `--rule-subtle`, so the palette guard
 * covers it like everything else.
 *
 * `--rule-subtle`, not `--rule`. This grain is painted OVER whatever it
 * textures (see the `pointer-events` note below), so every dot sits directly
 * behind -- and at its 1px centre, right through -- any text in the band,
 * including the hero's and the terminal panel's own `--ink-muted` copy.
 * Measured against the composited pixels, `--ink-muted` (148, 151, 158) over
 * `--rule` (48, 50, 54) is 4.39:1 -- under the 4.5:1 AA floor -- while the
 * same text over `--rule-subtle` (24, 25, 27) is 6.01:1. (Channel numbers
 * rather than hex, the same convention `preamble.ts` and `tokens.css` use --
 * the palette guard in `tokens.test.ts` sweeps comments too.) `--rule` is the
 * border value for structure a reader is meant to see; `--rule-subtle` is the
 * near-invisible one, which is what a background grain should have been drawn
 * in from the start. Task 3's contrast pass caught the stronger value only
 * once it started sampling composited pixels instead of tokens.
 *
 * `pointer-events: none` is load-bearing, not hygiene. The grain is painted
 * over the content it textures, so without it the entire band stops accepting
 * clicks, and nothing in a DOM-only test suite would notice.
 */
export function DotMatrix({ children }: Props) {
	return (
		<div style={{ position: "relative", isolation: "isolate" }}>
			<div
				data-grain
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					backgroundImage:
						"radial-gradient(var(--rule-subtle) 1px, transparent 1px)",
					backgroundSize: "var(--gap-sm) var(--gap-sm)",
					zIndex: 0,
				}}
			/>
			<div style={{ position: "relative", zIndex: 1 }}>{children}</div>
		</div>
	);
}
