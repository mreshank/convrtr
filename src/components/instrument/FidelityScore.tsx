type Props = {
	/** 0-100; 100 = bit-exact lossless. Out-of-range input is clamped. */
	score: number;
	/** Accessible name only, e.g. "LOSSLESS" — never rendered inside the ring. */
	label: string;
	/** Diameter in px. */
	size?: number;
};

/**
 * Derives the ring colour from the design system's own tokens via
 * `color-mix`, so it stays theme-aware without ever hardcoding a hex value —
 * light and dark resolve `--signal`/`--lossy`/`--error` to different colours,
 * and a literal here would be wrong in one of the two themes.
 *
 * A single solid stroke colour — no multi-stop fills; see the design
 * system's forbidden-device list.
 *
 *   score >= 75: blend from --lossy (at 75) to --signal (at 100)
 *   score <  75: blend from --error (at 0) to --lossy (at 75)
 */
function ringColor(score: number): string {
	if (score >= 75) {
		const mix = round2(((score - 75) / 25) * 100);
		return `color-mix(in oklab, var(--signal) ${mix}%, var(--lossy))`;
	}
	const mix = round2((score / 75) * 100);
	return `color-mix(in oklab, var(--lossy) ${mix}%, var(--error))`;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * A dumb, reusable fidelity indicator: a donut ring whose filled arc and
 * colour both track a 0-100 score, with the score printed in the middle.
 * Pure presentation — no knowledge of tools, engines, or presets.
 */
export function FidelityScore({ score, label, size = 36 }: Props) {
	const clamped = Math.min(100, Math.max(0, score));
	const rounded = Math.round(clamped);

	const strokeWidth = size * 0.1;
	const radius = size / 2 - strokeWidth / 2 - 1;
	const circumference = 2 * Math.PI * radius;
	const dashoffset = circumference * (1 - clamped / 100);
	const fontSize = Math.max(10, size * 0.3);
	const center = size / 2;

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
					stroke="var(--hairline)"
					strokeWidth={strokeWidth}
				/>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke={ringColor(clamped)}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={dashoffset}
					transform={`rotate(-90 ${center} ${center})`}
				/>
			</svg>
			<span
				aria-hidden="true"
				className="mono relative"
				style={{ fontSize, color: "var(--text-primary)" }}
			>
				{rounded}
			</span>
		</span>
	);
}
