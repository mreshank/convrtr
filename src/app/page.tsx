import Link from "next/link";
import { TOOLS } from "@/core/registry";

export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-8">
			<h1 className="text-[32px] tracking-[-0.02em]">convrtr</h1>
			<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
				Convert anything. Nothing leaves your device.
			</p>
			{/*
			 * Derived from the registry rather than hand-listed, so adding a tool
			 * adds its link here for free. Hard-coding one would quietly falsify
			 * the architecture claim that nothing in `src/app` is per-tool.
			 */}
			<div className="flex flex-wrap gap-2">
				{TOOLS.map((tool) => (
					<Link
						key={tool.id}
						href={`/${tool.id}`}
						className="mono border px-4 py-2 text-[12px]"
						style={{
							color: "var(--text-primary)",
							borderColor: "var(--hairline)",
							borderRadius: "var(--radius)",
						}}
					>
						{tool.accept.ext[0]?.toUpperCase()} {"→"}{" "}
						{tool.output.ext.toUpperCase()}
					</Link>
				))}
			</div>
			<span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>
				LOCAL ONLY · 0 BYTES UPLOADED · WORKS OFFLINE
			</span>
		</main>
	);
}
