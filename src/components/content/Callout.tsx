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
				borderColor: "var(--ink)",
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
