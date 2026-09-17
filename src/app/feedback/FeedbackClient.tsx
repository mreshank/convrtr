"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
	const router = useRouter();
	const [category, setCategory] = useState<string>("format");
	const [rating, setRating] = useState<number>(5);
	const [message, setMessage] = useState<string>("");
	const [contactEmail, setContactEmail] = useState<string>("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!message.trim()) return;

		setSubmitting(true);
		try {
			// Save in local storage for auditing/session record
			const existing = JSON.parse(
				localStorage.getItem("convrtr_user_feedback") || "[]",
			);
			existing.push({
				category,
				rating,
				message: message.trim(),
				contactEmail: contactEmail.trim() || undefined,
				timestamp: new Date().toISOString(),
			});
			localStorage.setItem(
				"convrtr_user_feedback",
				JSON.stringify(existing.slice(-20)),
			);
		} catch {
			// Ignore local storage quota errors
		}

		router.push("/thank-you");
	};

	const githubIssueUrl = `https://github.com/mreshank/convrtr/issues/new?title=${encodeURIComponent(
		`[${category.toUpperCase()}] ${message.slice(0, 60) || "Feedback"}`,
	)}&body=${encodeURIComponent(
		`### Category\n${category}\n\n### Rating\n${rating}/5\n\n### Feedback Details\n${message}\n\n*Submitted via convrtr web feedback portal*`,
	)}`;

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
					<span
						className="mono text-[10px] tracking-wider uppercase block mb-1"
						style={{ color: "var(--ink-muted)" }}
					>
						COMMUNITY INPUT
					</span>
					<h2
						className="text-xl md:text-2xl font-bold tracking-tight uppercase"
						style={{ color: "var(--ink)" }}
					>
						SHARE YOUR FEEDBACK
					</h2>
					<p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
						Suggest new file formats, report conversion anomalies, or share your
						thoughts with the maintainers.
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
										color: active ? "var(--accent)" : "var(--ink-muted)",
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
						YOUR EMAIL (OPTIONAL)
					</label>
					<input
						id="feedback-email"
						type="email"
						value={contactEmail}
						onChange={(e) => setContactEmail(e.target.value)}
						placeholder="user@example.com (only if you want a follow-up)"
						className="mono text-xs p-3 border w-full outline-none"
						style={{
							background: "var(--ground)",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
					/>
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
							opacity: !message.trim() ? 0.5 : 1,
						}}
					>
						SUBMIT FEEDBACK ➔
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
