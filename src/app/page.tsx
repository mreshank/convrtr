export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-8">
			<h1 className="text-[32px] tracking-[-0.02em]">convrtr</h1>
			<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
				Convert anything. Nothing leaves your device.
			</p>
			<span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>
				LOCAL ONLY · 0 BYTES UPLOADED · WORKS OFFLINE
			</span>
		</main>
	);
}
