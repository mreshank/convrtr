import Link from "next/link";
import { getTool } from "@/core/registry";

export function ToolCTA({ toolId }: { toolId: string }) {
	const tool = getTool(toolId);
	if (!tool) {
		throw new Error(`ToolCTA: no tool registered with id "${toolId}"`);
	}
	return (
		<Link
			href={`/${tool.id}`}
			className="block rounded-[var(--radius)] border p-4 no-underline"
			style={{ borderColor: "var(--hairline)" }}
		>
			<p
				className="text-[12px] uppercase tracking-[0.08em]"
				style={{ color: "var(--text-muted)" }}
			>
				Try the tool
			</p>
			<p className="text-[16px]">{tool.seo.h1}</p>
			<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
				{tool.seo.intent}
			</p>
		</Link>
	);
}
