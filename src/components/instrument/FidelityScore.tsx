import type { FidelityState } from "@/core/quality";

export type { FidelityState };

type Props = {
	/** 0-100; 100 = bit-exact lossless. Out-of-range input is clamped. */
	score: number;
	/** Accessible name only, e.g. "LOSSLESS" — never rendered inside the ring. */
	label: string;
	/**
	 * What kind of conversion this is, from `fidelityState` in
	 * `@/core/quality`. Required, not derived: the ring's stroke pattern is
	 * a claim about whether anything was given up, and this component has no
	 * way to know that from the score alone.
	 */
	fidelity: FidelityState;
	/** Diameter in px. */
	size?: number;
};

/**
 * The two states the ring may be drawn solid for.
 *
 * The design system is strictly monochrome, so the difference between a
 * result that gave nothing up and one that did cannot be a hue — it is the
 * continuity of the line itself. A solid ring reads as intact; a dashed one
 * reads as something lost, without needing a legend.
 *
 * This keys off the state, never off the score. A numeric threshold looks
 * equivalent and is not: `balanced` JPEG declares quality 78, so any
 * threshold at or below 78 draws a solid ring — a claim that nothing was
 * given up — over a DCT-quantised image, on the default setting of the
 * site's most-used conversion. Spec §4.5 requires a dashed ring for both
 * `LOSSY` and `INHERENTLY LOSSY` regardless of how high the number is.
 */
function isSolid(fidelity: FidelityState): boolean {
	return fidelity === "lossless" || fidelity === "visually-lossless";
}

/**
 * The stroked arc for a 0-1 sweep, starting at twelve o'clock and running
 * clockwise.
 *
 * Drawn as a path rather than a dash-clipped circle because `stroke-dasharray`
 * has to stay free to carry the lossless/lossy distinction — clipping the
 * sweep with it, as this component used to, would make the two encodings
 * fight over the same attribute.
 *
 * A full sweep needs two half-arcs: a single 360-degree elliptical arc has
 * identical start and end points, which SVG treats as a no-op and simply
 * does not render.
 */
function arcPath(center: number, radius: number, ratio: number): string | null {
	if (ratio <= 0) return null;

	const top = `${center} ${center - radius}`;
	if (ratio >= 1) {
		const bottom = `${center} ${center + radius}`;
		return `M ${top} A ${radius} ${radius} 0 0 1 ${bottom} A ${radius} ${radius} 0 0 1 ${top}`;
	}

	const angle = ratio * 2 * Math.PI;
	const endX = center + radius * Math.sin(angle);
	const endY = center - radius * Math.cos(angle);
	const largeArc = angle > Math.PI ? 1 : 0;
	return `M ${top} A ${radius} ${radius} 0 ${largeArc} 1 ${round2(endX)} ${round2(endY)}`;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * A dumb, reusable fidelity indicator: a donut ring whose swept length
 * tracks a 0-100 score and whose stroke is solid or broken depending on
 * whether anything was given up, with the score printed in the middle. Pure
 * presentation — no knowledge of tools, engines, or presets.
 */
export function FidelityScore({ score, label, fidelity, size = 36 }: Props) {
	const clamped = Math.min(100, Math.max(0, score));
	const rounded = Math.round(clamped);

	const strokeWidth = size * 0.1;
	const radius = size / 2 - strokeWidth / 2 - 1;
	const fontSize = Math.max(10, size * 0.3);
	const center = size / 2;

	const d = arcPath(center, radius, clamped / 100);
	const solid = isSolid(fidelity);
	// Six dashes and six gaps around the full circumference: coarse enough to
	// read as deliberately broken at 36px rather than as a rendering artefact.
	const dash = round2((2 * Math.PI * radius) / 12);

	return (
		<span
			role="img"
			aria-label={`Fidelity ${rounded} of 100 — ${label}`}
			className="relative inline-flex items-center justify-center"
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				aria-hidden="true"
				className="absolute inset-0"
			>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke="var(--rule)"
					strokeWidth={strokeWidth}
				/>
				{d && (
					<path
						d={d}
						fill="none"
						stroke="var(--ink)"
						strokeWidth={strokeWidth}
						strokeLinecap={solid ? "round" : "butt"}
						{...(solid ? {} : { strokeDasharray: `${dash} ${dash}` })}
					/>
				)}
			</svg>
			<span
				aria-hidden="true"
				className="mono relative"
				style={{ fontSize, color: "var(--ink)" }}
			>
				{rounded}
			</span>
		</span>
	);
}
