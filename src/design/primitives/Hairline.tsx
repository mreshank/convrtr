type Props = {
	className?: string;
};

/**
 * The system's only elevation device.
 *
 * DESIGN.md caps borders at 1px and forbids shadows outright, so separation
 * is always a rule and never a raised surface. Rendering an `<hr>` rather
 * than a styled `<div>` keeps the semantics honest for anyone navigating by
 * structure; the default browser border is replaced entirely so only the
 * top edge draws.
 */
export function Hairline({ className }: Props) {
	return (
		<hr
			className={className}
			style={{
				border: "0",
				borderTopWidth: "var(--rule-width)",
				borderTopStyle: "solid",
				borderTopColor: "var(--rule)",
				margin: "0",
			}}
		/>
	);
}
