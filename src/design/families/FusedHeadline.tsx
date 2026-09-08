type Props = {
	/** The bold opening clause, in full ink. */
	lead: string;
	/** The muted continuation, on the same line. Not a subhead. */
	cont: string;
	as?: "h1" | "h2";
};

/**
 * v2's headline pattern: a statement and its explanatory continuation fused
 * into one line, the first in `--ink` and the second in `--ink-muted`.
 *
 * v2 states the rejected alternative outright — "rejecting the alternative of
 * a separate small subhead below; this keeps vertical rhythm tight while still
 * carrying two levels of hierarchy in one text block" (DESIGN.v2.md:125). So
 * the continuation is a `<span>` sharing the heading, and a test pins that,
 * because promoting it to a `<p>` beneath is the obvious well-meant edit that
 * would quietly delete the pattern.
 *
 * The emphasis is carried by colour rather than by weight. v2 puts both
 * display sizes at weight 400, so a 700 lead clause would be a departure from
 * the type scale rather than an expression of it.
 */
export function FusedHeadline({ lead, cont, as: Tag = "h2" }: Props) {
	return (
		<Tag
			style={{
				fontSize: "var(--headline-size)",
				fontWeight: 400,
				lineHeight: "var(--display-leading)",
				letterSpacing: "var(--headline-tracking)",
			}}
		>
			<span style={{ color: "var(--ink)" }}>{lead}</span>
			{" "}
			{/* A plain space at the clause boundary allows wrapping that makes the
			 * muted continuation appear as a separate subhead below the lead — the
			 * exact pattern v2 rejects. A non-breaking space forbids that break, so
			 * any wrap is mid-clause and the flow reads as continuous. */}
			<span style={{ color: "var(--ink-muted)" }}>{cont}</span>
		</Tag>
	);
}
