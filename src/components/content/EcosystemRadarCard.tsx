"use client";

import { useState } from "react";
import {
	type SubscriptionChannel,
	subscribeUser,
	syncSubscriptionRemote,
} from "@/lib/subscriptions";

export function EcosystemRadarCard() {
	const [email, setEmail] = useState("");
	const [channels, setChannels] = useState<SubscriptionChannel[]>([
		"ecosystem",
		"releases",
		"security",
	]);
	const [status, setStatus] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

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
		const result = subscribeUser(email, channels, "radar");
		const submittedEmail = email.trim();

		if (result.success) {
			setStatus({ text: result.message, type: "success" });
			setEmail("");
			void syncSubscriptionRemote(submittedEmail, channels, "radar").then(
				(emailed) => {
					if (emailed) {
						setStatus({
							text: "Subscribed. Check your inbox for a confirmation email.",
							type: "success",
						});
					}
				},
			);
		} else {
			setStatus({ text: result.message, type: "error" });
		}
		setIsSubmitting(false);
	};

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
					<span
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.1em",
							textTransform: "uppercase",
						}}
					>
						DISPATCH {"//"} STAY SYNCHRONIZED
					</span>
					<h3
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: "calc(var(--space-base) / 2) 0 0",
							color: "var(--ink)",
						}}
					>
						The convrtr Ecosystem Radar
					</h3>
				</div>
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
					ZERO TELEMETRY {"//"} RSS & EMAIL
				</span>
			</div>

			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: 1.6,
					margin: 0,
					maxWidth: "65ch",
				}}
			>
				We release new WebAssembly format decoders, browser extensions, and
				client-side tools on a continuous cycle. Subscribe for direct dispatch
				alerts when new formats arrive or when major performance upgrades drop.
			</p>

			<form
				onSubmit={handleSubmit}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "calc(var(--space-base) / 2)",
						flexWrap: "wrap",
					}}
				>
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
						}}
					>
						[x] Product Releases
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
						}}
					>
						[x] New Codecs & WASM Engines
					</button>
					<button
						type="button"
						onClick={() => toggleChannel("security")}
						style={{
							padding: "calc(var(--space-base) / 4) var(--space-base)",
							borderRadius: "var(--radius-pill)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: channels.includes("security")
								? "var(--rule-strong)"
								: "var(--rule)",
							backgroundColor: channels.includes("security")
								? "var(--ink)"
								: "transparent",
							color: channels.includes("security")
								? "var(--ground)"
								: "var(--ink-muted)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							cursor: "pointer",
						}}
					>
						[x] Security & Network Audits
					</button>
				</div>

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
						placeholder="researcher@lab.org"
						required
						style={{
							flex: 1,
							minWidth: "16rem",
							padding: "var(--space-base) var(--gap-sm)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule-strong)",
							backgroundColor: "var(--ground)",
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
						{isSubmitting ? "Subscribing..." : "Subscribe to Radar ➔"}
					</button>
				</div>
			</form>

			{status && (
				<div
					role="status"
					style={{
						padding: "calc(var(--space-base) / 2) var(--gap-sm)",
						backgroundColor: "var(--ground)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor:
							status.type === "success"
								? "var(--accent)"
								: "var(--rule-strong)",
						color:
							status.type === "success" ? "var(--accent)" : "var(--ink-muted)",
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
						[dismiss]
					</button>
				</div>
			)}
		</div>
	);
}
