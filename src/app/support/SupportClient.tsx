"use client";

import { useCallback, useEffect, useState } from "react";
import { getHistory } from "@/core/history/store";
import {
	type DispatchResult,
	dispatchFormSubmission,
} from "@/lib/form-dispatch";
import {
	type DiagnosticReport,
	formatDiagnosticMarkdown,
	runSystemDiagnostics,
} from "@/lib/system-diagnostics";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

const TROUBLESHOOTING_GUIDES = [
	{
		id: "oom_stalled",
		title: "CONVERSION STALLED AT 99% OR BROWSER OUT OF MEMORY",
		eyebrow: "MEMORY EXHAUSTION",
		summary:
			"Heavy video encodes or massive batch conversions exceeding WebAssembly linear memory allocations.",
		solutions: [
			"WebAssembly operates within a 32-bit linear memory space (2GB to 4GB depending on browser engine). Gigabyte-scale videos can exhaust available heap memory during final muxing.",
			"Close memory-intensive background tabs (e.g. streaming video, dense web applications) to free browser tab memory.",
			"For batches with more than 50 items, convert files in smaller batches (10-20 files at a time) to allow Web Worker garbage collection to sweep between tasks.",
			"For ultra-high-resolution images (8K+), consider running a downscale pass before multi-pass compression.",
		],
	},
	{
		id: "codec_missing",
		title: "CODEC MISSING OR UNSUPPORTED FORMAT IN BROWSER",
		eyebrow: "CONTAINER & CODEC LIMITS",
		summary:
			"Certain proprietary formats require WebCodecs hardware bridges or fallback FFmpeg WASM modules.",
		solutions: [
			"Verify that 'Hardware Acceleration' is enabled in your browser settings (chrome://settings/system or edge://settings/system). Without hardware acceleration, WebCodecs GPU stream encoding is disabled.",
			"Certain patent-encumbered codecs (such as HEVC/H.265 or Dolby AC-3) may not be natively decodable on all Linux or open-source Chromium builds without platform media packs.",
			"convrtr includes 147 pure WebAssembly fallback engines. If a native codec is missing, ensure offline WASM asset caching is not blocked by strict browser ad-blockers or privacy extensions.",
		],
	},
	{
		id: "threading_coop",
		title: "SHAREDARRAYBUFFER / MULTI-THREADING STATUS WARNING",
		eyebrow: "ISOLATION HEADERS",
		summary:
			"Cross-origin isolation required for SharedArrayBuffer and multi-threaded Web Workers.",
		solutions: [
			"Multi-threaded codecs (AVIF, JPEG XL, FFmpeg multi-core) require Cross-Origin Isolation headers (COOP: same-origin and COEP: require-corp) to prevent Spectre timing attacks.",
			"If running locally or through certain iframe environments, SharedArrayBuffer may be blocked by browser security policies.",
			"convrtr automatically detects this and falls back to deterministic single-threaded Web Workers. Conversions will still complete with full fidelity, though execution time may be longer.",
		],
	},
	{
		id: "slow_conversions",
		title: "SLOW PROCESSING ON HIGH-RESOLUTION MEDIA",
		eyebrow: "COMPUTE ACCELERATION",
		summary:
			"CPU-bound SIMD processing on massive raw pixel buffers or lossless audio transcode matrices.",
		solutions: [
			"Check the Live System Diagnostic Suite below to ensure 'WASM SIMD 128-BIT VECTORIZATION' reports PASS. SIMD delivers up to a 400% speedup on AVIF, WebP, and audio resamplers.",
			"On laptops, check battery and power management modes. Operating in extreme power-saver mode can throttle CPU clock speeds down to 800MHz, severely slowing local in-browser compilation.",
			"Connect your device to power when transcoding multi-hour audio files or 4K video clips.",
		],
	},
	{
		id: "extension_shortcuts",
		title: "CHROME EXTENSION SHORTCUTS OR SIDE PANEL NOT RESPONDING",
		eyebrow: "EXTENSION RUNTIME",
		summary:
			"Manifest V3 permission policies, tab restrictions, or keyboard shortcut key conflicts.",
		solutions: [
			"Open chrome://extensions/shortcuts in your browser address bar to verify that Command+Shift+Comma (Quick Popup) and Command+Shift+S (Viewport Capture) are not hijacked by another extension.",
			"Chrome security prohibits content scripts and side panel injections on internal browser pages (e.g. chrome://*, chrome-extension://*, and Chrome Web Store pages). Test on standard web pages.",
			"If permissions were recently changed, reload the convrtr extension via the toggle switch in chrome://extensions.",
		],
	},
	{
		id: "offline_pwa",
		title: "OFFLINE PWA OPERATION & CODEC CACHING",
		eyebrow: "SERVICE WORKER RUNTIME",
		summary:
			"How convrtr executes without an internet connection and what features require connectivity.",
		solutions: [
			"convrtr generates a dedicated Service Worker (out/sw.js) that pre-caches the application shell and conversion engines upon initial visit.",
			"All 200 conversion tools execute 100% locally in your browser memory and never require internet connectivity.",
			"External communication features (Feedback submission, Contact form dispatch) require internet connectivity. When offline, submissions are cached in local browser storage with 1-click mailto and clipboard export fallbacks.",
		],
	},
];

