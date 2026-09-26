"use client";

import { type FormEvent, useState } from "react";

const SUGGESTIONS = [
	{ label: "HEIC ➔ JPG", href: "/heic-to-jpg" },
	{ label: "MP4 ➔ MP3", href: "/mp4-to-mp3" },
	{ label: "PDF MERGE", href: "/merge-pdf" },
	{ label: "WEBP ➔ PNG", href: "/webp-to-png" },
	{ label: "MKV ➔ MP4", href: "/mkv-to-mp4" },
	{ label: "CSV ➔ PARQUET", href: "/csv-to-parquet" },
];

export function HeroActionInput() {
	const [query, setQuery] = useState("");

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (typeof window === "undefined") return;

		const trimmed = query.trim().toLowerCase();
		if (!trimmed) {
			window.location.href = "/convert";
			return;
		}

		// Normalize queries like "heic to jpg" -> "/heic-to-jpg"
		const match = trimmed.match(/^([a-z0-9]+)\s+(?:to|->|➔)\s+([a-z0-9]+)$/);
		if (match) {
			const [, from, to] = match;
			window.location.href = `/${from}-to-${to}`;
			return;
		}

		// Direct tool slug or search query
		window.location.href = `/tools?search=${encodeURIComponent(trimmed)}`;
	};

	return (
		<div className="w-full max-w-xl my-[var(--space-base)] flex flex-col gap-[var(--gap-sm)]">
			<form
				onSubmit={handleSubmit}
				style={{
					position: "relative",
					display: "flex",
					alignItems: "center",
					width: "100%",
					backgroundColor: "var(--surface)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					borderRadius: "var(--radius)",
				}}
			>
				<div
					style={{
						paddingLeft: "var(--gap-sm)",
						display: "flex",
						alignItems: "center",
						color: "var(--ink-muted)",
					}}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<circle cx="7" cy="7" r="5" />
						<path d="M11 11L14.5 14.5" />
					</svg>
				</div>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Type conversion (e.g. HEIC to JPG, MP4 to MP3)..."
					aria-label="Find or start conversion"
					className="h-12 flex-1 px-[var(--gap-sm)] bg-transparent border-0 outline-none text-[var(--body-size)] font-sans text-[var(--ink)]"
				/>
				<button
					type="submit"
					aria-label="Start conversion"
					className="h-9 px-[var(--gap-sm)] mr-1.5 inline-flex items-center gap-1.5 font-mono text-[var(--mono-size)] font-semibold cursor-pointer"
					style={{
						backgroundColor: "var(--ink)",
						color: "var(--ground)",
						border: "none",
						borderRadius: "var(--radius)",
						letterSpacing: "0.04em",
					}}
				>
					<span>GO</span>
					<span aria-hidden="true">➔</span>
				</button>
			</form>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "var(--space-base)",
					flexWrap: "wrap",
				}}
			>
				<span
					className="mono"
					style={{
						fontSize: "calc(var(--mono-size) * 0.9)",
						color: "var(--ink-muted)",
						letterSpacing: "0.06em",
					}}
				>
					POPULAR:
				</span>
				{SUGGESTIONS.map((item) => (
					<a
						key={item.label}
						href={item.href}
						className="mono px-2 py-0.5"
						style={{
							fontSize: "calc(var(--mono-size) * 0.9)",
							color: "var(--ink-muted)",
							backgroundColor: "var(--surface)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule-subtle)",
							borderRadius: "var(--radius-control)",
							textDecoration: "none",
							letterSpacing: "0.04em",
							transition:
								"border-color var(--dur-hover) var(--ease), color var(--dur-hover) var(--ease)",
						}}
					>
						{item.label}
					</a>
				))}
			</div>
		</div>
	);
}
