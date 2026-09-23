"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";
import { CHROME_EXTENSION_URL } from "@/lib/site";
import {
	getSubscriptionStats,
	type SubscriptionChannel,
	subscribeUser,
	syncSubscriptionRemote,
} from "@/lib/subscriptions";

const FEATURES = [
	{
		code: "⌘⇧C",
		title: "Side Panel Docking",
		desc: "Dock convrtr alongside any active webpage for drag-and-drop batch conversions without tab hopping.",
	},
	{
		code: "⌘⇧,",
		title: "Instant Quick Popup",
		desc: "Summon a high-speed popup converter from anywhere with a single global shortcut.",
	},
	{
		code: "DOM-EXT",
		title: "Page Media Extraction",
		desc: "Scrape responsive images, videos, audio streams, and inline vector SVGs from any site in 1 click.",
	},
	{
		code: "CTX-MNU",
		title: "Right-Click Context Menu",
		desc: "Right-click any web media, selected code, or download link to convert locally in 0ms.",
	},
	{
		code: "cv ...",
		title: "Address Bar Omnibox",
		desc: "Type 'cv png to webp' directly into the Chrome address bar for instant format lookup.",
	},
	{
		code: "0-LEAK",
		title: "Zero Remote Telemetry",
		desc: "Uses WebCodecs & WebAssembly workers entirely in your browser sandbox. Works completely offline.",
	},
];

