export type PipelineStage = {
	/** Short mono code painted on the rail, e.g. "ROUTE". */
	code: string;
	title: string;
	body: string;
	/** Names the real module or function that runs this stage. */
	detail: string;
};

type Props = {
	stages: PipelineStage[];
};

/**
 * The journey chapter's spine: every conversion's five stages as a vertical
 * timeline. A 1px rail runs down the left; each stage hangs a node off it --
 * hollow for the stages travelled, solid mint for the delivery at the end.
 * Nodes are geometric glyphs (`○`/`●`), never emoji, per the product's
 * typography-first discipline.
 *
 * Server-rendered from `PIPELINE_STAGES` in `home-content.ts`, whose details
 * name real modules, so the timeline is an index into the codebase as well
 * as a story beat. The cap wrapper carries no padding (shell owns the
 * gutter); the rail's own inset is vertical rhythm, not a gutter.
 */
export function PipelineTimeline({ stages }: Props) {
	if (stages.length === 0) return null;
	const last = stages.length - 1;

	return (
		<ol
			aria-label="Stages of a conversion"
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				listStyle: "none",
				paddingTop: 0,
				paddingBottom: 0,
				paddingLeft: 0,
				paddingRight: 0,
			}}
		>
			{stages.map((stage, index) => {
				const isLast = index === last;
				return (
					<li
						key={stage.code}
						style={{
							display: "grid",
							gridTemplateColumns: "3.5rem 1fr",
							gap: "var(--gap-sm)",
							position: "relative",
							paddingBottom: isLast ? 0 : "var(--gap-md)",
						}}
					>
						{/* Rail: node glyph over a hairline that stops at the last node. */}
						<div
							aria-hidden="true"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
							}}
						>
							<span
								className="mono"
								style={{
									fontSize: "var(--body-size)",
									lineHeight: 1.4,
									color: isLast ? "var(--accent)" : "var(--ink-muted)",
								}}
							>
								{isLast ? "●" : "○"}
							</span>
							{!isLast && (
								<span
									style={{
										flex: 1,
										minHeight: "var(--gap-sm)",
										borderLeftWidth: "var(--rule-width)",
										borderLeftStyle: "solid",
										borderLeftColor: "var(--rule)",
									}}
								/>
							)}
						</div>

						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "calc(var(--space-base) / 2)",
								paddingBottom: isLast ? 0 : "var(--space-base)",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "baseline",
									gap: "var(--space-base)",
									flexWrap: "wrap",
								}}
							>
								<span
									className="mono"
									style={{
										fontSize: "var(--mono-size)",
										letterSpacing: "0.1em",
										color: isLast ? "var(--accent)" : "var(--ink-muted)",
									}}
								>
									{String(index + 1).padStart(2, "0")} · {stage.code}
								</span>
								<span
									style={{
										fontSize: "var(--body-size)",
										fontWeight: 500,
										color: "var(--ink)",
									}}
								>
									{stage.title}
								</span>
							</div>
							<p
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
									lineHeight: 1.6,
									margin: 0,
									maxWidth: "65ch",
								}}
							>
								{stage.body}
							</p>
							<p
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--rule-strong)",
									margin: 0,
								}}
							>
								{stage.detail}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
