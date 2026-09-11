"use client";

import { useUser } from "@clerk/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
	calculateHistoryStats,
	clearHistory,
	exportHistoryAsCsv,
	exportHistoryAsJson,
	getHistory,
} from "@/core/history/store";
import type {
	ConversionHistoryRecord,
	HistoryStats,
} from "@/core/history/types";
import { formatBytes } from "@/lib/format";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthenticatedRetentionCallout() {
	const { isSignedIn, user } = useUser();

	if (isSignedIn && user) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "var(--gap-sm)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--accent)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-sm) var(--gap-md)",
				}}
			>
				<div>
					<span
						className="meta"
						style={{ color: "var(--accent)", marginRight: "var(--gap-sm)" }}
					>
						[ACCOUNT ACTIVE]
					</span>
					<span style={{ fontSize: "var(--label-size)", color: "var(--ink)" }}>
						Signed in as{" "}
						{user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "User"}.
						Extended 90-day conversion audit history active.
					</span>
				</div>
				<span
					className="meta"
					style={{ color: "var(--ink-muted)", fontSize: "var(--mono-size)" }}
				>
					ZERO SERVER UPLOADS • LOCAL EXECUTION
				</span>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "var(--gap-sm)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-sm) var(--gap-md)",
			}}
		>
			<div>
				<span
					className="meta"
					style={{ color: "var(--accent)", marginRight: "var(--gap-sm)" }}
				>
					[ANONYMOUS SESSION]
				</span>
				<span
					style={{ fontSize: "var(--label-size)", color: "var(--ink-muted)" }}
				>
					Conversions are stored locally in your browser (30-day retention).
					Sign in to unlock 90-day retention and multi-device sync.
				</span>
			</div>
			<Link
				href="/auth"
				style={{
					display: "inline-flex",
					alignItems: "center",
					height: "23px",
					padding: "0 14px",
					backgroundColor: "var(--ink)",
					color: "var(--ground)",
					fontFamily: "var(--font-mono)",
					fontSize: "var(--mono-size)",
					textTransform: "uppercase",
					letterSpacing: "0.08em",
					borderRadius: "var(--radius-pill)",
					textDecoration: "none",
				}}
			>
				Sign In
			</Link>
		</div>
	);
}

function AccountRetentionCallout() {
	if (!PUBLISHABLE_KEY) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "var(--gap-sm)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-sm) var(--gap-md)",
				}}
			>
				<div>
					<span
						className="meta"
						style={{ color: "var(--accent)", marginRight: "var(--gap-sm)" }}
					>
						[ANONYMOUS SESSION]
					</span>
					<span
						style={{ fontSize: "var(--label-size)", color: "var(--ink-muted)" }}
					>
						Conversions are stored locally in your browser (30-day retention).
						Sign in to unlock 90-day retention and multi-device sync.
					</span>
				</div>
				<Link
					href="/auth"
					style={{
						display: "inline-flex",
						alignItems: "center",
						height: "23px",
						padding: "0 14px",
						backgroundColor: "var(--ink)",
						color: "var(--ground)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						borderRadius: "var(--radius-pill)",
						textDecoration: "none",
					}}
				>
					Sign In
				</Link>
			</div>
		);
	}

	return <AuthenticatedRetentionCallout />;
}