export function ExtensionWaitlistCard() {
	const [email, setEmail] = useState("");
	const [channels, setChannels] = useState<SubscriptionChannel[]>([
		"extension",
		"ecosystem",
	]);
	const [status, setStatus] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);
	const [subCount, setSubCount] = useState(1424);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const stats = getSubscriptionStats();
		setSubCount(stats.benchmarkWaitlistTotal);
	}, []);

	const toggleChannel = (ch: SubscriptionChannel) => {
		if (channels.includes(ch)) {
			if (channels.length > 1) {
				setChannels(channels.filter((c) => c !== ch));
			}
		} else {
			setChannels([...channels, ch]);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		setIsSubmitting(true);
		const result = subscribeUser(email, channels, "extension-waitlist");
		const submittedEmail = email.trim();

		if (result.success) {
			setStatus({ text: result.message, type: "success" });
			setEmail("");
			const stats = getSubscriptionStats();
			setSubCount(stats.benchmarkWaitlistTotal);
			// Fire-and-forget welcome email + Audience sync; local state stays authoritative.
			void syncSubscriptionRemote(
				submittedEmail,
				channels,
				"extension-waitlist",
			).then((emailed) => {
				if (emailed) {
					setStatus({
						text: "Subscribed. Check your inbox for a confirmation email.",
						type: "success",
					});
				}
			});
		} else {
			setStatus({ text: result.message, type: "error" });
		}
		setIsSubmitting(false);
	};

	return (
		<div
			id="extension-spotlight"
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
				position: "relative",
			}}
		>
			{/* Top Eyebrow & Status Bar */}
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
					paddingBottom: "var(--space-base)",
				}}
			>
				<div>
					<span
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.1em",
							textTransform: "uppercase",
						}}
					>
						CHROME WEB STORE {"//"} MANIFEST V3 {"//"} NOW LIVE
					</span>
					<h2
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: "calc(var(--space-base) / 2) 0 0",
							color: "var(--ink)",
						}}
					>
						convrtr inside Chrome.
					</h2>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "var(--space-base)",
					}}
				>
					<span
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--accent)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule-strong)",
							padding: "calc(var(--space-base) / 4) var(--space-base)",
							borderRadius: "var(--radius-control)",
							backgroundColor: "var(--ground)",
						}}
					>
						● NOW LIVE ON CHROME WEB STORE
					</span>
				</div>
			</div>

			{/* Description & Direct Store CTA */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						lineHeight: 1.6,
						margin: 0,
						maxWidth: "65ch",
					}}
				>
					The universal in-browser media converter brought directly to your
					daily workflow. Convert, transpile, extract, and inspect assets across
					any webpage without leaving your tab. Zero file bytes or metadata ever
					leave your machine.
				</p>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "var(--gap-md)",
						flexWrap: "wrap",
						marginTop: "calc(var(--space-base) / 2)",
					}}
				>
					<a
						href={CHROME_EXTENSION_URL}
						target="_blank"
						rel="noopener noreferrer"
						data-cta-fill
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "var(--space-base)",
							height: "36px",
							padding: "0 var(--gap-md)",
							background: "var(--ink)",
							color: "var(--ground)",
							borderRadius: "var(--radius-pill)",
							fontSize: "var(--label-size)",
							letterSpacing: "var(--label-tracking)",
							fontWeight: "var(--label-weight)",
							textDecoration: "none",
						}}
					>
						<span>INSTALL FROM CHROME WEB STORE</span>
						<ArrowUpRight size={14} />
					</a>

					<Link
						href="/extension"
						style={{
							fontSize: "var(--mono-size)",
							fontFamily: "var(--font-mono)",
							color: "var(--accent)",
							textDecoration: "underline",
							textUnderlineOffset: "3px",
						}}
					>
						VIEW EXTENSION SPECS & SHORTCUTS ➔
					</Link>
				</div>
			</div>

			{/* 6-Grid Feature Capabilities */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: "var(--space-base)",
				}}
			>
				{FEATURES.map((f) => (
					<div
						key={f.code}
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--accent)",
									letterSpacing: "0.08em",
								}}
							>
								{f.code}
							</span>
							<span
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								●
							</span>
						</div>
						<h3
							style={{
								fontSize: "var(--body-size)",
								fontWeight: 500,
								margin: 0,
								color: "var(--ink)",
							}}
						>
							{f.title}
						</h3>
						<p
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
								margin: 0,
								lineHeight: 1.5,
							}}
						>
							{f.desc}
						</p>
					</div>
				))}
			</div>

			{/* Interactive Waitlist Subscription Form */}
			<div
				id="extension-waitlist"
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule-strong)",
					backgroundColor: "var(--ground)",
					padding: "var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
				}}
			>
				<div>
					<span
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.08em",
							textTransform: "uppercase",
						}}
					>
						RELEASE RADAR {"//"} TECHNICAL CHANGELOGS
					</span>
					<h3
						style={{
							fontSize: "var(--body-size)",
							fontWeight: 500,
							margin: "calc(var(--space-base) / 2) 0 0",
							color: "var(--ink)",
						}}
					>
						Subscribe to Extension Changelogs & WASM Decoder Updates
					</h3>
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
							margin: "calc(var(--space-base) / 4) 0 0",
						}}
					>
						Receive technical release notes, new format additions, and engine
						performance updates directly from the engineering team.
					</p>
				</div>

				<form
					onSubmit={handleSubmit}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
					}}
				>
					{/* Channel Selection Chips */}
					<div
						style={{
							display: "flex",
							gap: "calc(var(--space-base) / 2)",
							flexWrap: "wrap",
						}}
					>
						<button
							type="button"
							onClick={() => toggleChannel("extension")}
							style={{
								padding: "calc(var(--space-base) / 4) var(--space-base)",
								borderRadius: "var(--radius-pill)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: channels.includes("extension")
									? "var(--rule-strong)"
									: "var(--rule)",
								backgroundColor: channels.includes("extension")
									? "var(--ink)"
									: "transparent",
								color: channels.includes("extension")
									? "var(--ground)"
									: "var(--ink-muted)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								cursor: "pointer",
								textTransform: "uppercase",
							}}
						>
							[x] Chrome Extension Launch
						</button>
						<button
							type="button"
							onClick={() => toggleChannel("ecosystem")}
							style={{
								padding: "calc(var(--space-base) / 4) var(--space-base)",
								borderRadius: "var(--radius-pill)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: channels.includes("ecosystem")
									? "var(--rule-strong)"
									: "var(--rule)",
								backgroundColor: channels.includes("ecosystem")
									? "var(--ink)"
									: "transparent",
								color: channels.includes("ecosystem")
									? "var(--ground)"
									: "var(--ink-muted)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								cursor: "pointer",
								textTransform: "uppercase",
							}}
						>
							[x] Ecosystem Releases
						</button>
						<button
							type="button"
							onClick={() => toggleChannel("releases")}
							style={{
								padding: "calc(var(--space-base) / 4) var(--space-base)",
								borderRadius: "var(--radius-pill)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: channels.includes("releases")
									? "var(--rule-strong)"
									: "var(--rule)",
								backgroundColor: channels.includes("releases")
									? "var(--ink)"
									: "transparent",
								color: channels.includes("releases")
									? "var(--ground)"
									: "var(--ink-muted)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								cursor: "pointer",
								textTransform: "uppercase",
							}}
						>
							[x] WASM Decoder Changelogs
						</button>
					</div>

					{/* Email Input & Submit Button */}
					<div
						style={{
							display: "flex",
							gap: "var(--space-base)",
							flexWrap: "wrap",
						}}
					>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="engineer@domain.com"
							required
							style={{
								flex: 1,
								minWidth: "16rem",
								padding: "var(--space-base) var(--gap-sm)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule-strong)",
								backgroundColor: "var(--surface)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								borderRadius: "var(--radius-control)",
								outline: "none",
							}}
						/>
						<button
							type="submit"
							disabled={isSubmitting}
							style={{
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
								letterSpacing: "0.08em",
							}}
						>
							{isSubmitting ? "Subscribing..." : "Join Waitlist ➔"}
						</button>
					</div>
				</form>

				{/* Status Feedback */}
				{status && (
					<div
						role="status"
						style={{
							padding: "calc(var(--space-base) / 2) var(--gap-sm)",
							backgroundColor: "var(--surface)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor:
								status.type === "success"
									? "var(--accent)"
									: "var(--rule-strong)",
							color:
								status.type === "success"
									? "var(--accent)"
									: "var(--ink-muted)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<span>{status.text}</span>
						<button
							type="button"
							onClick={() => setStatus(null)}
							style={{
								background: "transparent",
								border: "none",
								color: "var(--ink-muted)",
								cursor: "pointer",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
							}}
						>
							[close]
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
