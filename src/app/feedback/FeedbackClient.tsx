"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getHistory } from "@/core/history/store";
import {
	type DispatchResult,
	dispatchFormSubmission,
} from "@/lib/form-dispatch";
import {
	formatDiagnosticMarkdown,
	runSystemDiagnostics,
} from "@/lib/system-diagnostics";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

const CATEGORIES = [
	{ id: "format", label: "FORMAT PROPOSAL" },
	{ id: "bug", label: "BUG REPORT" },
	{ id: "feature", label: "FEATURE REQUEST" },
	{ id: "general", label: "GENERAL FEEDBACK" },
] as const;

const RATINGS = [
	{ value: 5, label: "5/5 EXCEPTIONAL" },
	{ value: 4, label: "4/5 GREAT" },
	{ value: 3, label: "3/5 GOOD" },
	{ value: 2, label: "2/5 FAIR" },
	{ value: 1, label: "1/5 POOR" },
] as const;

export function FeedbackClient() {
	const { isOnline } = useNetworkStatus();
	const [category, setCategory] = useState<string>("format");
	const [rating, setRating] = useState<number>(5);
	const [message, setMessage] = useState<string>("");
	const [contactEmail, setContactEmail] = useState<string>("");
	const [attachDiagnostics, setAttachDiagnostics] = useState<boolean>(true);
	const [attachRecentError, setAttachRecentError] = useState<boolean>(true);
	const [recentErrorDetected, setRecentErrorDetected] = useState<string | null>(
		null,
	);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(
		null,
	);
	const [copied, setCopied] = useState<boolean>(false);

	// Scan recent local history for conversion errors on mount
	useEffect(() => {
		try {
			const history = getHistory();
			const latestError = history.find(
				(rec) => rec.status === "error" && rec.errorMessage,
			);
			if (latestError) {
				setRecentErrorDetected(
					`[${latestError.toolId}] ${latestError.errorMessage} (${latestError.inputName})`,
				);
			}
		} catch {
			// Local history access unavailable
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!message.trim()) return;

		setSubmitting(true);

		let diagnosticMd = "";
		if (attachDiagnostics) {
			const report = runSystemDiagnostics();
			diagnosticMd = formatDiagnosticMarkdown(report);
		}

		const result = await dispatchFormSubmission({
			type: "feedback",
			topicOrCategory: category,
			rating,
			email: contactEmail.trim() || undefined,
			message: message.trim(),
			recentError:
				attachRecentError && recentErrorDetected
					? recentErrorDetected
					: undefined,
			diagnosticReportMarkdown: diagnosticMd || undefined,
		});

		setDispatchResult(result);
		setSubmitting(false);
	};

	const handleCopyTicket = async () => {
		if (!dispatchResult?.ticketMarkdown) return;
		try {
			await navigator.clipboard.writeText(dispatchResult.ticketMarkdown);
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		} catch {
			// Clipboard API unavailable
		}
	};

	const resetForm = () => {
		setDispatchResult(null);
		setMessage("");
	};

	const githubIssueUrl = `https://github.com/mreshank/convrtr/issues/new?title=${encodeURIComponent(
		`[${category.toUpperCase()}] ${message.slice(0, 60) || "Feedback"}`,
	)}&body=${encodeURIComponent(
		`### Category\n${category}\n\n### Rating\n${rating}/5\n\n### Feedback Details\n${message}\n\n${recentErrorDetected ? `### Recent Error\n\`\`\`\n${recentErrorDetected}\n\`\`\`\n\n` : ""}*Submitted via convrtr web feedback portal*`,
	)}`;

	// Success / Submission Recorded View
	if (dispatchResult) {
		return (
			<div className="w-full max-w-2xl mx-auto py-8">
				<div
					className="border p-6 md:p-8 flex flex-col gap-6"
					style={{
						background: "var(--surface)",
						borderColor: "var(--rule)",
					}}
				>
					<div
						className="flex flex-col gap-1 border-b pb-4"
						style={{ borderColor: "var(--rule)" }}
					>
						<div className="flex items-center justify-between">
							<span
								className="mono text-[10px] tracking-wider uppercase"
								style={{ color: "var(--ink-muted)" }}
							>
								FEEDBACK DISPATCH STATUS
							</span>
							<span
								className="mono text-[10px] font-bold tracking-wider px-2 py-0.5 border"
								style={{
									color:
										dispatchResult.mode === "online_transmitted"
											? "var(--accent)"
											: "var(--ink)",
									borderColor:
										dispatchResult.mode === "online_transmitted"
											? "var(--accent)"
											: "var(--rule)",
									background: "transparent",
								}}
							>
								{dispatchResult.mode === "online_transmitted"
									? "TRANSMISSION CONFIRMED"
									: dispatchResult.mode === "offline_queued"
										? "OFFLINE // CACHED LOCALLY"
										: "NETWORK FALLBACK ACTIVE"}
							</span>
						</div>
						<h2
							className="text-xl md:text-2xl font-bold tracking-tight uppercase mt-2"
							style={{ color: "var(--ink)" }}
						>
							{dispatchResult.mode === "online_transmitted"
								? "RESPONSE TRANSMITTED"
								: "FEEDBACK RECORDED LOCALLY"}
						</h2>
						<p className="text-xs mono" style={{ color: "var(--ink-muted)" }}>
							{dispatchResult.message}
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<span
							className="mono text-[11px] font-semibold uppercase tracking-wider"
							style={{ color: "var(--ink)" }}
						>
							DIRECT ACTIONS & TICKET EXPORT
						</span>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={handleCopyTicket}
								className="mono text-xs font-bold py-2 px-4 border transition-colors cursor-pointer"
								style={{
									background: copied ? "var(--accent)" : "var(--ink)",
									color: copied ? "var(--ground)" : "var(--surface)",
									borderColor: copied ? "var(--accent)" : "var(--ink)",
								}}
							>
								{copied ? "COPIED TO CLIPBOARD" : "COPY TICKET (MARKDOWN) ➔"}
							</button>

							<a
								href={dispatchResult.mailtoUrl}
								className="mono text-xs py-2 px-4 border transition-colors text-center cursor-pointer"
								style={{
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
							>
								DISPATCH IN EMAIL CLIENT ↗
							</a>

							<a
								href={githubIssueUrl}
								target="_blank"
								rel="noreferrer"
								className="mono text-xs py-2 px-4 border transition-colors text-center cursor-pointer"
								style={{
									color: "var(--ink-muted)",
									borderColor: "var(--rule)",
								}}
							>
								FILE ON GITHUB ISSUES ↗
							</a>
						</div>
					</div>

					<div
						className="flex items-center justify-between pt-4 border-t"
						style={{ borderColor: "var(--rule)" }}
					>
						<button
							type="button"
							onClick={resetForm}
							className="mono text-[11px] py-1.5 px-3 border transition-colors cursor-pointer hover:underline"
							style={{
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
						>
							SUBMIT ANOTHER RESPONSE ➔
						</button>
						<Link
							href="/convert"
							className="mono text-[11px] font-bold py-1.5 px-3 border text-center transition-colors cursor-pointer"
							style={{
								background: "var(--ink)",
								color: "var(--surface)",
								borderColor: "var(--ink)",
							}}
						>
							START CONVERTING ➔
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-2xl mx-auto py-8">
			<form
				onSubmit={handleSubmit}
				className="border p-6 md:p-8 flex flex-col gap-6"
				style={{
					background: "var(--surface)",
					borderColor: "var(--rule)",
				}}
			>
				<div>
					<div className="flex items-center justify-between mb-1">
						<span
							className="mono text-[10px] tracking-wider uppercase"
							style={{ color: "var(--ink-muted)" }}
						>
							COMMUNITY INPUT & ENGINE PROPOSALS
						</span>
						<span
							className="mono text-[9px] tracking-wider uppercase px-2 py-0.5 border"
							style={{
								color: isOnline ? "var(--accent)" : "var(--ink-muted)",
								borderColor: isOnline ? "var(--accent)" : "var(--rule)",
							}}
						>
							{isOnline ? "ONLINE // LIVE DISPATCH" : "OFFLINE // LOCAL QUEUE"}
						</span>
					</div>
					<h2
						className="text-xl md:text-2xl font-bold tracking-tight uppercase"
						style={{ color: "var(--ink)" }}
					>
						SHARE YOUR FEEDBACK
					</h2>
					<p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
						Suggest new file formats, report conversion anomalies, or transmit
						feedback directly to the engineering team.
					</p>
				</div>

				{/* Category selector */}
				<div className="flex flex-col gap-2">
					<span
						className="mono text-[11px] font-semibold uppercase tracking-wider"
						style={{ color: "var(--ink)" }}
					>
						CATEGORY
					</span>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
						{CATEGORIES.map((cat) => {
							const active = category === cat.id;
							return (
								<button
									key={cat.id}
									type="button"
									onClick={() => setCategory(cat.id)}
									className="mono text-[10px] py-2 px-2.5 border text-center transition-colors cursor-pointer"
									style={{
										background: active ? "var(--ink)" : "transparent",
										color: active ? "var(--surface)" : "var(--ink)",
										borderColor: active ? "var(--ink)" : "var(--rule)",
										fontWeight: active ? 700 : 500,
									}}
								>
									{cat.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Rating selector */}
				<div className="flex flex-col gap-2">
					<span
						className="mono text-[11px] font-semibold uppercase tracking-wider"
						style={{ color: "var(--ink)" }}
					>
						EXPERIENCE RATING
					</span>
					<div className="flex flex-wrap gap-2">
						{RATINGS.map((r) => {
							const active = rating === r.value;
							return (
								<button
									key={r.value}
									type="button"
									onClick={() => setRating(r.value)}
									className="mono text-[10px] py-1.5 px-3 border transition-colors cursor-pointer"
									style={{
										background: active ? "var(--surface-alt)" : "transparent",
										color: active ? "var(--ink-inverse)" : "var(--ink-muted)",
										borderColor: active ? "var(--accent)" : "var(--rule)",
										fontWeight: active ? 700 : 500,
									}}
								>
									{r.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Details Textarea */}
				<div className="flex flex-col gap-2">
					<label
						htmlFor="feedback-message"
						className="mono text-[11px] font-semibold uppercase tracking-wider"
						style={{ color: "var(--ink)" }}
					>
						FEEDBACK DETAILS *
					</label>
					<textarea
						id="feedback-message"
						required
						rows={5}
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Describe your suggestion, format specification, or issue details..."
						className="mono text-xs p-3 border w-full outline-none resize-y"
						style={{
							background: "var(--ground)",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
					/>
				</div>

				{/* Optional Email */}
				<div className="flex flex-col gap-2">
					<label
						htmlFor="feedback-email"
						className="mono text-[11px] font-semibold uppercase tracking-wider"
						style={{ color: "var(--ink)" }}
					>
						YOUR EMAIL (OPTIONAL FOR FOLLOW-UP)
					</label>
					<input
						id="feedback-email"
						type="email"
						value={contactEmail}
						onChange={(e) => setContactEmail(e.target.value)}
						placeholder="user@example.com"
						className="mono text-xs p-3 border w-full outline-none"
						style={{
							background: "var(--ground)",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
					/>
				</div>

				{/* Diagnostic Options */}
				<div
					className="flex flex-col gap-2 p-3 border"
					style={{
						borderColor: "var(--rule)",
						background: "var(--ground)",
					}}
				>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={attachDiagnostics}
							onChange={(e) => setAttachDiagnostics(e.target.checked)}
							className="cursor-pointer"
						/>
						<span className="mono text-[11px]" style={{ color: "var(--ink)" }}>
							ATTACH BROWSER & SYSTEM DIAGNOSTICS (WASM, SIMD, MEMORY)
						</span>
					</label>

					{recentErrorDetected && (
						<label
							className="flex items-start gap-2 cursor-pointer mt-1 pt-1 border-t"
							style={{ borderColor: "var(--rule)" }}
						>
							<input
								type="checkbox"
								checked={attachRecentError}
								onChange={(e) => setAttachRecentError(e.target.checked)}
								className="mt-0.5 cursor-pointer"
							/>
							<div className="flex flex-col">
								<span
									className="mono text-[10px] font-bold"
									style={{ color: "var(--accent)" }}
								>
									ATTACH RECENT CONVERSION ANOMALY:
								</span>
								<span
									className="mono text-[10px]"
									style={{ color: "var(--ink-muted)" }}
								>
									{recentErrorDetected}
								</span>
							</div>
						</label>
					)}
				</div>

				{/* Action Buttons */}
				<div
					className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t"
					style={{ borderColor: "var(--rule)" }}
				>
					<button
						type="submit"
						disabled={submitting || !message.trim()}
						className="mono text-xs font-bold py-2.5 px-6 border w-full sm:w-auto transition-opacity cursor-pointer text-center"
						style={{
							background: "var(--ink)",
							color: "var(--surface)",
							borderColor: "var(--ink)",
							opacity: submitting || !message.trim() ? 0.5 : 1,
						}}
					>
						{submitting
							? "TRANSMITTING..."
							: isOnline
								? "SUBMIT FEEDBACK ➔"
								: "SAVE TO QUEUE (OFFLINE) ➔"}
					</button>

					<a
						href={githubIssueUrl}
						target="_blank"
						rel="noreferrer"
						className="mono text-[11px] py-2 px-3 border transition-colors text-center w-full sm:w-auto hover:underline"
						style={{
							color: "var(--ink-muted)",
							borderColor: "var(--rule)",
						}}
					>
						FILE ON GITHUB ISSUES ↗
					</a>
				</div>
			</form>
		</div>
	);
}