export function SupportClient() {
	const { isOnline } = useNetworkStatus();
	const [diagnostics, setDiagnostics] = useState<DiagnosticReport | null>(null);
	const [expandedFaq, setExpandedFaq] = useState<Record<string, boolean>>({
		oom_stalled: true,
	});
	const [filterTerm, setFilterTerm] = useState<string>("");

	// Ticket generator state
	const [issueTopic, setIssueTopic] = useState<string>("conversion_error");
	const [subject, setSubject] = useState<string>("");
	const [description, setDescription] = useState<string>("");
	const [contactEmail, setContactEmail] = useState<string>("");
	const [attachDiagnostics, setAttachDiagnostics] = useState<boolean>(true);
	const [recentErrorDetected, setRecentErrorDetected] = useState<string | null>(
		null,
	);
	const [attachRecentError, setAttachRecentError] = useState<boolean>(true);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(
		null,
	);
	const [copied, setCopied] = useState<boolean>(false);
	const [isAuditing, setIsAuditing] = useState<boolean>(false);

	// Run initial diagnostics & scan history for recent anomalies
	const executeAudit = useCallback(() => {
		setIsAuditing(true);
		setTimeout(() => {
			const report = runSystemDiagnostics();
			setDiagnostics(report);
			setIsAuditing(false);
		}, 300);
	}, []);

	useEffect(() => {
		executeAudit();

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
			// Local history unavailable
		}
	}, [executeAudit]);

	const toggleFaq = (id: string) => {
		setExpandedFaq((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	const handleCopyTicket = async () => {
		if (!dispatchResult?.ticketMarkdown) return;
		try {
			await navigator.clipboard.writeText(dispatchResult.ticketMarkdown);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard unavailable
		}
	};

	const handleGenerateTicket = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!description.trim()) return;

		setSubmitting(true);

		let diagnosticMd = "";
		if (attachDiagnostics) {
			const report = diagnostics || runSystemDiagnostics();
			diagnosticMd = formatDiagnosticMarkdown(report);
		}

		const result = await dispatchFormSubmission({
			type: "support_ticket",
			topicOrCategory: issueTopic,
			subject: subject.trim() || undefined,
			email: contactEmail.trim() || undefined,
			message: description.trim(),
			recentError:
				attachRecentError && recentErrorDetected
					? recentErrorDetected
					: undefined,
			diagnosticReportMarkdown: diagnosticMd || undefined,
		});

		setDispatchResult(result);
		setSubmitting(false);
	};

	const githubIssueUrl = `https://github.com/mreshank/convrtr/issues/new?title=${encodeURIComponent(
		`[SUPPORT] ${subject || description.slice(0, 50) || "Issue Report"}`,
	)}&body=${encodeURIComponent(
		`### Topic\n${issueTopic}\n\n### Issue Description\n${description}\n\n${recentErrorDetected ? `### Recent Conversion Anomaly\n\`\`\`\n${recentErrorDetected}\n\`\`\`\n\n` : ""}${diagnostics ? `${formatDiagnosticMarkdown(diagnostics)}\n\n` : ""}*Generated via convrtr support center*`,
	)}`;

	return (
		<div className="w-full max-w-4xl mx-auto py-8 flex flex-col gap-12">
			{/* SECTION 1: SYSTEM READINESS TELEMETRY STRIP */}
			<div
				className="border p-6 flex flex-col gap-4"
				style={{
					background: "var(--surface)",
					borderColor: "var(--rule)",
				}}
			>
				<div
					className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4"
					style={{ borderColor: "var(--rule)" }}
				>
					<div>
						<span
							className="mono text-[10px] tracking-wider uppercase block"
							style={{ color: "var(--ink-muted)" }}
						>
							LIVE HARDWARE & CODEC ENVIRONMENT
						</span>
						<h2
							className="text-xl md:text-2xl font-bold tracking-tight uppercase mt-1"
							style={{ color: "var(--ink)" }}
						>
							SYSTEM READINESS TELEMETRY
						</h2>
					</div>

					<button
						type="button"
						onClick={executeAudit}
						disabled={isAuditing}
						className="mono text-xs font-bold py-2 px-4 border transition-colors cursor-pointer text-center"
						style={{
							background: isAuditing ? "var(--ground)" : "var(--ink)",
							color: isAuditing ? "var(--ink-muted)" : "var(--surface)",
							borderColor: "var(--ink)",
						}}
					>
						{isAuditing ? "SCANNING ENGINE..." : "RUN SYSTEM AUDIT ➔"}
					</button>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div
						className="flex flex-col p-3 border"
						style={{ borderColor: "var(--rule)", background: "var(--ground)" }}
					>
						<span
							className="mono text-[10px]"
							style={{ color: "var(--ink-muted)" }}
						>
							OVERALL READINESS
						</span>
						<span
							className="mono text-xs font-bold uppercase mt-1"
							style={{
								color:
									diagnostics?.overallReadiness === "OPTIMAL"
										? "var(--accent)"
										: "var(--ink)",
							}}
						>
							{diagnostics?.overallReadiness || "ANALYZING..."}
						</span>
					</div>

					<div
						className="flex flex-col p-3 border"
						style={{ borderColor: "var(--rule)", background: "var(--ground)" }}
					>
						<span
							className="mono text-[10px]"
							style={{ color: "var(--ink-muted)" }}
						>
							CONNECTIVITY
						</span>
						<span
							className="mono text-xs font-bold uppercase mt-1"
							style={{
								color: isOnline ? "var(--accent)" : "var(--ink-muted)",
							}}
						>
							{isOnline ? "ONLINE // CONNECTED" : "OFFLINE // PWA ACTIVE"}
						</span>
					</div>

					<div
						className="flex flex-col p-3 border"
						style={{ borderColor: "var(--rule)", background: "var(--ground)" }}
					>
						<span
							className="mono text-[10px]"
							style={{ color: "var(--ink-muted)" }}
						>
							CPU THREAD POOL
						</span>
						<span
							className="mono text-xs font-bold uppercase mt-1"
							style={{ color: "var(--ink)" }}
						>
							{diagnostics?.environment.hardwareConcurrency || 1} LOGICAL CORES
						</span>
					</div>

					<div
						className="flex flex-col p-3 border"
						style={{ borderColor: "var(--rule)", background: "var(--ground)" }}
					>
						<span
							className="mono text-[10px]"
							style={{ color: "var(--ink-muted)" }}
						>
							ESTIMATED RAM
						</span>
						<span
							className="mono text-xs font-bold uppercase mt-1"
							style={{ color: "var(--ink)" }}
						>
							{diagnostics?.environment.deviceMemoryGb
								? `${diagnostics.environment.deviceMemoryGb} GB ALLOCATED`
								: "UNRESTRICTED"}
						</span>
					</div>
				</div>

				{/* 8-Point Live Diagnostic Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
					{diagnostics?.items.map((item) => (
						<div
							key={item.id}
							className="border p-3.5 flex flex-col justify-between gap-2"
							style={{
								borderColor: "var(--rule)",
								background: "var(--ground)",
							}}
						>
							<div className="flex items-center justify-between">
								<span
									className="mono text-[11px] font-bold tracking-tight"
									style={{ color: "var(--ink)" }}
								>
									{item.name}
								</span>
								<span
									className="mono text-[10px] font-bold px-2 py-0.5 border"
									style={{
										color:
											item.status === "PASS"
												? "var(--accent)"
												: "var(--ink-muted)",
										borderColor:
											item.status === "PASS" ? "var(--accent)" : "var(--rule)",
										background: "transparent",
									}}
								>
									{item.status}
								</span>
							</div>
							<span
								className="mono text-[10px]"
								style={{ color: "var(--ink-muted)" }}
							>
								{item.spec}
							</span>
							<p
								className="text-xs mt-0.5"
								style={{ color: "var(--ink-muted)" }}
							>
								{item.description}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* SECTION 2: INTERACTIVE TROUBLESHOOTING GUIDE */}
			<div className="flex flex-col gap-4">
				<div
					className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3"
					style={{ borderColor: "var(--rule)" }}
				>
					<div>
						<span
							className="mono text-[10px] tracking-wider uppercase block"
							style={{ color: "var(--ink-muted)" }}
						>
							ACTIONABLE SOLUTIONS & RESOLUTIONS
						</span>
						<h2
							className="text-xl md:text-2xl font-bold tracking-tight uppercase mt-1"
							style={{ color: "var(--ink)" }}
						>
							INTERACTIVE TROUBLESHOOTING GUIDE
						</h2>
					</div>

					<input
						type="search"
						value={filterTerm}
						onChange={(e) => setFilterTerm(e.target.value)}
						placeholder="FILTER TOPICS (MEMORY, CODEC, SIMD)..."
						className="mono text-xs p-2.5 border outline-none w-full sm:w-80"
						style={{
							background: "var(--ground)",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
					/>
				</div>

				<div className="flex flex-col gap-3">
					{TROUBLESHOOTING_GUIDES.filter((guide) => {
						if (!filterTerm.trim()) return true;
						const term = filterTerm.toLowerCase();
						return (
							guide.title.toLowerCase().includes(term) ||
							guide.eyebrow.toLowerCase().includes(term) ||
							guide.summary.toLowerCase().includes(term) ||
							guide.solutions.some((s) => s.toLowerCase().includes(term))
						);
					}).map((guide) => {
						const isOpen = Boolean(expandedFaq[guide.id]);
						return (
							<div
								key={guide.id}
								className="border"
								style={{
									borderColor: isOpen ? "var(--rule-strong)" : "var(--rule)",
									background: "var(--surface)",
								}}
							>
								<button
									type="button"
									onClick={() => toggleFaq(guide.id)}
									className="w-full p-4 md:p-5 flex items-center justify-between text-left cursor-pointer transition-colors"
								>
									<div className="flex flex-col gap-1 pr-4">
										<span
											className="mono text-[10px] tracking-wider uppercase"
											style={{ color: "var(--ink-muted)" }}
										>
											{guide.eyebrow}
										</span>
										<span
											className="mono text-xs md:text-sm font-bold tracking-tight"
											style={{ color: "var(--ink)" }}
										>
											{guide.title}
										</span>
									</div>
									<span
										className="mono text-sm font-bold"
										style={{ color: "var(--ink-muted)" }}
									>
										{isOpen ? "▲" : "▼"}
									</span>
								</button>

								{isOpen && (
									<div
										className="px-4 pb-5 md:px-5 border-t pt-4 flex flex-col gap-3"
										style={{ borderColor: "var(--rule)" }}
									>
										<p className="text-xs" style={{ color: "var(--ink)" }}>
											{guide.summary}
										</p>
										<div className="flex flex-col gap-2">
											<span
												className="mono text-[10px] uppercase font-semibold tracking-wider"
												style={{ color: "var(--accent)" }}
											>
												DIAGNOSTIC PROTOCOL & RESOLUTION:
											</span>
											<ul
												className="list-disc pl-5 flex flex-col gap-1.5 text-xs"
												style={{ color: "var(--ink-muted)" }}
											>
												{guide.solutions.map((sol) => (
													<li key={sol}>{sol}</li>
												))}
											</ul>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* SECTION 3: 1-CLICK SUPPORT TICKET GENERATOR */}
			<div
				className="border p-6 md:p-8 flex flex-col gap-6"
				style={{
					background: "var(--surface)",
					borderColor: "var(--rule)",
				}}
			>
				<div className="border-b pb-4" style={{ borderColor: "var(--rule)" }}>
					<span
						className="mono text-[10px] tracking-wider uppercase block"
						style={{ color: "var(--ink-muted)" }}
					>
						ENGINEERING TRIAGE DISPATCH
					</span>
					<h2
						className="text-xl md:text-2xl font-bold tracking-tight uppercase mt-1"
						style={{ color: "var(--ink)" }}
					>
						1-CLICK SUPPORT TICKET GENERATOR
					</h2>
					<p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
						Compiles your browser&apos;s exact hardware telemetry, WebAssembly
						SIMD status, and conversion error log into a ready-to-resolve
						support package.
					</p>
				</div>

				{dispatchResult ? (
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<span
								className="mono text-xs font-bold"
								style={{ color: "var(--accent)" }}
							>
								{dispatchResult.mode === "online_transmitted"
									? "TICKET TRANSMITTED TO ENGINEERING TEAM"
									: "TICKET COMPILED & QUEUED LOCALLY"}
							</span>
							<span
								className="mono text-[10px] px-2 py-0.5 border"
								style={{
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
							>
								{dispatchResult.mode}
							</span>
						</div>
						<p className="text-xs mono" style={{ color: "var(--ink-muted)" }}>
							{dispatchResult.message}
						</p>

						<div className="flex flex-wrap gap-2 pt-2">
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

						<div
							className="pt-4 border-t"
							style={{ borderColor: "var(--rule)" }}
						>
							<button
								type="button"
								onClick={() => setDispatchResult(null)}
								className="mono text-[11px] py-1.5 px-3 border transition-colors cursor-pointer hover:underline"
								style={{
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
							>
								CREATE ANOTHER TICKET ➔
							</button>
						</div>
					</div>
				) : (
					<form onSubmit={handleGenerateTicket} className="flex flex-col gap-6">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<label
									htmlFor="ticket-topic"
									className="mono text-[11px] font-semibold uppercase tracking-wider"
									style={{ color: "var(--ink)" }}
								>
									ISSUE TOPIC
								</label>
								<select
									id="ticket-topic"
									value={issueTopic}
									onChange={(e) => setIssueTopic(e.target.value)}
									className="mono text-xs p-3 border outline-none cursor-pointer"
									style={{
										background: "var(--ground)",
										color: "var(--ink)",
										borderColor: "var(--rule)",
									}}
								>
									<option value="conversion_error">
										CONVERSION FAILURE / CRASH
									</option>
									<option value="performance">
										PERFORMANCE / HIGH LATENCY
									</option>
									<option value="codec_request">
										UNSUPPORTED CODEC / CONTAINER
									</option>
									<option value="extension">CHROME EXTENSION ANOMALY</option>
									<option value="other">OTHER TECHNICAL INQUIRY</option>
								</select>
							</div>

							<div className="flex flex-col gap-2">
								<label
									htmlFor="ticket-email"
									className="mono text-[11px] font-semibold uppercase tracking-wider"
									style={{ color: "var(--ink)" }}
								>
									YOUR EMAIL (FOR ENGINEERING RESPONSE)
								</label>
								<input
									id="ticket-email"
									type="email"
									value={contactEmail}
									onChange={(e) => setContactEmail(e.target.value)}
									placeholder="user@example.com"
									className="mono text-xs p-3 border outline-none"
									style={{
										background: "var(--ground)",
										color: "var(--ink)",
										borderColor: "var(--rule)",
									}}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<label
								htmlFor="ticket-subject"
								className="mono text-[11px] font-semibold uppercase tracking-wider"
								style={{ color: "var(--ink)" }}
							>
								BRIEF SUMMARY
							</label>
							<input
								id="ticket-subject"
								type="text"
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
								placeholder="e.g. AVIF decode failed on 48-megapixel image"
								className="mono text-xs p-3 border outline-none"
								style={{
									background: "var(--ground)",
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<label
								htmlFor="ticket-description"
								className="mono text-[11px] font-semibold uppercase tracking-wider"
								style={{ color: "var(--ink)" }}
							>
								TECHNICAL DETAILS & REPRODUCTION STEPS *
							</label>
							<textarea
								id="ticket-description"
								required
								rows={5}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Describe the input file format, tool used, expected outcome, and what occurred..."
								className="mono text-xs p-3 border outline-none resize-y"
								style={{
									background: "var(--ground)",
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
							/>
						</div>

						{/* Telemetry and error attachment triggers */}
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
								<span
									className="mono text-[11px]"
									style={{ color: "var(--ink)" }}
								>
									ATTACH FULL BROWSER & SYSTEM TELEMETRY (WASM, SIMD, MEMORY,
									OS)
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
											ATTACH RECENT LOCAL CONVERSION ERROR:
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

						{/* Actions */}
						<div
							className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t"
							style={{ borderColor: "var(--rule)" }}
						>
							<button
								type="submit"
								disabled={submitting || !description.trim()}
								className="mono text-xs font-bold py-2.5 px-6 border w-full sm:w-auto transition-opacity cursor-pointer text-center"
								style={{
									background: "var(--ink)",
									color: "var(--surface)",
									borderColor: "var(--ink)",
									opacity: submitting || !description.trim() ? 0.5 : 1,
								}}
							>
								{submitting
									? "TRANSMITTING..."
									: isOnline
										? "SUBMIT SUPPORT TICKET ➔"
										: "QUEUE SUPPORT TICKET (OFFLINE) ➔"}
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
				)}
			</div>
		</div>
	);
}
