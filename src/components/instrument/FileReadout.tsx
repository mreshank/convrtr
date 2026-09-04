export function FileReadout({
	name,
	facts,
}: {
	name: string;
	facts: string[];
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[15px]">{name}</span>
			<span
				data-testid="facts"
				className="mono text-[12px]"
				style={{ color: "var(--ink-muted)" }}
			>
				{facts.join(" · ")}
			</span>
		</div>
	);
}
