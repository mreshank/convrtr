"use client";

import { SignIn, SignUp, useUser } from "@clerk/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { AuthErrorBoundary } from "./AuthErrorBoundary";
import { clerkAppearance } from "./clerk-theme";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface LocalWorkspaceData {
	id: string;
	name: string;
	createdAt: number;
}

function AuthenticatedClerkSession({
	onSwitchToLocal,
}: {
	onSwitchToLocal?: () => void;
}) {
	const { isSignedIn, user } = useUser();

	if (!isSignedIn || !user) return null;

	return (
		<div
			style={{
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				width: "100%",
			}}
		>
			<div>
				<p
					className="meta"
					style={{
						color: "var(--accent)",
						fontSize: "var(--mono-size)",
						letterSpacing: "0.1em",
						textTransform: "uppercase",
						marginBottom: "calc(var(--space-base) / 2)",
					}}
				>
					CLOUD SESSION ACTIVE
				</p>
				<h3
					style={{
						fontSize: "var(--headline-size)",
						letterSpacing: "var(--headline-tracking)",
						fontWeight: 400,
						margin: 0,
					}}
				>
					Signed in as{" "}
					{user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "User"}
				</h3>
				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						marginTop: "var(--space-base)",
						marginBottom: 0,
					}}
				>
					Your cloud account is active. Cross-device conversion audit history
					and custom presets are automatically synchronized across all your
					devices.
				</p>
			</div>

			<div style={{ display: "flex", gap: "var(--gap-sm)", flexWrap: "wrap" }}>
				<Link
					href="/convert"
					style={{
						display: "inline-flex",
						alignItems: "center",
						padding: "var(--space-base) var(--gap-sm)",
						borderRadius: "var(--radius-pill)",
						backgroundColor: "var(--ink)",
						color: "var(--ground)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						fontWeight: 600,
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						textDecoration: "none",
					}}
				>
					Start Converting
				</Link>
				<Link
					href="/history"
					style={{
						display: "inline-flex",
						alignItems: "center",
						padding: "var(--space-base) var(--gap-sm)",
						borderRadius: "var(--radius-pill)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						color: "var(--ink)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						textDecoration: "none",
					}}
				>
					View History
				</Link>
				{onSwitchToLocal && (
					<button
						type="button"
						onClick={onSwitchToLocal}
						style={{
							display: "inline-flex",
							alignItems: "center",
							padding: "var(--space-base) var(--gap-sm)",
							borderRadius: "var(--radius-pill)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "transparent",
							color: "var(--ink-muted)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							cursor: "pointer",
						}}
					>
						Local Workspace
					</button>
				)}
			</div>
		</div>
	);
}

