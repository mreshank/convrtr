export function FidelityBadge({ label }: { label: string }) {
	const lossless = label === "LOSSLESS" || label === "VISUALLY LOSSLESS";
	return (
		<span
			data-tone={lossless ? "lossless" : "lossy"}
			className="mono border px-3 py-1 text-[11px] tracking-[0.08em]"
			style={{
				color: lossless ? "var(--signal)" : "var(--lossy)",
				borderColor: lossless ? "var(--signal)" : "var(--lossy)",
				borderRadius: "999px",
			}}
		>
			{label}
		</span>
	);
}
