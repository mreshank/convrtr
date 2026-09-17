"use client";

import { useState } from "react";
import {
	type DispatchResult,
	dispatchFormSubmission,
} from "@/lib/form-dispatch";
import {
	formatDiagnosticMarkdown,
	runSystemDiagnostics,
} from "@/lib/system-diagnostics";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

const TOPICS = [
	{ id: "general", label: "GENERAL INQUIRY" },
	{ id: "security", label: "SECURITY ADVISORY" },
	{ id: "bug", label: "TECHNICAL DEFECT" },
	{ id: "engine", label: "CUSTOM ENGINE" },
	{ id: "collaboration", label: "COLLABORATION" },
] as const;

export function ContactClient() {
	const { isOnline } = useNetworkStatus();
	const [topic, setTopic] = useState<string>("general");
	const [name, setName] = useState<string>("");
	const [email, setEmail] = useState<string>("");
	const [subject, setSubject] = useState<string>("");
	const [message, setMessage] = useState<string>("");
	const [attachDiagnostics, setAttachDiagnostics] = useState<boolean>(true);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(
		null,
	);
	const [emailCopied, setEmailCopied] = useState<boolean>(false);
	const [ticketCopied, setTicketCopied] = useState<boolean>(false);

	const handleCopyEmail = async () => {
		try {
			await navigator.clipboard.writeText("contact@mreshank.com");
			setEmailCopied(true);
			setTimeout(() => setEmailCopied(false), 2000);
		} catch {
			// Clipboard API unavailable
		}
	};

	const handleCopyTicket = async () => {
		if (!dispatchResult?.ticketMarkdown) return;
		try {
			await navigator.clipboard.writeText(dispatchResult.ticketMarkdown);
			setTicketCopied(true);
			setTimeout(() => setTicketCopied(false), 2000);
		} catch {
			// Clipboard API unavailable
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!message.trim() || !email.trim()) return;

		setSubmitting(true);

		let diagnosticMd = "";
		if (attachDiagnostics) {
			const report = runSystemDiagnostics();
			diagnosticMd = formatDiagnosticMarkdown(report);
		}

		const result = await dispatchFormSubmission({
			type: "contact",
			topicOrCategory: topic,
			name: name.trim() || undefined,
			email: email.trim(),
			subject: subject.trim() || undefined,
			message: message.trim(),
			diagnosticReportMarkdown: diagnosticMd || undefined,
		});

		setDispatchResult(result);
		setSubmitting(false);
	};

	return (
		<div className="w-full max-w-4xl mx-auto py-8 flex flex-col gap-8">
			{/* DIRECT CHANNELS STRIP */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Direct Email Card */}
				<div
					className="border p-5 flex flex-col justify-between gap-4"
					style={{
						background: "var(--surface)",
						borderColor: "var(--rule)",
					}}
				>
					<div className="flex flex-col gap-1">
						<span
							className="mono text-[10px] tracking-wider uppercase"
							style={{ color: "var(--ink-muted)" }}
						>
							DIRECT MAINTAINER INBOX
						</span>
						<span
							className="mono text-sm md:text-base font-bold tracking-tight"
							style={{ color: "var(--ink)" }}
						>
							contact@mreshank.com
						</span>
						<p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
							PGP-compatible address for private disclosures, project
							integrations, and developer correspondence.
						</p>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyEmail}
							className="mono text-[11px] font-bold py-1.5 px-3 border transition-colors cursor-pointer"
							style={{
								background: emailCopied ? "var(--accent)" : "var(--ink)",
								color: emailCopied ? "var(--ground)" : "var(--surface)",
								borderColor: emailCopied ? "var(--accent)" : "var(--ink)",
							}}
						>
							{emailCopied ? "COPIED TO CLIPBOARD" : "COPY ADDRESS"}
						</button>
						<a
							href="mailto:contact@mreshank.com?subject=[CONVRTR]%20Project%20Inquiry"
							className="mono text-[11px] py-1.5 px-3 border transition-colors cursor-pointer text-center"
							style={{
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
						>
							LAUNCH CLIENT ↗
						</a>
					</div>
				</div>

				{/* GitHub Channels Card */}
				<div
					className="border p-5 flex flex-col justify-between gap-4"
					style={{
						background: "var(--surface)",
						borderColor: "var(--rule)",
					}}
				>
					<div className="flex flex-col gap-1">
						<span
							className="mono text-[10px] tracking-wider uppercase"
							style={{ color: "var(--ink-muted)" }}
						>
							PUBLIC ENGINEERING CHANNELS
						</span>
						<span
							className="mono text-sm md:text-base font-bold tracking-tight"
							style={{ color: "var(--ink)" }}
						>
							github.com/mreshank/convrtr
						</span>
						<p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
							Transparent issue tracker, format proposals, bug telemetry, and
							community releases.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<a
							href="https://github.com/mreshank/convrtr/issues"
							target="_blank"
							rel="noreferrer"
							className="mono text-[11px] font-bold py-1.5 px-3 border transition-colors cursor-pointer"
							style={{
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
						>
							ALL ISSUES ↗
						</a>
						<a
							href="https://github.com/mreshank/convrtr/issues/new?title=%5BBUG%5D%20"
							target="_blank"
							rel="noreferrer"
							className="mono text-[11px] py-1.5 px-3 border transition-colors cursor-pointer text-center"
							style={{
								color: "var(--ink-muted)",
								borderColor: "var(--rule)",
							}}
						>
							FILE BUG ↗
						</a>
						<a
							href="https://github.com/mreshank"
							target="_blank"
							rel="noreferrer"
							className="mono text-[11px] py-1.5 px-3 border transition-colors cursor-pointer text-center"
							style={{
								color: "var(--ink-muted)",
								borderColor: "var(--rule)",
							}}
						>
							MAINTAINER PROFILE ↗
						</a>
					</div>
				</div>
			</div>

			{/* INTERACTIVE FORM CONTAINER */}
			{dispatchResult ? (
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
								COMMUNICATION DISPATCH STATUS
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
								}}
							>
								{dispatchResult.mode === "online_transmitted"
									? "TRANSMISSION CONFIRMED"
									: dispatchResult.mode === "offline_queued"
										? "OFFLINE // CACHED LOCALLY"
										: "NETWORK FALLBACK READY"}
							</span>
						</div>
						<h2
							className="text-xl md:text-2xl font-bold tracking-tight uppercase mt-2"
							style={{ color: "var(--ink)" }}
						>
							{dispatchResult.mode === "online_transmitted"
								? "MESSAGE TRANSMITTED"
								: "INQUIRY RECORDED LOCALLY"}
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
									background: ticketCopied ? "var(--accent)" : "var(--ink)",
									color: ticketCopied ? "var(--ground)" : "var(--surface)",
									borderColor: ticketCopied ? "var(--accent)" : "var(--ink)",
								}}
							>
								{ticketCopied
									? "COPIED TO CLIPBOARD"
									: "COPY TICKET (MARKDOWN) ➔"}
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
						</div>
					</div>

					<div className="pt-4 border-t" style={{ borderColor: "var(--rule)" }}>
						<button
							type="button"
							onClick={() => setDispatchResult(null)}
							className="mono text-[11px] py-1.5 px-3 border transition-colors cursor-pointer hover:underline"
							style={{
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
						>
							SEND ANOTHER MESSAGE ➔
						</button>
					</div>
				</div>
			) : (
				<form
					onSubmit={handleSubmit}
					className="border p-6 md:p-8 flex flex-col gap-6"
					style={{
						background: "var(--surface)",
						borderColor: "var(--rule)",
					}}
				>
					<div
						className="flex items-center justify-between border-b pb-4"
						style={{ borderColor: "var(--rule)" }}
					>
						<div>
							<span
								className="mono text-[10px] tracking-wider uppercase block"
								style={{ color: "var(--ink-muted)" }}
							>
								PROJECT COMMUNICATION PORTAL
							</span>
							<h2
								className="text-xl md:text-2xl font-bold tracking-tight uppercase mt-1"
								style={{ color: "var(--ink)" }}
							>
								TRANSMIT AN INQUIRY
							</h2>
						</div>

						<span
							className="mono text-[9px] tracking-wider uppercase px-2 py-1 border hidden sm:inline-block"
							style={{
								color: isOnline ? "var(--accent)" : "var(--ink-muted)",
								borderColor: isOnline ? "var(--accent)" : "var(--rule)",
							}}
						>
							{isOnline ? "ONLINE // DIRECT POST" : "OFFLINE // LOCAL QUEUE"}
						</span>
					</div>

					{/* Topic Selector */}
					<div className="flex flex-col gap-2">
						<span
							className="mono text-[11px] font-semibold uppercase tracking-wider"
							style={{ color: "var(--ink)" }}
						>
							INQUIRY TOPIC
						</span>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
							{TOPICS.map((t) => {
								const active = topic === t.id;
								return (
									<button
										key={t.id}
										type="button"
										onClick={() => setTopic(t.id)}
										className="mono text-[10px] py-2 px-2 border text-center transition-colors cursor-pointer"
										style={{
											background: active ? "var(--ink)" : "transparent",
											color: active ? "var(--surface)" : "var(--ink)",
											borderColor: active ? "var(--ink)" : "var(--rule)",
											fontWeight: active ? 700 : 500,
										}}
									>
										{t.label}
									</button>
								);
							})}
						</div>
					</div>

					{/* Name & Email inputs */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="flex flex-col gap-2">
							<label
								htmlFor="contact-name"
								className="mono text-[11px] font-semibold uppercase tracking-wider"
								style={{ color: "var(--ink)" }}
							>
								YOUR NAME / CALL-SIGN (OPTIONAL)
							</label>
							<input
								id="contact-name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Sender or organization name"
								className="mono text-xs p-3 border w-full outline-none"
								style={{
									background: "var(--ground)",
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<label
								htmlFor="contact-email"
								className="mono text-[11px] font-semibold uppercase tracking-wider"
								style={{ color: "var(--ink)" }}
							>
								RETURN EMAIL *
							</label>
							<input
								id="contact-email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="user@example.com"
								className="mono text-xs p-3 border w-full outline-none"
								style={{
									background: "var(--ground)",
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
							/>
						</div>
					</div>

					{/* Subject */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="contact-subject"
							className="mono text-[11px] font-semibold uppercase tracking-wider"
							style={{ color: "var(--ink)" }}
						>
							SUBJECT (OPTIONAL)
						</label>
						<input
							id="contact-subject"
							type="text"
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							placeholder="Brief summary of inquiry"
							className="mono text-xs p-3 border w-full outline-none"
							style={{
								background: "var(--ground)",
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
						/>
					</div>

					{/* Message */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="contact-message"
							className="mono text-[11px] font-semibold uppercase tracking-wider"
							style={{ color: "var(--ink)" }}
						>
							MESSAGE DETAILS *
						</label>
						<textarea
							id="contact-message"
							required
							rows={6}
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Provide detailed information regarding your inquiry, custom codec needs, or security notice..."
							className="mono text-xs p-3 border w-full outline-none resize-y"
							style={{
								background: "var(--ground)",
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
						/>
					</div>

					{/* Diagnostics attachment */}
					<div
						className="flex items-center gap-2 p-3 border"
						style={{
							borderColor: "var(--rule)",
							background: "var(--ground)",
						}}
					>
						<input
							id="contact-diagnostics"
							type="checkbox"
							checked={attachDiagnostics}
							onChange={(e) => setAttachDiagnostics(e.target.checked)}
							className="cursor-pointer"
						/>
						<label
							htmlFor="contact-diagnostics"
							className="mono text-[11px] cursor-pointer"
							style={{ color: "var(--ink)" }}
						>
							INCLUDE BROWSER ENVIRONMENT & WASM DIAGNOSTIC TELEMETRY
						</label>
					</div>

					{/* Submit button */}
					<div
						className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t"
						style={{ borderColor: "var(--rule)" }}
					>
						<button
							type="submit"
							disabled={submitting || !message.trim() || !email.trim()}
							className="mono text-xs font-bold py-2.5 px-6 border w-full sm:w-auto transition-opacity cursor-pointer text-center"
							style={{
								background: "var(--ink)",
								color: "var(--surface)",
								borderColor: "var(--ink)",
								opacity:
									submitting || !message.trim() || !email.trim() ? 0.5 : 1,
							}}
						>
							{submitting
								? "TRANSMITTING..."
								: isOnline
									? "TRANSMIT INQUIRY ➔"
									: "QUEUE INQUIRY (OFFLINE) ➔"}
						</button>

						<a
							href="mailto:contact@mreshank.com"
							className="mono text-[11px] py-2 px-3 border transition-colors text-center w-full sm:w-auto hover:underline"
							style={{
								color: "var(--ink-muted)",
								borderColor: "var(--rule)",
							}}
						>
							MAIL DIRECTLY VIA CLIENT ↗
						</a>
					</div>
				</form>
			)}
		</div>
	);
}
