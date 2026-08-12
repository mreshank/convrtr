import Link from "next/link";
import type { ToolRow } from "./toolRow";

/**
 * Pure presentation: given rows already derived from the registry, render
 * the dense hairline-divided table shared by the /tools index and every
 * /[category] hub. No state and no directive, so it can be rendered
 * straight from a server-rendered page shell, or from inside the
 * client-side search component as its query changes.
 *
 * The whole row is the click target: `<tr>` is the positioned ancestor, and
 * a full-bleed link living in the first cell stretches to cover it via
 * `inset: 0`, so clicking anywhere in the description or convert cells
 * navigates too, not just the name cell. The visible table still keeps
 * real <table> semantics — column headers, one row per tool — for anyone
 * navigating by structure rather than by link.
 */
export function ToolTable({
	rows,
	caption,
}: {
	rows: ToolRow[];
	caption: string;
}) {
	return (
		<div
			className="convrtr-tool-table border"
			style={{
				borderColor: "var(--hairline)",
				borderRadius: "var(--radius)",
			}}
		>
			<style>{`
				.convrtr-tool-table table { width: 100%; border-collapse: collapse; }
				.convrtr-tool-table tbody tr:not(:first-child) { border-top: var(--hairline-width) solid var(--hairline); }
				.convrtr-tool-table tbody td:first-child { border-left: 2px solid transparent; }
				.convrtr-tool-table tbody tr:hover td:first-child,
				.convrtr-tool-table tbody tr:focus-within td:first-child {
					border-left-color: var(--signal);
				}
			`}</style>
			<table>
				<caption className="sr-only">{caption}</caption>
				<thead>
					<tr>
						<th
							scope="col"
							className="mono px-4 py-2 text-left text-[11px] tracking-[0.08em]"
							style={{ color: "var(--text-muted)" }}
						>
							TOOL
						</th>
						<th
							scope="col"
							className="mono px-4 py-2 text-left text-[11px] tracking-[0.08em]"
							style={{ color: "var(--text-muted)" }}
						>
							DESCRIPTION
						</th>
						<th
							scope="col"
							className="mono px-4 py-2 text-right text-[11px] tracking-[0.08em]"
							style={{ color: "var(--text-muted)" }}
						>
							CONVERT
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.id} className="relative">
							<td
								className="px-4 py-3 text-[14px]"
								style={{ color: "var(--text-primary)" }}
							>
								<Link href={row.href} className="absolute inset-0">
									<span className="sr-only">
										{row.name} — convert {row.fromExt.toUpperCase()} to{" "}
										{row.toExt.toUpperCase()}
									</span>
								</Link>
								{row.name}
							</td>
							<td
								className="px-4 py-3 text-[13px]"
								style={{ color: "var(--text-muted)" }}
							>
								{row.description}
							</td>
							<td
								className="mono px-4 py-3 text-right text-[13px]"
								style={{ color: "var(--text-primary)" }}
							>
								{row.fromExt.toUpperCase()} {"→"} {row.toExt.toUpperCase()}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
