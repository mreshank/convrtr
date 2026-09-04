type CalloutProps = { kind: "note" | "warning"; children: React.ReactNode };

const KIND_LABEL: Record<CalloutProps["kind"], string> = {
	note: "Note",
	warning: "Warning",
};

export function Callout({ kind, children }: CalloutProps) {
	return (
		<div
			role="note"
			className="flex flex-col gap-1 rounded-[var(--radius)] border p-4 text-[14px]"
			style={{
				// A note is a neutral aside and sits on the system's 10%
				// hairline, like every other rule on the site. Full-strength
				// --ink here made it the heaviest border on the page —
				// outweighing ToolCTA, the actual call to action, in adjacent
				// MDX. Keeping --ink for warning alone means the two kinds now
				// differ by weight *and* by dash rather than by dash alone.
				borderColor: kind === "warning" ? "var(--ink)" : "var(--rule)",
				borderStyle: kind === "warning" ? "dashed" : "solid",
			}}
		>
			<p
				className="text-[12px] uppercase tracking-[0.08em]"
				style={{ color: "var(--ink-muted)" }}
			>
				{KIND_LABEL[kind]}
			</p>
			<div>{children}</div>
		</div>
	);
}
