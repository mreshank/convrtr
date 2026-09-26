"use client";

import { useState } from "react";
import { CardHeader } from "@/design/families/CardHeader";
import { StatusNotice } from "@/design/families/StatusNotice";
import {
	type Subscriber,
	type SubscriptionChannel,
	subscribeUser,
	syncSubscriptionRemote,
} from "@/lib/subscriptions";

export type SubscribeChip = {
	value: SubscriptionChannel;
	label: string;
};

type Props = {
	/** Card header copy. Omit all three to render the form bare -- hosts
	 * with their own header (the radar card, the extension spotlight) do. */
	eyebrow?: string;
	title?: string;
	lede?: string;
	/** Pre-selected channels; at least one always stays selected. */
	defaultChannels: SubscriptionChannel[];
	/** Persistence source recorded with the subscription. */
	source: Subscriber["source"];
	/** Toggleable channel chips. */
	chips: SubscribeChip[];
	emailPlaceholder: string;
	submitLabel: string;
	/** Fired after a successful subscribe so hosts can refresh counters. */
	onSubscribed?: () => void;
};

/**
 * The canonical subscribe block: header, channel chips, email row, status
 * feedback. `EcosystemRadarCard` and `ExtensionWaitlistCard` each owned a
 * near-verbatim copy of this state machine (email, channels with keep-one
 * minimum, submit-then-sync, dismissible status) -- two copies of the submit
 * path meant every API change had to land twice. Hosts keep only what is
 * actually theirs: defaults, source, chip labels, and surrounding content.
 */
export function SubscribeForm({
	eyebrow,
	title,
	lede,
	defaultChannels,
	source,
	chips,
	emailPlaceholder,
	submitLabel,
	onSubscribed,
}: Props) {
	const [email, setEmail] = useState("");
	const [channels, setChannels] =
		useState<SubscriptionChannel[]>(defaultChannels);
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
		const result = subscribeUser(email, channels, source);
		const submittedEmail = email.trim();

		if (result.success) {
			setStatus({ text: result.message, type: "success" });
			setEmail("");
			onSubscribed?.();
			// Fire-and-forget welcome email + Audience sync; local state stays
			// authoritative.
			void syncSubscriptionRemote(submittedEmail, channels, source).then(
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
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-sm)",
			}}
		>
			{title && (
				<CardHeader eyebrow={eyebrow ?? ""} title={title} lede={lede} />
			)}

			<form
				onSubmit={handleSubmit}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
				}}
			>
				<fieldset
					style={{
						display: "flex",
						gap: "calc(var(--space-base) / 2)",
						flexWrap: "wrap",
						border: "none",
						margin: 0,
						padding: 0,
					}}
				>
					<legend
						className="meta"
						style={{
							color: "var(--rule-strong)",
							fontSize: "var(--mono-size)",
							padding: 0,
							marginBottom: "calc(var(--space-base) / 2)",
						}}
					>
						SUBSCRIPTION CHANNELS
					</legend>
					{chips.map((chip) => {
						const isSelected = channels.includes(chip.value);
						return (
							<button
								key={chip.value}
								type="button"
								onClick={() => toggleChannel(chip.value)}
								aria-pressed={isSelected}
								className={`m3-chip ${isSelected ? "m3-chip-active" : ""}`}
							>
								[x] {chip.label}
							</button>
						);
					})}
				</fieldset>

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
						placeholder={emailPlaceholder}
						required
						aria-label="Email address"
						className="mono rounded-full border px-[var(--gap-sm)] py-[var(--space-base)] text-[var(--mono-size)] outline-none transition-colors focus:border-[var(--accent)]"
						style={{
							flex: 1,
							minWidth: "16rem",
							borderColor: "var(--rule-strong)",
							backgroundColor: "var(--surface)",
							color: "var(--ink)",
						}}
					/>
					<button
						type="submit"
						disabled={isSubmitting}
						className="mono border border-transparent px-[var(--gap-md)] py-[var(--space-base)] text-[var(--mono-size)] font-semibold rounded-full uppercase tracking-[0.08em] transition-all hover:bg-[var(--accent)] hover:text-[var(--ground)]"
						style={{
							backgroundColor: "var(--ink)",
							color: "var(--ground)",
							cursor: "pointer",
						}}
					>
						{isSubmitting ? "Subscribing..." : submitLabel}
					</button>
				</div>
			</form>

			{status && (
				<StatusNotice
					type={status.type}
					text={status.text}
					onDismiss={() => setStatus(null)}
				/>
			)}
		</div>
	);
}