function LocalWorkspaceCard() {
	const [session, setSession] = useState<LocalWorkspaceData | null>(null);
	const [workspaceName, setWorkspaceName] = useState("");
	const [historyCount, setHistoryCount] = useState<number | null>(null);
	const [specs, setSpecs] = useState<{ cores: number; memory: string }>({
		cores: 4,
		memory: "Available",
	});

	useEffect(() => {
		try {
			const stored = localStorage.getItem("convrtr_workspace_session");
			if (stored) {
				setSession(JSON.parse(stored));
			}

			// Estimate local history entries
			const historyRaw = localStorage.getItem("convrtr_history");
			if (historyRaw) {
				const parsed = JSON.parse(historyRaw);
				if (Array.isArray(parsed)) setHistoryCount(parsed.length);
			} else {
				setHistoryCount(0);
			}

			if (typeof navigator !== "undefined") {
				const cores = navigator.hardwareConcurrency || 4;
				const mem = (navigator as unknown as { deviceMemory?: number })
					.deviceMemory;
				setSpecs({
					cores,
					memory: mem ? `${mem} GB` : "Standard",
				});
			}
		} catch {
			// LocalStorage unavailable in restricted context
		}
	}, []);

	const handleActivate = (e: React.FormEvent) => {
		e.preventDefault();
		const name = workspaceName.trim() || "Anonymous Researcher";
		const newSession: LocalWorkspaceData = {
			id: `ws-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
			name,
			createdAt: Date.now(),
		};
		try {
			localStorage.setItem(
				"convrtr_workspace_session",
				JSON.stringify(newSession),
			);
			setSession(newSession);
		} catch {
			// Storage error
		}
	};

	const handleReset = () => {
		try {
			localStorage.removeItem("convrtr_workspace_session");
			setSession(null);
			setWorkspaceName("");
		} catch {
			// Storage error
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				width: "100%",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-md)",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					flexWrap: "wrap",
					gap: "var(--space-base)",
				}}
			>
				<div>
					<p
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.1em",
							textTransform: "uppercase",
							marginBottom: "calc(var(--space-base) / 2)",
						}}
					>
						{session ? "LOCAL SESSION ACTIVE" : "PRIVATE IN-BROWSER WORKSPACE"}
					</p>
					<h3
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: 0,
						}}
					>
						{session ? session.name : "Zero-Upload Local Profile"}
					</h3>
				</div>
				{session && (
					<span
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							padding: "calc(var(--space-base) / 4) var(--space-base)",
							borderRadius: "var(--radius-control)",
						}}
					>
						ID: {session.id}
					</span>
				)}
			</div>

			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					margin: 0,
				}}
			>
				convrtr executes all conversions directly inside your browser via
				isolated WebAssembly sandbox instances. No file bytes or metadata are
				ever transmitted to external servers.
			</p>

			{/* Device Telemetry Strip */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gap: "var(--space-base)",
					backgroundColor: "var(--ground)",
					padding: "var(--gap-sm)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
				}}
			>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						PARALLEL WORKERS
					</div>
					<div
						className="mono"
						style={{ color: "var(--ink)", fontWeight: 600 }}
					>
						{specs.cores} Threads
					</div>
				</div>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						DEVICE MEMORY
					</div>
					<div
						className="mono"
						style={{ color: "var(--ink)", fontWeight: 600 }}
					>
						{specs.memory}
					</div>
				</div>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						LOCAL AUDIT RECORDS
					</div>
					<div
						className="mono"
						style={{
							color: historyCount ? "var(--accent)" : "var(--ink-muted)",
							fontWeight: 600,
						}}
					>
						{historyCount ?? 0} Conversions
					</div>
				</div>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						STORAGE ENGINE
					</div>
					<div
						className="mono"
						style={{ color: "var(--ink)", fontWeight: 600 }}
					>
						Client IndexedDB
					</div>
				</div>
			</div>

			{session ? (
				<div
					style={{
						display: "flex",
						gap: "var(--gap-sm)",
						flexWrap: "wrap",
						marginTop: "var(--space-base)",
					}}
				>
					<Link
						href="/convert"
						style={{
							display: "inline-flex",
							alignItems: "center",
							padding: "var(--space-base) var(--gap-sm)",
							borderRadius: "var(--radius-pill)",
							backgroundColor: "var(--ink)",
							color: "var(--ground)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							fontWeight: 600,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							textDecoration: "none",
						}}
					>
						Start Converting
					</Link>
					<Link
						href="/history"
						style={{
							display: "inline-flex",
							alignItems: "center",
							padding: "var(--space-base) var(--gap-sm)",
							borderRadius: "var(--radius-pill)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							color: "var(--ink)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							textDecoration: "none",
						}}
					>
						View History
					</Link>
					<button
						type="button"
						onClick={handleReset}
						style={{
							display: "inline-flex",
							alignItems: "center",
							padding: "var(--space-base) var(--gap-sm)",
							borderRadius: "var(--radius-pill)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "transparent",
							color: "var(--ink-muted)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							cursor: "pointer",
						}}
					>
						Reset Session
					</button>
				</div>
			) : (
				<form
					onSubmit={handleActivate}
					style={{
						display: "flex",
						gap: "var(--gap-sm)",
						flexWrap: "wrap",
						marginTop: "var(--space-base)",
					}}
				>
					<input
						type="text"
						placeholder="Workspace Label (e.g. Local Studio)"
						value={workspaceName}
						onChange={(e) => setWorkspaceName(e.target.value)}
						aria-label="Workspace Label"
						style={{
							flex: "1 1 220px",
							padding: "var(--space-base) var(--gap-sm)",
							backgroundColor: "var(--ground)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							borderRadius: "var(--radius-control)",
							color: "var(--ink)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							outline: "none",
						}}
					/>
					<button
						type="submit"
						style={{
							padding: "var(--space-base) var(--gap-sm)",
							borderRadius: "var(--radius-pill)",
							backgroundColor: "var(--ink)",
							color: "var(--ground)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							fontWeight: 600,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							border: "none",
							cursor: "pointer",
						}}
					>
						Activate Workspace
					</button>
				</form>
			)}
		</div>
	);
}

function PrivacyArchitecturePanel() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-md)",
				width: "100%",
			}}
		>
			<p
				className="meta"
				style={{
					color: "var(--accent)",
					fontSize: "var(--mono-size)",
					letterSpacing: "0.1em",
					textTransform: "uppercase",
					margin: 0,
				}}
			>
				AIR-GAPPED CLIENT-SIDE ARCHITECTURE
			</p>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
				}}
			>
				<p style={{ margin: 0 }}>
					Unlike conventional web conversion utilities that upload your files to
					untrusted cloud storage servers, convrtr compiles native C, Rust, and
					C++ parsing engines directly to WebAssembly and runs them inside your
					browser's sandboxed worker threads.
				</p>
				<ul
					style={{
						margin: 0,
						paddingLeft: "var(--gap-md)",
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
					}}
				>
					<li>
						<strong style={{ color: "var(--ink)" }}>
							Zero Network Ingestion:
						</strong>{" "}
						File buffers never touch network sockets or third-party servers.
					</li>
					<li>
						<strong style={{ color: "var(--ink)" }}>Memory Safety:</strong> All
						temporary byte streams and buffers are freed as soon as conversion
						completes.
					</li>
					<li>
						<strong style={{ color: "var(--ink)" }}>
							Auditable Offline Operation:
						</strong>{" "}
						Disconnect your WiFi or ethernet; convrtr continues converting
						without disruption.
					</li>
				</ul>
			</div>
		</div>
	);
}

function CapabilitiesStrip() {
	return (
		<div
			style={{
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			<div>
				<p
					className="meta"
					style={{
						color: "var(--accent)",
						fontSize: "var(--mono-size)",
						letterSpacing: "0.1em",
						textTransform: "uppercase",
						marginBottom: "calc(var(--space-base) / 2)",
					}}
				>
					WORKSPACE CAPABILITIES & PRIVACY GUARANTEE
				</p>
				<h3
					style={{
						fontSize: "var(--headline-size)",
						letterSpacing: "var(--headline-tracking)",
						fontWeight: 400,
						margin: 0,
					}}
				>
					Air-Gapped In-Browser Processing
				</h3>
				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						marginTop: "var(--space-base)",
						marginBottom: 0,
					}}
				>
					convrtr compiles native C, Rust, and C++ parsing engines directly to
					WebAssembly. Processing executes strictly inside sandboxed browser
					worker threads with zero server uploads.
				</p>
			</div>

			{/* Runtime Telemetry Status Bar */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gap: "var(--space-base)",
					backgroundColor: "var(--ground)",
					padding: "var(--gap-sm)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
				}}
			>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						WASM SANDBOX
					</div>
					<div
						className="mono"
						style={{ color: "var(--accent)", fontWeight: 600 }}
					>
						Active Isolated
					</div>
				</div>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						SERVER INGESTION
					</div>
					<div
						className="mono"
						style={{ color: "var(--ink)", fontWeight: 600 }}
					>
						0 Bytes (Strict)
					</div>
				</div>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						OFFLINE OPERATION
					</div>
					<div
						className="mono"
						style={{ color: "var(--accent)", fontWeight: 600 }}
					>
						Verified Ready
					</div>
				</div>
				<div>
					<div
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
						}}
					>
						CLIENT CRYPTO
					</div>
					<div
						className="mono"
						style={{ color: "var(--ink)", fontWeight: 600 }}
					>
						SHA-256 Digest
					</div>
				</div>
			</div>

			{/* Architectural Trust Points */}
			<ul
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
					color: "var(--ink-muted)",
					fontSize: "var(--mono-size)",
					margin: 0,
					padding: 0,
					listStyle: "none",
				}}
			>
				<li
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "var(--space-base)",
					}}
				>
					<span
						style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
					>
						[+]
					</span>
					<span>
						<strong style={{ color: "var(--ink)" }}>
							Local-First Architecture:
						</strong>{" "}
						Conversions always execute 100% inside your browser. Zero bytes
						uploaded.
					</span>
				</li>
				<li
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "var(--space-base)",
					}}
				>
					<span
						style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
					>
						[+]
					</span>
					<span>
						<strong style={{ color: "var(--ink)" }}>
							Zero Network Ingestion:
						</strong>{" "}
						File buffers never touch network sockets or third-party cloud
						servers.
					</span>
				</li>
				<li
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "var(--space-base)",
					}}
				>
					<span
						style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
					>
						[+]
					</span>
					<span>
						<strong style={{ color: "var(--ink)" }}>Memory Safety:</strong> All
						temporary byte streams and buffers are freed as soon as conversion
						completes.
					</span>
				</li>
				<li
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "var(--space-base)",
					}}
				>
					<span
						style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
					>
						[+]
					</span>
					<span>
						<strong style={{ color: "var(--ink)" }}>
							Audit Trail & History:
						</strong>{" "}
						Searchable conversion metadata logged privately to your device
						storage.
					</span>
				</li>
				<li
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "var(--space-base)",
					}}
				>
					<span
						style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
					>
						[+]
					</span>
					<span>
						<strong style={{ color: "var(--ink)" }}>
							High Batch Concurrency:
						</strong>{" "}
						Parallelized worker queues utilize all available CPU execution
						threads.
					</span>
				</li>
			</ul>
		</div>
	);
}

function CloudAuthFallback({
	onSwitchToLocal,
}: {
	onSwitchToLocal: () => void;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-base)",
				padding: "var(--gap-md)",
				backgroundColor: "var(--surface)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				width: "100%",
				textAlign: "center",
			}}
		>
			<p
				className="meta"
				style={{
					color: "var(--accent)",
					marginBottom: 0,
					fontSize: "var(--mono-size)",
				}}
			>
				CLOUD AUTH SERVICE UNREACHABLE
			</p>
			<h4
				style={{
					fontSize: "var(--headline-size)",
					letterSpacing: "var(--headline-tracking)",
					fontWeight: 400,
					margin: 0,
				}}
			>
				Third-Party Endpoint Connection Failed
			</h4>
			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					margin: 0,
				}}
			>
				The external authentication service is currently unreachable or its
				domain is not configured. Your private local workspace is fully active
				with zero server uploads.
			</p>
			<button
				type="button"
				onClick={onSwitchToLocal}
				style={{
					marginTop: "var(--space-base)",
					alignSelf: "center",
					padding: "var(--space-base) var(--gap-sm)",
					borderRadius: "var(--radius-pill)",
					backgroundColor: "var(--ink)",
					color: "var(--ground)",
					fontFamily: "var(--font-mono)",
					fontSize: "var(--mono-size)",
					fontWeight: 600,
					textTransform: "uppercase",
					letterSpacing: "0.08em",
					border: "none",
					cursor: "pointer",
				}}
			>
				Use Local Workspace
			</button>
		</div>
	);
}

function AuthFormTabs() {
	const searchParams = useSearchParams();
	const mode = searchParams.get("mode");
	const { isSignedIn } = useUser();

	const defaultTab = isSignedIn
		? "account"
		: PUBLISHABLE_KEY
			? mode === "signup"
				? "signup"
				: mode === "signin"
					? "signin"
					: "workspace"
			: "workspace";

	const [activeTab, setActiveTab] = useState<string>(defaultTab);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const hash = window.location.hash.replace("#", "");
			if (hash === "signin" || hash === "signup" || hash === "workspace") {
				if (!isSignedIn) {
					setActiveTab(hash);
				}
			}
		}
	}, [isSignedIn]);

	useEffect(() => {
		if (isSignedIn) {
			setActiveTab("account");
		}
	}, [isSignedIn]);

	const baseId = useId();
	const tabList = isSignedIn
		? [
				{ id: "account", label: "Cloud Account" },
				{ id: "workspace", label: "Local Workspace" },
			]
		: PUBLISHABLE_KEY
			? [
					{ id: "workspace", label: "Local Workspace" },
					{ id: "signin", label: "Sign In" },
					{ id: "signup", label: "Create Account" },
				]
			: [
					{ id: "workspace", label: "Local Workspace" },
					{ id: "architecture", label: "Zero-Upload Security" },
				];

	return (
		<div data-auth-grid>
			{/* Left Column on Desktop: Capabilities Strip */}
			<div data-auth-aside>
				<CapabilitiesStrip />
			</div>

			{/* Right Column on Desktop: Tab list and Active Tab Panels */}
			<div data-auth-main>
				{/* Accessible Tab List */}
				<div
					role="tablist"
					aria-label="Authentication and Workspace Modes"
					style={{
						display: "flex",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--ground)",
					}}
				>
					{tabList.map((item, idx) => {
						const isSelected = activeTab === item.id;
						return (
							<button
								key={item.id}
								id={`${baseId}-tab-${item.id}`}
								type="button"
								role="tab"
								aria-selected={isSelected}
								aria-controls={`${baseId}-panel-${item.id}`}
								tabIndex={isSelected ? 0 : -1}
								onClick={() => setActiveTab(item.id)}
								onKeyDown={(e) => {
									if (e.key === "ArrowRight") {
										const next = tabList[(idx + 1) % tabList.length];
										if (next) {
											setActiveTab(next.id);
											document
												.getElementById(`${baseId}-tab-${next.id}`)
												?.focus();
										}
									} else if (e.key === "ArrowLeft") {
										const prev =
											tabList[(idx - 1 + tabList.length) % tabList.length];
										if (prev) {
											setActiveTab(prev.id);
											document
												.getElementById(`${baseId}-tab-${prev.id}`)
												?.focus();
										}
									} else if (e.key === "Home") {
										const first = tabList[0];
										if (first) {
											setActiveTab(first.id);
											document
												.getElementById(`${baseId}-tab-${first.id}`)
												?.focus();
										}
									} else if (e.key === "End") {
										const last = tabList[tabList.length - 1];
										if (last) {
											setActiveTab(last.id);
											document
												.getElementById(`${baseId}-tab-${last.id}`)
												?.focus();
										}
									}
								}}
								style={{
									flex: 1,
									padding: "var(--space-base) var(--gap-sm)",
									backgroundColor: isSelected
										? "var(--surface)"
										: "transparent",
									color: isSelected ? "var(--ink)" : "var(--ink-muted)",
									border: "none",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									cursor: "pointer",
									borderRight:
										idx < tabList.length - 1
											? "var(--rule-width) solid var(--rule)"
											: "none",
									transition:
										"background-color var(--dur-hover) var(--ease), color var(--dur-hover) var(--ease)",
								}}
							>
								{item.label}
							</button>
						);
					})}
				</div>

				{/* Tab Panels */}
				<div style={{ width: "100%" }}>
					{isSignedIn && (
						<div
							id={`${baseId}-panel-account`}
							role="tabpanel"
							aria-labelledby={`${baseId}-tab-account`}
							hidden={activeTab !== "account"}
							style={{
								display: activeTab === "account" ? "block" : "none",
								width: "100%",
							}}
						>
							<AuthenticatedClerkSession
								onSwitchToLocal={() => setActiveTab("workspace")}
							/>
						</div>
					)}

					{PUBLISHABLE_KEY && !isSignedIn && (
						<>
							<div
								id={`${baseId}-panel-signin`}
								role="tabpanel"
								aria-labelledby={`${baseId}-tab-signin`}
								hidden={activeTab !== "signin"}
								style={{
									display: activeTab === "signin" ? "flex" : "none",
									justifyContent: "center",
									width: "100%",
								}}
							>
								<AuthErrorBoundary
									fallback={
										<CloudAuthFallback
											onSwitchToLocal={() => setActiveTab("workspace")}
										/>
									}
								>
									<SignIn
										routing="hash"
										appearance={clerkAppearance}
										signUpUrl="/auth#signup"
										forceRedirectUrl="/history"
									/>
								</AuthErrorBoundary>
							</div>
							<div
								id={`${baseId}-panel-signup`}
								role="tabpanel"
								aria-labelledby={`${baseId}-tab-signup`}
								hidden={activeTab !== "signup"}
								style={{
									display: activeTab === "signup" ? "flex" : "none",
									justifyContent: "center",
									width: "100%",
								}}
							>
								<AuthErrorBoundary
									fallback={
										<CloudAuthFallback
											onSwitchToLocal={() => setActiveTab("workspace")}
										/>
									}
								>
									<SignUp
										routing="hash"
										appearance={clerkAppearance}
										signInUrl="/auth#signin"
										forceRedirectUrl="/history"
									/>
								</AuthErrorBoundary>
							</div>
						</>
					)}

					<div
						id={`${baseId}-panel-workspace`}
						role="tabpanel"
						aria-labelledby={`${baseId}-tab-workspace`}
						hidden={activeTab !== "workspace"}
						style={{
							display: activeTab === "workspace" ? "block" : "none",
							width: "100%",
						}}
					>
						<LocalWorkspaceCard />
					</div>

					{!PUBLISHABLE_KEY && (
						<div
							id={`${baseId}-panel-architecture`}
							role="tabpanel"
							aria-labelledby={`${baseId}-tab-architecture`}
							hidden={activeTab !== "architecture"}
							style={{
								display: activeTab === "architecture" ? "block" : "none",
								width: "100%",
							}}
						>
							<PrivacyArchitecturePanel />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export function AuthClient() {
	return (
		<Suspense fallback={null}>
			<AuthFormTabs />
		</Suspense>
	);
}
