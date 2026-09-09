import Link from "next/link";

export type GroupLink = { href: string; label: string; count: number };

/**
 * Pure presentation: a labeled list of links to group routes, each showing
 * its tool count. `/groups` uses this once per dimension it lists -- format
 * and task -- so a third dimension later means calling this again, not
 * inventing a second list. Same hairline-divided-rows convention as
 * `ToolTable`, scaled down to a link list rather than a multi-column table
 * since a group route has nothing else worth a column.
 */
export function GroupLinks({
	heading,
	links,
}: {
	heading: string;
	links: GroupLink[];
}) {
	return (
		<section className="flex flex-col gap-2">
			<h2
				className="mono text-[11px] tracking-[0.08em]"
				style={{ color: "var(--ink-muted)" }}
			>
				{heading}
			</h2>
			<ul
				className="flex flex-col"
				style={{ borderTop: "var(--rule-width) solid var(--rule)" }}
			>
				{links.map((link) => (
					<li
						key={link.href}
						style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
					>
						<Link
							href={link.href}
							className="flex items-center justify-between px-4 py-3 text-[14px]"
							style={{ color: "var(--ink)" }}
						>
							<span>{link.label}</span>
							<span
								className="mono text-[13px]"
								style={{ color: "var(--ink-muted)" }}
							>
								{link.count}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
