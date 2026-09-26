import type { ReactNode } from "react";

type Quote = {
	quote: string;
	author: string;
	role: string;
	handle: string;
};

const ROW_ONE: Quote[] = [
	{
		quote:
			"My 4K video remuxes happen in 3 seconds without waiting in a 500MB cloud upload queue.",
		author: "Marcus T.",
		role: "Video Editor",
		handle: "@m_thompson",
	},
	{
		quote:
			"We handle strict GDPR healthcare records. convrtr gives our team instant PDF tools with mathematical guarantee of zero data leakage.",
		author: "Sarah M.",
		role: "Compliance Director",
		handle: "@sarah_m",
	},
	{
		quote:
			"I was skeptical about client-side ffmpeg in WebAssembly until I converted an entire batch of FLACs in my tab.",
		author: "James W.",
		role: "Audio Engineer",
		handle: "@j_wilson",
	},
	{
		quote:
			"A converter with no server bill because there are no servers. Brilliant Dieter Rams-level engineering.",
		author: "David B.",
		role: "Systems Architect",
		handle: "@d_brown",
	},
];

const ROW_TWO: Quote[] = [
	{
		quote:
			"The shortest-path graph router found a two-hop chain for my vintage chiptune files that no other tool supported.",
		author: "Elena R.",
		role: "Audio Archivist",
		handle: "@elena_sound",
	},
	{
		quote:
			"0 bytes uploaded is backed by real CI network guards in the repo. That's true engineering integrity.",
		author: "Alex K.",
		role: "Security Researcher",
		handle: "@ak_sec",
	},
	{
		quote:
			"Dragging a 300MB dataset into my browser and getting Parquet out without touching AWS is pure magic.",
		author: "Liam P.",
		role: "Data Engineer",
		handle: "@liam_data",
	},
	{
		quote:
			"No account, no credit card, no daily conversion limits. Just pure tool excellence.",
		author: "Maya S.",
		role: "Product Designer",
		handle: "@maya_ux",
	},
];

function QuoteCard({ item }: { item: Quote }) {
	return (
		<div
			className="w-80 shrink-0 flex flex-col justify-between"
			style={{
				backgroundColor: "var(--surface)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				borderRadius: "var(--radius)",
				padding: "var(--gap-sm)",
				gap: "var(--gap-sm)",
			}}
		>
			<p
				style={{
					fontSize: "var(--mono-size)",
					lineHeight: 1.6,
					color: "var(--ink)",
					margin: 0,
					fontFamily: "var(--font-sans)",
				}}
			>
				&ldquo;{item.quote}&rdquo;
			</p>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-end",
					borderTopWidth: "var(--rule-width)",
					borderTopStyle: "solid",
					borderTopColor: "var(--rule-subtle)",
					paddingTop: "var(--space-base)",
				}}
			>
				<div>
					<span
						className="meta"
						style={{
							color: "var(--ink)",
							fontWeight: 600,
							display: "block",
						}}
					>
						{item.author}
					</span>
					<span
						className="mono"
						style={{
							fontSize: "calc(var(--mono-size) * 0.85)",
							color: "var(--ink-muted)",
						}}
					>
						{item.role}
					</span>
				</div>
				<span
					className="mono"
					style={{
						fontSize: "calc(var(--mono-size) * 0.85)",
						color: "var(--accent)",
					}}
				>
					{item.handle}
				</span>
			</div>
		</div>
	);
}

function MarqueeRow({
	items,
	reverse = false,
}: {
	items: Quote[];
	reverse?: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				gap: "var(--gap-sm)",
				overflow: "hidden",
				width: "100%",
				userSelect: "none",
			}}
		>
			<div
				data-marquee
				style={{
					display: "flex",
					gap: "var(--gap-sm)",
					flexShrink: 0,
					animationName: "marquee-scroll",
					animationDuration: "40s",
					animationTimingFunction: "linear",
					animationIterationCount: "infinite",
					animationDirection: reverse ? "reverse" : "normal",
				}}
			>
				{items.map((item) => (
					<QuoteCard key={`${item.author}-${item.handle}`} item={item} />
				))}
			</div>
			<div
				data-marquee
				aria-hidden="true"
				inert={true}
				style={{
					display: "flex",
					gap: "var(--gap-sm)",
					flexShrink: 0,
					animationName: "marquee-scroll",
					animationDuration: "40s",
					animationTimingFunction: "linear",
					animationIterationCount: "infinite",
					animationDirection: reverse ? "reverse" : "normal",
				}}
			>
				{items.map((item) => (
					<QuoteCard key={`dup-${item.author}-${item.handle}`} item={item} />
				))}
			</div>
		</div>
	);
}

export function CommunityMarquee(): ReactNode {
	return (
		<div
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				padding: "var(--gap-lg) 0",
			}}
		>
			<div
				className="flex flex-col text-center max-w-xl mx-auto"
				style={{
					gap: "var(--space-base)",
				}}
			>
				<span
					className="meta"
					style={{
						color: "var(--accent)",
						letterSpacing: "0.08em",
					}}
				>
					PROOF {"//"} TESTIMONIALS
				</span>
				<h2
					style={{
						fontSize: "var(--headline-size)",
						color: "var(--ink)",
						fontWeight: 400,
						letterSpacing: "var(--headline-tracking)",
						margin: 0,
					}}
				>
					Hear from our community
				</h2>
				<p
					style={{
						fontSize: "var(--body-size)",
						color: "var(--ink-muted)",
						lineHeight: "var(--body-leading)",
						margin: 0,
					}}
				>
					Engineers, designers, and compliance teams relying on 100% private,
					in-browser conversion.
				</p>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
					width: "100%",
					overflow: "hidden",
				}}
			>
				<MarqueeRow items={ROW_ONE} />
				<MarqueeRow items={ROW_TWO} reverse={true} />
			</div>
		</div>
	);
}