export function HistoryClient() {
	const [records, setRecords] = useState<ConversionHistoryRecord[]>([]);
	const [filter, setFilter] = useState<string>("all");
	const [stats, setStats] = useState<HistoryStats>({
		totalConversions: 0,
		totalInputBytes: 0,
		totalOutputBytes: 0,
		totalDurationMs: 0,
	});

	const refresh = useCallback(() => {
		const items = getHistory();
		setRecords(items);
		setStats(calculateHistoryStats(items));
	}, []);

	useEffect(() => {
		refresh();
		const handleUpdate = () => refresh();
		window.addEventListener("convrtr-history-updated", handleUpdate);
		return () =>
			window.removeEventListener("convrtr-history-updated", handleUpdate);
	}, [refresh]);

	const filtered =
		filter === "all" ? records : records.filter((r) => r.category === filter);

	const handleExport = () => {
		const csv = exportHistoryAsCsv(records);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `convrtr-audit-history-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportJson = () => {
		const json = exportHistoryAsJson(records);
		const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `convrtr-audit-history-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleClear = () => {
		if (
			window.confirm("Clear all conversion history? This cannot be undone.")
		) {
			clearHistory();
			refresh();
		}
	};

	const categories = ["all", "audio", "image", "video", "document"];

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				width: "100%",
			}}
		>
			<AccountRetentionCallout />
			{/* Metric stats grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--surface)",
				}}
			>
				<div
					style={{
						padding: "var(--gap-sm)",
						borderRight: "var(--rule-width) solid var(--rule)",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							marginBottom: "var(--space-base)",
						}}
					>
						TOTAL CONVERSIONS
					</p>
					<p
						style={{
							fontSize: "var(--headline-size)",
							fontFamily: "var(--font-mono)",
							fontWeight: 500,
							margin: 0,
						}}
					>
						{stats.totalConversions}
					</p>
				</div>
				<div
					style={{
						padding: "var(--gap-sm)",
						borderRight: "var(--rule-width) solid var(--rule)",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							marginBottom: "var(--space-base)",
						}}
					>
						BYTES PROCESSED
					</p>
					<p
						style={{
							fontSize: "var(--headline-size)",
							fontFamily: "var(--font-mono)",
							fontWeight: 500,
							margin: 0,
						}}
					>
						{formatBytes(stats.totalInputBytes)}
					</p>
				</div>
				<div
					style={{
						padding: "var(--gap-sm)",
						borderRight: "var(--rule-width) solid var(--rule)",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							marginBottom: "var(--space-base)",
						}}
					>
						OUTPUT GENERATED
					</p>
					<p
						style={{
							fontSize: "var(--headline-size)",
							fontFamily: "var(--font-mono)",
							fontWeight: 500,
							margin: 0,
						}}
					>
						{formatBytes(stats.totalOutputBytes)}
					</p>
				</div>
				<div style={{ padding: "var(--gap-sm)" }}>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							marginBottom: "var(--space-base)",
						}}
					>
						RETENTION WINDOW
					</p>
					<p
						style={{
							fontSize: "var(--headline-size)",
							fontFamily: "var(--font-mono)",
							fontWeight: 500,
							margin: 0,
							color: "var(--accent)",
						}}
					>
						30 DAYS
					</p>
				</div>
			</div>

			{/* Filter bar & Actions */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "var(--gap-sm)",
				}}
			>
				<div style={{ display: "flex", gap: "var(--gap-sm)" }}>
					{categories.map((cat) => (
						<button
							type="button"
							key={cat}
							onClick={() => setFilter(cat)}
							style={{
								height: "23px",
								padding: "0 14px",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: filter === cat ? "var(--ink)" : "var(--rule)",
								backgroundColor:
									filter === cat ? "var(--surface)" : "transparent",
								color: filter === cat ? "var(--ink)" : "var(--ink-muted)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								cursor: "pointer",
							}}
						>
							{cat}
						</button>
					))}
				</div>

				<div style={{ display: "flex", gap: "var(--gap-sm)" }}>
					<button
						type="button"
						onClick={handleExport}
						disabled={records.length === 0}
						style={{
							height: "23px",
							padding: "0 14px",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "transparent",
							color: "var(--ink)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							cursor: records.length === 0 ? "not-allowed" : "pointer",
							opacity: records.length === 0 ? 0.4 : 1,
						}}
					>
						Export CSV
					</button>
					<button
						type="button"
						onClick={handleExportJson}
						disabled={records.length === 0}
						style={{
							height: "23px",
							padding: "0 14px",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "transparent",
							color: "var(--ink)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							cursor: records.length === 0 ? "not-allowed" : "pointer",
							opacity: records.length === 0 ? 0.4 : 1,
						}}
					>
						Export JSON
					</button>
					<button
						type="button"
						onClick={handleClear}
						disabled={records.length === 0}
						style={{
							height: "23px",
							padding: "0 14px",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "transparent",
							color: "var(--ink-muted)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							cursor: records.length === 0 ? "not-allowed" : "pointer",
							opacity: records.length === 0 ? 0.4 : 1,
						}}
					>
						Clear History
					</button>
				</div>
			</div>

			{/* Record list table */}
			{filtered.length === 0 ? (
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						padding: "var(--gap-md)",
						textAlign: "center",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							marginBottom: "var(--space-base)",
						}}
					>
						AUDIT LOG EMPTY
					</p>
					<p style={{ color: "var(--ink)", marginBottom: "var(--gap-sm)" }}>
						No conversions recorded in this retention window. Convert a file to
						record private audit metrics.
					</p>
					<Link
						href="/convert"
						style={{
							display: "inline-flex",
							alignItems: "center",
							height: "36px",
							padding: "0 14px",
							borderRadius: "var(--radius-pill)",
							backgroundColor: "var(--ink)",
							color: "var(--ground)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							fontWeight: 600,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
						}}
					>
						Launch Converter
					</Link>
				</div>
			) : (
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						overflowX: "auto",
					}}
				>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							textAlign: "left",
						}}
					>
						<thead>
							<tr
								style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
							>
								<th
									className="meta"
									style={{
										padding: "var(--gap-sm)",
										color: "var(--ink-muted)",
									}}
								>
									TIMESTAMP
								</th>
								<th
									className="meta"
									style={{
										padding: "var(--gap-sm)",
										color: "var(--ink-muted)",
									}}
								>
									INPUT FILE
								</th>
								<th
									className="meta"
									style={{
										padding: "var(--gap-sm)",
										color: "var(--ink-muted)",
									}}
								>
									OUTPUT FILE
								</th>
								<th
									className="meta"
									style={{
										padding: "var(--gap-sm)",
										color: "var(--ink-muted)",
									}}
								>
									SIZE CHANGE
								</th>
								<th
									className="meta"
									style={{
										padding: "var(--gap-sm)",
										color: "var(--ink-muted)",
									}}
								>
									DURATION
								</th>
								<th
									className="meta"
									style={{
										padding: "var(--gap-sm)",
										color: "var(--ink-muted)",
									}}
								>
									TOOL
								</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((r) => {
								const diff = r.outputSize - r.inputSize;
								const pct =
									r.inputSize > 0 ? Math.round((diff / r.inputSize) * 100) : 0;
								return (
									<tr
										key={r.id}
										style={{
											borderBottom: "var(--rule-width) solid var(--rule)",
										}}
									>
										<td
											className="mono"
											style={{
												padding: "var(--gap-sm)",
												fontSize: "var(--mono-size)",
												color: "var(--ink-muted)",
											}}
										>
											{new Date(r.timestamp).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</td>
										<td
											className="mono"
											style={{
												padding: "var(--gap-sm)",
												fontSize: "var(--body-size)",
											}}
										>
											<span style={{ color: "var(--ink)" }}>{r.inputName}</span>
											<span
												style={{
													color: "var(--ink-muted)",
													marginLeft: "var(--space-base)",
													fontSize: "var(--mono-size)",
												}}
											>
												({formatBytes(r.inputSize)})
											</span>
										</td>
										<td
											className="mono"
											style={{
												padding: "var(--gap-sm)",
												fontSize: "var(--body-size)",
											}}
										>
											<span style={{ color: "var(--ink)" }}>
												{r.outputName}
											</span>
											<span
												style={{
													color: "var(--ink-muted)",
													marginLeft: "var(--space-base)",
													fontSize: "var(--mono-size)",
												}}
											>
												({formatBytes(r.outputSize)})
											</span>
										</td>
										<td
											className="mono"
											style={{
												padding: "var(--gap-sm)",
												fontSize: "var(--mono-size)",
											}}
										>
											<span
												style={{
													color:
														pct <= 0 ? "var(--accent)" : "var(--ink-muted)",
												}}
											>
												{pct > 0 ? `+${pct}%` : `${pct}%`}
											</span>
										</td>
										<td
											className="mono"
											style={{
												padding: "var(--gap-sm)",
												fontSize: "var(--mono-size)",
												color: "var(--ink-muted)",
											}}
										>
											{r.durationMs > 1000
												? `${(r.durationMs / 1000).toFixed(1)}s`
												: `${r.durationMs}ms`}
										</td>
										<td style={{ padding: "var(--gap-sm)" }}>
											<Link
												href={`/${r.toolId}`}
												className="mono"
												style={{
													color: "var(--accent)",
													fontSize: "var(--mono-size)",
													textDecoration: "underline",
												}}
											>
												{r.toolId}
											</Link>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
