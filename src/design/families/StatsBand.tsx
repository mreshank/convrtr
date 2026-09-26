import { CountUp } from "@/design/primitives/CountUp";

type Props = {
	stats: { value: number; label: string }[];
};

/**
 * The proof strip directly under the hero: the landing-page logo soup,
 * replaced with numbers that can be checked. Counts arrive derived from
 * the registry; the two zeroes are architectural facts. Values count up
 * on mount (`CountUp`) and render statically for no-JS and reduced motion.
 *
 * Capped with no horizontal padding of its own: the shell owns the gutter,
 * the band owns only its cap.
 */
export function StatsBand({ stats }: Props) {
	if (stats.length === 0) return null;
	return (
		<dl
			aria-label="Product facts"
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
				gap: "var(--gap-sm)",
			}}
		>
			{stats.map((stat) => (
				<div
					key={stat.label}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
						borderTopWidth: "var(--rule-width)",
						borderTopStyle: "solid",
						borderTopColor: "var(--rule)",
						paddingTop: "var(--space-base)",
					}}
				>
					<dd
						className="mono"
						style={{
							fontSize: "var(--headline-size)",
							fontWeight: 400,
							color: "var(--ink)",
							margin: 0,
						}}
					>
						<CountUp end={stat.value} />
					</dd>
					<dt
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							letterSpacing: "0.08em",
							color: "var(--ink-muted)",
						}}
					>
						{stat.label}
					</dt>
				</div>
			))}
		</dl>
	);
}
