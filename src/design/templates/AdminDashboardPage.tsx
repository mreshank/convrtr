"use client";

import { useUser } from "@clerk/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
	hasLocalAdminOverride,
	isSuperAdminEmail,
	isSuperAdminUser,
	SUPER_ADMIN_EMAILS,
	verifyAdminPasskey,
} from "@/lib/admin-auth";
import {
	type BroadcastLevel,
	type BroadcastMessage,
	type BroadcastTarget,
	type BroadcastType,
	createBroadcast,
	deleteBroadcast,
	getBroadcasts,
	toggleBroadcastActive,
} from "@/lib/broadcasts";
import {
	deleteSubscriber,
	exportSubscribersCSV,
	exportSubscribersJSON,
	getSubscribers,
	type Subscriber,
	type SubscriptionChannel,
	subscribeUser,
	toggleSubscriberStatus,
} from "@/lib/subscriptions";

type AdminTab =
	| "kpis"
	| "subscribers"
	| "broadcasts"
	| "extension"
	| "campaigns"
	| "audit";

export function AdminDashboardPage() {
	const { isSignedIn, user, isLoaded } = useUser();
	const [localOverride, setLocalOverride] = useState(false);
	const [passkeyInput, setPasskeyInput] = useState("");
	const [activeTab, setActiveTab] = useState<AdminTab>("kpis");

	// Subscribers state
	const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
	const [subSearch, setSubSearch] = useState("");
	const [subChannelFilter, setSubChannelFilter] = useState<string>("all");
	const [newSubEmail, setNewSubEmail] = useState("");

	// Broadcasts state
	const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
	const [newBcType, setNewBcType] = useState<BroadcastType>("banner");
	const [newBcLevel, setNewBcLevel] = useState<BroadcastLevel>("accent");
	const [newBcTarget, setNewBcTarget] = useState<BroadcastTarget>("all");
	const [newBcTitle, setNewBcTitle] = useState("");
	const [newBcContent, setNewBcContent] = useState("");
	const [newBcCtaLabel, setNewBcCtaLabel] = useState("");
	const [newBcCtaHref, setNewBcCtaHref] = useState("");

	// Email Campaign state
	const [campaignSubject, setCampaignSubject] = useState("");
	const [campaignAudience, setCampaignAudience] = useState<string>("extension");
	const [campaignBody, setCampaignBody] = useState("");
	const [campaignSecret, setCampaignSecret] = useState("");
	const [campaignSending, setCampaignSending] = useState(false);
	const [campaignStatus, setCampaignStatus] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [campaignLogs, setCampaignLogs] = useState<
		Array<{ date: string; subject: string; recipients: number }>
	>([]);

	// Audit logs state
	const [auditLogs, setAuditLogs] = useState<
		Array<{ timestamp: string; action: string; actor: string }>
	>([]);

	const refreshData = () => {
		setSubscribers(getSubscribers());
		setBroadcasts(getBroadcasts());
	};

	useEffect(() => {
		setLocalOverride(hasLocalAdminOverride());
		refreshData();
		try {
			const saved = sessionStorage.getItem("convrtr_admin_api_secret");
			if (saved) setCampaignSecret(saved);
		} catch {
			// Storage unavailable
		}

		// Initial audit log
		setAuditLogs([
			{
				timestamp: new Date().toISOString(),
				action: "Admin session initialized",
				actor: "system",
			},
		]);
	}, []);

	const isSuperAdmin =
		localOverride || (isLoaded && isSignedIn && isSuperAdminUser(user));

	const userEmail =
		user?.primaryEmailAddress?.emailAddress ??
		(localOverride ? "admin@mreshank.com [Emergency Passkey]" : "Anonymous");

	const handlePasskeySubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (verifyAdminPasskey(passkeyInput)) {
			setLocalOverride(true);
			setPasskeyInput("");
			logAction("Emergency super admin passkey verified");
		}
	};

	const logAction = (action: string) => {
		setAuditLogs((prev) => [
			{
				timestamp: new Date().toISOString(),
				action,
				actor: userEmail,
			},
			...prev.slice(0, 49),
		]);
	};

	const handleAddSubscriber = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newSubEmail.trim()) return;
		subscribeUser(newSubEmail, ["extension", "ecosystem"], "admin");
		setNewSubEmail("");
		refreshData();
		logAction(`Added subscriber: ${newSubEmail}`);
	};

	const handleDeleteSub = (id: string, email: string) => {
		deleteSubscriber(id);
		refreshData();
		logAction(`Deleted subscriber: ${email}`);
	};

	const handleToggleSub = (id: string) => {
		toggleSubscriberStatus(id);
		refreshData();
		logAction(`Toggled subscriber status: ${id}`);
	};

	const handleExportCSV = () => {
		const csv = exportSubscribersCSV();
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `convrtr-subscribers-${Date.now()}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		logAction("Exported subscribers to CSV");
	};

	const handleExportJSON = () => {
		const json = exportSubscribersJSON();
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `convrtr-subscribers-${Date.now()}.json`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		logAction("Exported subscribers to JSON");
	};

	const handleCreateBroadcast = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newBcTitle.trim() || !newBcContent.trim()) return;
		createBroadcast({
			type: newBcType,
			title: newBcTitle,
			content: newBcContent,
			level: newBcLevel,
			target: newBcTarget,
			active: true,
			cta: newBcCtaLabel
				? { label: newBcCtaLabel, href: newBcCtaHref || "#" }
				: undefined,
			dismissible: true,
		});
		setNewBcTitle("");
		setNewBcContent("");
		setNewBcCtaLabel("");
		setNewBcCtaHref("");
		refreshData();
		logAction(`Created broadcast: ${newBcTitle}`);
	};

	const handleToggleBroadcast = (id: string) => {
		toggleBroadcastActive(id);
		refreshData();
		logAction(`Toggled broadcast status: ${id}`);
	};

	const handleDeleteBroadcast = (id: string) => {
		deleteBroadcast(id);
		refreshData();
		logAction(`Deleted broadcast: ${id}`);
	};

	const handleSendCampaign = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!campaignSubject.trim() || !campaignBody.trim() || campaignSending)
			return;
		if (!campaignSecret.trim()) {
			setCampaignStatus({
				type: "error",
				text: "ADMIN_API_SECRET required — paste it below. It is kept in sessionStorage only, never committed.",
			});
			return;
		}
		const activeSubs = subscribers.filter((s) => s.status === "active");
		const targeted =
			campaignAudience === "extension"
				? activeSubs.filter((s) => s.channels.includes("extension"))
				: activeSubs;
		// Server caps at 500; slice here so the UI count matches reality.
		// Benchmark 1,420 is display-only — only real local emails can receive.
		const recipients = targeted.map((s) => s.email).slice(0, 500);
		if (recipients.length === 0) {
			setCampaignStatus({
				type: "error",
				text: "No active local subscribers match this audience. Real sends go only to local emails (benchmark count is display-only).",
			});
			return;
		}
		setCampaignSending(true);
		setCampaignStatus(null);
		try {
			try {
				sessionStorage.setItem("convrtr_admin_api_secret", campaignSecret);
			} catch {
				// Storage unavailable
			}
			const res = await fetch("/api/campaign", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: `Bearer ${campaignSecret.trim()}`,
				},
				body: JSON.stringify({
					subject: campaignSubject.trim(),
					bodyMarkdown: campaignBody.trim(),
					recipients,
				}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				sent?: number;
				error?: string;
			};
			if (!res.ok) {
				throw new Error(data.error || `Dispatch failed (${res.status})`);
			}
			const sent = typeof data.sent === "number" ? data.sent : recipients.length;
			setCampaignLogs((prev) => [
				{
					date: new Date().toISOString(),
					subject: campaignSubject,
					recipients: sent,
				},
				...prev,
			]);
			logAction(
				`Dispatched Resend campaign "${campaignSubject}" to ${sent} recipients`,
			);
			setCampaignStatus({
				type: "success",
				text: `Dispatched via Resend to ${sent} recipients.`,
			});
			setCampaignSubject("");
			setCampaignBody("");
		} catch (err) {
			const text =
				err instanceof Error ? err.message : "Dispatch failed";
			setCampaignStatus({ type: "error", text });
			logAction(`Campaign dispatch failed: ${text}`);
		} finally {
			setCampaignSending(false);
		}
	};

	// -------------------------------------------------------------
	// ACCESS DENIED VIEW
	// -------------------------------------------------------------
	if (!isSuperAdmin) {
		return (
			<div
				style={{
					maxWidth: "var(--max-width)",
					margin: "0 auto",
					padding: "var(--gap-lg) var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
				}}
			>
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule-strong)",
						backgroundColor: "var(--surface)",
						padding: "var(--gap-md)",
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
					}}
				>
					<span
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.1em",
							textTransform: "uppercase",
						}}
					>
						SECURITY CLEARANCE {"//"} 403 ACCESS DENIED
					</span>
					<h1
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: 0,
							color: "var(--ink)",
						}}
					>
						Super Admin Clearance Required
					</h1>
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--body-size)",
							lineHeight: 1.6,
							margin: 0,
							maxWidth: "65ch",
						}}
					>
						This control center is restricted exclusively to authorized security
						officers:{" "}
						<strong style={{ color: "var(--ink)" }}>
							{SUPER_ADMIN_EMAILS.join(", ")}
						</strong>
						. Unauthenticated or unauthorized access attempts are logged to the
						local security audit ledger.
					</p>

					<div
						style={{
							display: "flex",
							gap: "var(--gap-sm)",
							marginTop: "var(--space-base)",
							flexWrap: "wrap",
						}}
					>
						<Link
							href="/auth"
							style={{
								display: "inline-flex",
								alignItems: "center",
								padding: "var(--space-base) var(--gap-md)",
								borderRadius: "var(--radius-pill)",
								backgroundColor: "var(--ink)",
								color: "var(--ground)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								fontWeight: 600,
								textTransform: "uppercase",
								textDecoration: "none",
								letterSpacing: "0.08em",
							}}
						>
							Sign In with Super Admin Account ➔
						</Link>
						<Link
							href="/"
							style={{
								display: "inline-flex",
								alignItems: "center",
								padding: "var(--space-base) var(--gap-md)",
								borderRadius: "var(--radius-pill)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								textTransform: "uppercase",
								textDecoration: "none",
								letterSpacing: "0.08em",
							}}
						>
							Return to Home
						</Link>
					</div>

					{/* Emergency/Local Passkey Form */}
					<form
						onSubmit={handlePasskeySubmit}
						style={{
							marginTop: "var(--gap-md)",
							borderTopWidth: "var(--rule-width)",
							borderTopStyle: "solid",
							borderTopColor: "var(--rule)",
							paddingTop: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
							maxWidth: "40ch",
						}}
					>
						<span
							className="meta"
							style={{
								color: "var(--ink-muted)",
								fontSize: "var(--mono-size)",
							}}
						>
							DEVELOPER OFFLINE OVERRIDE:
						</span>
						<div style={{ display: "flex", gap: "var(--space-base)" }}>
							<input
								type="password"
								placeholder="Enter master admin passkey"
								value={passkeyInput}
								onChange={(e) => setPasskeyInput(e.target.value)}
								style={{
									flex: 1,
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--ground)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									outline: "none",
								}}
							/>
							<button
								type="submit"
								style={{
									padding: "calc(var(--space-base) / 2) var(--gap-sm)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--surface)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									cursor: "pointer",
								}}
							>
								Unlock
							</button>
						</div>
					</form>
				</div>
			</div>
		);
	}

	// -------------------------------------------------------------
	// AUTHORIZED SUPER ADMIN DASHBOARD VIEW
	// -------------------------------------------------------------
	const filteredSubscribers = subscribers.filter((s) => {
		const matchesEmail = s.email.toLowerCase().includes(subSearch.toLowerCase());
		const matchesChannel =
			subChannelFilter === "all" ||
			s.channels.includes(subChannelFilter as SubscriptionChannel);
		return matchesEmail && matchesChannel;
	});

	const totalWaitlistEst = subscribers.length + 1420;
	const totalImpressions = broadcasts.reduce(
		(sum, b) => sum + (b.impressions || 0),
		0,
	);
	const totalClicks = broadcasts.reduce((sum, b) => sum + (b.clicks || 0), 0);
	const ctrPercent =
		totalImpressions > 0
			? ((totalClicks / totalImpressions) * 100).toFixed(1)
			: "0.0";

	return (
		<div
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			{/* Top Bar / Verification Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					flexWrap: "wrap",
					gap: "var(--space-base)",
					borderBottomWidth: "var(--rule-width)",
					borderBottomStyle: "solid",
					borderBottomColor: "var(--rule)",
					paddingBottom: "var(--gap-sm)",
				}}
			>
				<div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "calc(var(--space-base) / 2)",
						}}
					>
						<span
							style={{
								display: "inline-block",
								width: "var(--space-base)",
								height: "var(--space-base)",
								borderRadius: "var(--radius-pill)",
								backgroundColor: "var(--accent)",
							}}
						/>
						<span
							className="meta"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
								letterSpacing: "0.1em",
								textTransform: "uppercase",
							}}
						>
							SUPER ADMIN COMMAND CENTER {"//"} VERIFIED
						</span>
					</div>
					<h1
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: "calc(var(--space-base) / 2) 0 0",
							color: "var(--ink)",
						}}
					>
						System Control & Telemetry
					</h1>
					<p
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: "calc(var(--space-base) / 4) 0 0",
						}}
					>
						Authenticated as: {userEmail}
					</p>
				</div>

				<div
					style={{
						display: "flex",
						gap: "var(--space-base)",
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					<Link
						href="/"
						style={{
							padding: "calc(var(--space-base) / 2) var(--space-base)",
							borderRadius: "var(--radius-pill)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							color: "var(--ink)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textDecoration: "none",
						}}
					>
						View Homepage ↗
					</Link>
					<button
						type="button"
						onClick={refreshData}
						style={{
							padding: "calc(var(--space-base) / 2) var(--space-base)",
							borderRadius: "var(--radius-pill)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							color: "var(--ink)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							cursor: "pointer",
						}}
					>
						Refresh Data
					</button>
				</div>
			</div>

			{/* Module Navigation Tabs */}
			<div
				style={{
					display: "flex",
					gap: "calc(var(--space-base) / 2)",
					borderBottomWidth: "var(--rule-width)",
					borderBottomStyle: "solid",
					borderBottomColor: "var(--rule)",
					paddingBottom: "var(--space-base)",
					overflowX: "auto",
				}}
			>
				{(
					[
						{ id: "kpis", label: "KPIs & Telemetry" },
						{ id: "subscribers", label: `Subscribers (${subscribers.length})` },
						{ id: "broadcasts", label: `Alerts & Banners (${broadcasts.length})` },
						{ id: "extension", label: "Chrome Extension Radar" },
						{ id: "campaigns", label: "Email Dispatcher" },
						{ id: "audit", label: "Security Audit Log" },
					] as const
				).map((tab) => {
					const isSelected = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							style={{
								padding: "calc(var(--space-base) / 2) var(--space-base)",
								borderRadius: "var(--radius-pill)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: isSelected ? "var(--rule-strong)" : "transparent",
								backgroundColor: isSelected ? "var(--ink)" : "transparent",
								color: isSelected ? "var(--ground)" : "var(--ink-muted)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								cursor: "pointer",
								whiteSpace: "nowrap",
								textTransform: "uppercase",
								letterSpacing: "0.06em",
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* ============================================================= */}
			{/* TAB 1: KPIS & TELEMETRY */}
			{/* ============================================================= */}
			{activeTab === "kpis" && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-md)",
					}}
				>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
							gap: "var(--space-base)",
						}}
					>
						<div
							style={{
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--surface)",
								padding: "var(--gap-sm)",
							}}
						>
							<div
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								TOTAL WAITLISTED
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--display-size)",
									fontWeight: 400,
									color: "var(--accent)",
									lineHeight: 1.2,
								}}
							>
								{totalWaitlistEst.toLocaleString()}
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								{subscribers.length} local + 1,420 benchmark
							</div>
						</div>

						<div
							style={{
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--surface)",
								padding: "var(--gap-sm)",
							}}
						>
							<div
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								BROADCAST ENGAGEMENT
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--display-size)",
									fontWeight: 400,
									color: "var(--ink)",
									lineHeight: 1.2,
								}}
							>
								{ctrPercent}% CTR
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								{totalClicks} clicks / {totalImpressions} impressions
							</div>
						</div>

						<div
							style={{
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--surface)",
								padding: "var(--gap-sm)",
							}}
						>
							<div
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								ENGINE MATRIX
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--display-size)",
									fontWeight: 400,
									color: "var(--ink)",
									lineHeight: 1.2,
								}}
							>
								200 Tools
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								147 client-side WASM decoders
							</div>
						</div>

						<div
							style={{
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--surface)",
								padding: "var(--gap-sm)",
							}}
						>
							<div
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								NETWORK LEAKAGE
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--display-size)",
									fontWeight: 400,
									color: "var(--accent)",
									lineHeight: 1.2,
								}}
							>
								0.00 KB
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								Verified by CI network guard
							</div>
						</div>
					</div>

					{/* Channel Distribution */}
					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<span
							className="meta"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
								letterSpacing: "0.08em",
								textTransform: "uppercase",
							}}
						>
							AUDIENCE SUBSCRIPTION CHANNELS
						</span>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
								gap: "var(--space-base)",
							}}
						>
							{(["extension", "ecosystem", "releases", "security"] as const).map(
								(ch) => {
									const count = subscribers.filter((s) =>
										s.channels.includes(ch),
									).length;
									return (
										<div
											key={ch}
											style={{
												padding: "var(--space-base)",
												borderWidth: "var(--rule-width)",
												borderStyle: "solid",
												borderColor: "var(--rule)",
												backgroundColor: "var(--ground)",
											}}
										>
											<div
												className="meta"
												style={{
													color: "var(--ink-muted)",
													fontSize: "var(--mono-size)",
													textTransform: "uppercase",
												}}
											>
												{ch}
											</div>
											<div
												className="mono"
												style={{
													fontSize: "var(--headline-size)",
													color: "var(--ink)",
												}}
											>
												{count}
											</div>
										</div>
									);
								},
							)}
						</div>
					</div>
				</div>
			)}

			{/* ============================================================= */}
			{/* TAB 2: SUBSCRIBERS */}
			{/* ============================================================= */}
			{activeTab === "subscribers" && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					{/* Actions Strip */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "var(--space-base)",
							flexWrap: "wrap",
						}}
					>
						<div
							style={{
								display: "flex",
								gap: "var(--space-base)",
								flexWrap: "wrap",
								flex: 1,
							}}
						>
							<input
								type="text"
								placeholder="Search email..."
								value={subSearch}
								onChange={(e) => setSubSearch(e.target.value)}
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--surface)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									outline: "none",
								}}
							/>
							<select
								value={subChannelFilter}
								onChange={(e) => setSubChannelFilter(e.target.value)}
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--surface)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									outline: "none",
								}}
							>
								<option value="all">All Channels</option>
								<option value="extension">Chrome Extension</option>
								<option value="ecosystem">Ecosystem</option>
								<option value="releases">Releases</option>
								<option value="security">Security</option>
							</select>
						</div>

						<div style={{ display: "flex", gap: "var(--space-base)" }}>
							<button
								type="button"
								onClick={handleExportCSV}
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderRadius: "var(--radius-pill)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--surface)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									cursor: "pointer",
								}}
							>
								Export CSV
							</button>
							<button
								type="button"
								onClick={handleExportJSON}
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderRadius: "var(--radius-pill)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--surface)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									cursor: "pointer",
								}}
							>
								Export JSON
							</button>
						</div>
					</div>

					{/* Manual Add Subscriber Form */}
					<form
						onSubmit={handleAddSubscriber}
						style={{
							display: "flex",
							gap: "var(--space-base)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							padding: "var(--space-base)",
						}}
					>
						<input
							type="email"
							placeholder="Add new subscriber email..."
							value={newSubEmail}
							onChange={(e) => setNewSubEmail(e.target.value)}
							required
							style={{
								flex: 1,
								padding: "calc(var(--space-base) / 2) var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								outline: "none",
							}}
						/>
						<button
							type="submit"
							style={{
								padding: "calc(var(--space-base) / 2) var(--gap-sm)",
								borderRadius: "var(--radius-pill)",
								backgroundColor: "var(--ink)",
								color: "var(--ground)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								fontWeight: 600,
								border: "none",
								cursor: "pointer",
								textTransform: "uppercase",
							}}
						>
							Add Subscriber ➔
						</button>
					</form>

					{/* Subscribers Table */}
					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							display: "flex",
							flexDirection: "column",
							overflowX: "auto",
						}}
					>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr",
								padding: "var(--space-base)",
								borderBottomWidth: "var(--rule-width)",
								borderBottomStyle: "solid",
								borderBottomColor: "var(--rule)",
								backgroundColor: "var(--ground)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
								textTransform: "uppercase",
							}}
						>
							<span>Email</span>
							<span>Channels</span>
							<span>Status</span>
							<span>Source</span>
							<span>Actions</span>
						</div>

						{filteredSubscribers.length === 0 ? (
							<div
								style={{
									padding: "var(--gap-md)",
									textAlign: "center",
									color: "var(--ink-muted)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
								}}
							>
								No subscribers match filter.
							</div>
						) : (
							filteredSubscribers.map((s) => (
								<div
									key={s.id}
									style={{
										display: "grid",
										gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr",
										padding: "var(--space-base)",
										borderBottomWidth: "var(--rule-width)",
										borderBottomStyle: "solid",
										borderBottomColor: "var(--rule)",
										alignItems: "center",
										fontFamily: "var(--font-mono)",
										fontSize: "var(--mono-size)",
									}}
								>
									<span style={{ color: "var(--ink)", fontWeight: 500 }}>
										{s.email}
									</span>
									<span style={{ color: "var(--ink-muted)" }}>
										{s.channels.join(", ")}
									</span>
									<button
										type="button"
										onClick={() => handleToggleSub(s.id)}
										style={{
											display: "inline-flex",
											alignItems: "center",
											width: "fit-content",
											padding:
												"calc(var(--space-base) / 4) calc(var(--space-base) / 2)",
											borderRadius: "var(--radius-pill)",
											borderWidth: "var(--rule-width)",
											borderStyle: "solid",
											borderColor:
												s.status === "active"
													? "var(--accent)"
													: "var(--rule)",
											backgroundColor: "transparent",
											color:
												s.status === "active"
													? "var(--accent)"
													: "var(--ink-muted)",
											cursor: "pointer",
											fontFamily: "var(--font-mono)",
											fontSize: "var(--mono-size)",
										}}
									>
										{s.status}
									</button>
									<span style={{ color: "var(--ink-muted)" }}>{s.source}</span>
									<div>
										<button
											type="button"
											onClick={() => handleDeleteSub(s.id, s.email)}
											style={{
												background: "transparent",
												border: "none",
												color: "var(--ink-muted)",
												cursor: "pointer",
												fontFamily: "var(--font-mono)",
												fontSize: "var(--mono-size)",
											}}
										>
											[delete]
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{/* ============================================================= */}
			{/* TAB 3: BROADCASTS & ALERTS */}
			{/* ============================================================= */}
			{activeTab === "broadcasts" && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-md)",
					}}
				>
					{/* Create Broadcast Form */}
					<form
						onSubmit={handleCreateBroadcast}
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							padding: "var(--gap-md)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<span
							className="meta"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
								letterSpacing: "0.08em",
								textTransform: "uppercase",
							}}
						>
							PUSH NEW SITE-WIDE BROADCAST {"//"} ANNOUNCEMENT BANNER
						</span>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
								gap: "var(--space-base)",
							}}
						>
							<div>
								<label
									className="meta"
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--mono-size)",
										display: "block",
										marginBottom: "calc(var(--space-base) / 4)",
									}}
								>
									Type
								</label>
								<select
									value={newBcType}
									onChange={(e) =>
										setNewBcType(e.target.value as BroadcastType)
									}
									style={{
										width: "100%",
										padding:
											"calc(var(--space-base) / 2) var(--space-base)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										backgroundColor: "var(--ground)",
										color: "var(--ink)",
										fontFamily: "var(--font-mono)",
										fontSize: "var(--mono-size)",
									}}
								>
									<option value="banner">Banner (Top Bar)</option>
									<option value="popup">Modal Popup</option>
									<option value="toast">Notification Toast</option>
									<option value="reminder">Exit Reminder</option>
								</select>
							</div>

							<div>
								<label
									className="meta"
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--mono-size)",
										display: "block",
										marginBottom: "calc(var(--space-base) / 4)",
									}}
								>
									Level
								</label>
								<select
									value={newBcLevel}
									onChange={(e) =>
										setNewBcLevel(e.target.value as BroadcastLevel)
									}
									style={{
										width: "100%",
										padding:
											"calc(var(--space-base) / 2) var(--space-base)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										backgroundColor: "var(--ground)",
										color: "var(--ink)",
										fontFamily: "var(--font-mono)",
										fontSize: "var(--mono-size)",
									}}
								>
									<option value="accent">Accent (Mint)</option>
									<option value="info">Info</option>
									<option value="warning">Warning</option>
									<option value="critical">Critical</option>
								</select>
							</div>

							<div>
								<label
									className="meta"
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--mono-size)",
										display: "block",
										marginBottom: "calc(var(--space-base) / 4)",
									}}
								>
									Target Route
								</label>
								<select
									value={newBcTarget}
									onChange={(e) =>
										setNewBcTarget(e.target.value as BroadcastTarget)
									}
									style={{
										width: "100%",
										padding:
											"calc(var(--space-base) / 2) var(--space-base)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										backgroundColor: "var(--ground)",
										color: "var(--ink)",
										fontFamily: "var(--font-mono)",
										fontSize: "var(--mono-size)",
									}}
								>
									<option value="all">All Pages</option>
									<option value="home">Homepage Only</option>
									<option value="convert">Converter Tool Pages</option>
									<option value="tools">Tools Directory</option>
								</select>
							</div>
						</div>

						<input
							type="text"
							placeholder="Title (e.g. CHROME EXTENSION LAUNCH)"
							value={newBcTitle}
							onChange={(e) => setNewBcTitle(e.target.value)}
							required
							style={{
								padding: "calc(var(--space-base) / 2) var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								outline: "none",
							}}
						/>

						<textarea
							placeholder="Content message..."
							value={newBcContent}
							onChange={(e) => setNewBcContent(e.target.value)}
							required
							rows={2}
							style={{
								padding: "calc(var(--space-base) / 2) var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								outline: "none",
								resize: "vertical",
							}}
						/>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 2fr",
								gap: "var(--space-base)",
							}}
						>
							<input
								type="text"
								placeholder="CTA Label (e.g. LEARN MORE ➔)"
								value={newBcCtaLabel}
								onChange={(e) => setNewBcCtaLabel(e.target.value)}
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--ground)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									outline: "none",
								}}
							/>
							<input
								type="text"
								placeholder="CTA Target Href (e.g. #extension-spotlight)"
								value={newBcCtaHref}
								onChange={(e) => setNewBcCtaHref(e.target.value)}
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--ground)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									outline: "none",
								}}
							/>
						</div>

						<button
							type="submit"
							style={{
								alignSelf: "flex-start",
								padding: "var(--space-base) var(--gap-md)",
								borderRadius: "var(--radius-pill)",
								backgroundColor: "var(--ink)",
								color: "var(--ground)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								fontWeight: 600,
								border: "none",
								cursor: "pointer",
								textTransform: "uppercase",
							}}
						>
							Push Live Broadcast ➔
						</button>
					</form>

					{/* Broadcasts List */}
					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							display: "flex",
							flexDirection: "column",
						}}
					>
						<div
							style={{
								padding: "var(--space-base)",
								borderBottomWidth: "var(--rule-width)",
								borderBottomStyle: "solid",
								borderBottomColor: "var(--rule)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
							}}
						>
							ACTIVE BROADCASTS REGISTRY
						</div>

						{broadcasts.map((bc) => (
							<div
								key={bc.id}
								style={{
									padding: "var(--gap-sm)",
									borderBottomWidth: "var(--rule-width)",
									borderBottomStyle: "solid",
									borderBottomColor: "var(--rule)",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
									gap: "var(--gap-sm)",
									flexWrap: "wrap",
								}}
							>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "calc(var(--space-base) / 2)",
										flex: 1,
									}}
								>
									<div
										style={{
											display: "flex",
											gap: "var(--space-base)",
											alignItems: "center",
										}}
									>
										<span
											className="mono"
											style={{
												color:
													bc.level === "accent"
														? "var(--accent)"
														: "var(--ink)",
												fontWeight: 600,
												fontSize: "var(--mono-size)",
											}}
										>
											[{bc.type.toUpperCase()}] {bc.title}
										</span>
										<span
											className="mono"
											style={{
												fontSize: "var(--mono-size)",
												color: "var(--ink-muted)",
											}}
										>
											Target: {bc.target}
										</span>
									</div>
									<p
										style={{
											fontSize: "var(--mono-size)",
											color: "var(--ink-muted)",
											margin: 0,
										}}
									>
										{bc.content}
									</p>
									<div
										className="mono"
										style={{
											fontSize: "var(--mono-size)",
											color: "var(--ink-muted)",
										}}
									>
										Metrics: {bc.impressions} impressions, {bc.clicks} clicks (
										{bc.impressions > 0
											? ((bc.clicks / bc.impressions) * 100).toFixed(1)
											: "0"}
										% CTR)
									</div>
								</div>

								<div
									style={{
										display: "flex",
										gap: "var(--space-base)",
										alignItems: "center",
									}}
								>
									<button
										type="button"
										onClick={() => handleToggleBroadcast(bc.id)}
										style={{
											padding:
												"calc(var(--space-base) / 4) var(--space-base)",
											borderRadius: "var(--radius-pill)",
											borderWidth: "var(--rule-width)",
											borderStyle: "solid",
											borderColor: bc.active
												? "var(--accent)"
												: "var(--rule)",
											backgroundColor: bc.active
												? "var(--ground)"
												: "transparent",
											color: bc.active ? "var(--accent)" : "var(--ink-muted)",
											fontFamily: "var(--font-mono)",
											fontSize: "var(--mono-size)",
											cursor: "pointer",
										}}
									>
										{bc.active ? "ACTIVE" : "PAUSED"}
									</button>
									<button
										type="button"
										onClick={() => handleDeleteBroadcast(bc.id)}
										style={{
											background: "transparent",
											border: "none",
											color: "var(--ink-muted)",
											cursor: "pointer",
											fontFamily: "var(--font-mono)",
											fontSize: "var(--mono-size)",
										}}
									>
										[delete]
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ============================================================= */}
			{/* TAB 4: CHROME EXTENSION RADAR */}
			{/* ============================================================= */}
			{activeTab === "extension" && (
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						padding: "var(--gap-md)",
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
					}}
				>
					<span
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.08em",
							textTransform: "uppercase",
						}}
					>
						CHROME WEB STORE // RELEASE STATUS
					</span>
					<h3
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: 0,
							color: "var(--ink)",
						}}
					>
						Extension Readiness Dashboard
					</h3>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: "var(--space-base)",
							marginTop: "var(--space-base)",
						}}
					>
						<div
							style={{
								padding: "var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
							}}
						>
							<div
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								VERSION
							</div>
							<div
								className="mono"
								style={{ fontSize: "var(--headline-size)", color: "var(--ink)" }}
							>
								0.2.1
							</div>
						</div>
						<div
							style={{
								padding: "var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
							}}
						>
							<div
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								REVIEW STATUS
							</div>
							<div
								className="mono"
								style={{
									fontSize: "var(--headline-size)",
									color: "var(--accent)",
								}}
							>
								In Review
							</div>
						</div>
						<div
							style={{
								padding: "var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
							}}
						>
							<div
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								MANIFEST
							</div>
							<div
								className="mono"
								style={{ fontSize: "var(--headline-size)", color: "var(--ink)" }}
							>
								V3 Compliant
							</div>
						</div>
					</div>

					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							lineHeight: 1.6,
							marginTop: "var(--space-base)",
						}}
					>
						Package bundle `convrtr-extension-v0.2.1.zip` built with full Side
						Panel, Quick Popup, Omnibox, and Content Script DOM media
						extraction modules. When approved, trigger the broadcast launch
						campaign to notify all waitlisted users.
					</p>
				</div>
			)}

			{/* ============================================================= */}
			{/* TAB 5: EMAIL DISPATCHER */}
			{/* ============================================================= */}
			{activeTab === "campaigns" && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-md)",
					}}
				>
					<form
						onSubmit={handleSendCampaign}
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							padding: "var(--gap-md)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<span
							className="meta"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
								letterSpacing: "0.08em",
								textTransform: "uppercase",
							}}
						>
							COMPOSE DISPATCH CAMPAIGN // RESEND BROADCAST
						</span>
						<p
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
								margin: 0,
							}}
						>
							Sends via Resend from your @convrtr.mreshank.com domain.
							Real sends go only to active local subscribers (benchmark
							1,420 is display-only). Server caps at 500 recipients per
							dispatch.
						</p>

						<div>
							<label
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
									display: "block",
									marginBottom: "calc(var(--space-base) / 4)",
								}}
							>
								Target Audience
							</label>
							<select
								value={campaignAudience}
								onChange={(e) => setCampaignAudience(e.target.value)}
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--ground)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
								}}
							>
								<option value="extension">
									Chrome Extension Waitlist (
									{
										subscribers.filter(
											(s) =>
												s.status === "active" &&
												s.channels.includes("extension"),
										).length
									}{" "}
									real recipients)
								</option>
								<option value="all">
									All Ecosystem Subscribers (
									{subscribers.filter((s) => s.status === "active").length}{" "}
									real recipients)
								</option>
							</select>
						</div>

						<input
							type="text"
							placeholder="Subject line (e.g. convrtr for Chrome is Live on Web Store)"
							value={campaignSubject}
							onChange={(e) => setCampaignSubject(e.target.value)}
							required
							style={{
								padding: "calc(var(--space-base) / 2) var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								outline: "none",
							}}
						/>

						<textarea
							placeholder="Write announcement body in markdown..."
							value={campaignBody}
							onChange={(e) => setCampaignBody(e.target.value)}
							required
							rows={6}
							style={{
								padding: "var(--space-base)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								backgroundColor: "var(--ground)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								outline: "none",
								resize: "vertical",
							}}
						/>

						<div>
							<label
								className="meta"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
									display: "block",
									marginBottom: "calc(var(--space-base) / 4)",
								}}
							>
								ADMIN_API_SECRET (Bearer — session only, never committed)
							</label>
							<input
								type="password"
								placeholder="Paste ADMIN_API_SECRET from Vercel env"
								value={campaignSecret}
								onChange={(e) => setCampaignSecret(e.target.value)}
								required
								style={{
									width: "100%",
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--ground)",
									color: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									outline: "none",
								}}
							/>
						</div>

						{campaignStatus && (
							<div
								role="status"
								style={{
									padding: "calc(var(--space-base) / 2) var(--space-base)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor:
										campaignStatus.type === "success"
											? "var(--accent)"
											: "var(--rule-strong)",
									color:
										campaignStatus.type === "success"
											? "var(--accent)"
											: "var(--ink)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
								}}
							>
								{campaignStatus.text}
							</div>
						)}

						<button
							type="submit"
							disabled={campaignSending}
							style={{
								alignSelf: "flex-start",
								padding: "var(--space-base) var(--gap-md)",
								borderRadius: "var(--radius-pill)",
								backgroundColor: "var(--ink)",
								color: "var(--ground)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								fontWeight: 600,
								border: "none",
								cursor: campaignSending ? "wait" : "pointer",
								textTransform: "uppercase",
								opacity: campaignSending ? 0.6 : 1,
							}}
						>
							{campaignSending ? "Dispatching via Resend…" : "Send Campaign via Resend ➔"}
						</button>
					</form>

					{/* Campaign History Log */}
					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--surface)",
							display: "flex",
							flexDirection: "column",
						}}
					>
						<div
							style={{
								padding: "var(--space-base)",
								borderBottomWidth: "var(--rule-width)",
								borderBottomStyle: "solid",
								borderBottomColor: "var(--rule)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
							}}
						>
							RECENT CAMPAIGN LOGS
						</div>
						{campaignLogs.length === 0 ? (
							<div
								style={{
									padding: "var(--gap-sm)",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								No campaigns dispatched in current session.
							</div>
						) : (
							campaignLogs.map((log) => (
								<div
									key={log.date}
									style={{
										padding: "var(--space-base)",
										borderBottomWidth: "var(--rule-width)",
										borderBottomStyle: "solid",
										borderBottomColor: "var(--rule)",
										display: "flex",
										justifyContent: "space-between",
										fontFamily: "var(--font-mono)",
										fontSize: "var(--mono-size)",
									}}
								>
									<span style={{ color: "var(--ink)" }}>{log.subject}</span>
									<span style={{ color: "var(--ink-muted)" }}>
										{log.recipients} recipients // {log.date}
									</span>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{/* ============================================================= */}
			{/* TAB 6: SECURITY AUDIT LOG */}
			{/* ============================================================= */}
			{activeTab === "audit" && (
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						display: "flex",
						flexDirection: "column",
					}}
				>
					<div
						style={{
							padding: "var(--space-base)",
							borderBottomWidth: "var(--rule-width)",
							borderBottomStyle: "solid",
							borderBottomColor: "var(--rule)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
						}}
					>
						IMMUTABLE LOCAL AUDIT TRAIL (LAST 50 EVENTS)
					</div>
					{auditLogs.map((log, idx) => (
						<div
							key={`${log.timestamp}-${idx}`}
							style={{
								padding: "calc(var(--space-base) / 2) var(--space-base)",
								borderBottomWidth: "var(--rule-width)",
								borderBottomStyle: "solid",
								borderBottomColor: "var(--rule)",
								display: "flex",
								justifyContent: "space-between",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
							}}
						>
							<span style={{ color: "var(--ink)" }}>{log.action}</span>
							<span style={{ color: "var(--ink-muted)" }}>
								{log.actor} // {log.timestamp}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
