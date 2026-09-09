import Link from "next/link";
import { LiveDemo } from "@/components/instrument/LiveDemo";
import { AsymCard, MonoMeta } from "@/design/primitives";
import { HubPage } from "./HubPage";

export type ShowcaseTool = {
	id: string;
	href: string;
	name: string;
	fromExt: string;
	toExt: string;
};

type Props = {
	eyebrow?: string;
	title: string;
	lede: string;
	count?: { value: number; noun: string };
	/** Spec §8.4: a non-interactive grid of the set's member tools, each
	 * linking to its own converter. Used above the demo, never in place of it. */
	showcase: ShowcaseTool[];
	/** Spec §8.1: at most one real, on-demand conversion per page. Omitted
	 * entirely when a set has nothing this repo can generate an honest
	 * sample for. */
	demo?: { toolId: string; sampleId: string };
};

const VARIANTS = ["a", "b", "c"] as const;

/**
 * `HubPage` plus spec §8.4's showcase band and §8.1's demo slot — the shape
 * shared by every group and collective page: an eyebrow, headline and lede
 * (from `HubPage`), a plain-link grid of the set's tools, and at most one
 * `LiveDemo` beneath it.
 *
 * The showcase band is deliberately inert — every tile is a `Link`, nothing
 * here fetches or converts. `LiveDemo` is the one place on this page a real
 * conversion can happen, and only on a user's click.
 */
export function ShowcasePage({
	eyebrow,
	title,
	lede,
	count,
	showcase,
	demo,
}: Props) {
	return (
		<HubPage eyebrow={eyebrow} title={title} lede={lede} count={count}>
			<section
				aria-label="Tools in this set"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<MonoMeta as="p">Member tools</MonoMeta>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{showcase.map((tool, index) => (
						<ShowcaseTile
							key={tool.id}
							tool={tool}
							variant={VARIANTS[index % VARIANTS.length] ?? "a"}
						/>
					))}
				</div>
			</section>

			{demo ? <LiveDemo toolId={demo.toolId} sampleId={demo.sampleId} /> : null}
		</HubPage>
	);
}

function ShowcaseTile({
	tool,
	variant,
}: {
	tool: ShowcaseTool;
	variant: (typeof VARIANTS)[number];
}) {
	return (
		<Link href={tool.href} style={{ display: "block" }}>
			<AsymCard variant={variant} aspect="4/3">
				<div
					className="flex h-full flex-col justify-between border p-4"
					style={{ borderColor: "var(--rule)" }}
				>
					<span
						className="mono text-[12px]"
						style={{ color: "var(--ink-muted)" }}
					>
						{tool.fromExt.toUpperCase()} {"→"} {tool.toExt.toUpperCase()}
					</span>
					<span className="text-[14px]" style={{ color: "var(--ink)" }}>
						{tool.name}
					</span>
				</div>
			</AsymCard>
		</Link>
	);
}
