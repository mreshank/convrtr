"use client";

import { useEffect, useRef } from "react";

interface KeyboardShortcutsModalProps {
	isOpen: boolean;
	onClose: () => void;
	isExtensionMode?: boolean;
}

interface ShortcutEntry {
	keys: string[];
	description: string;
}

interface ShortcutSection {
	title: string;
	shortcuts: ShortcutEntry[];
}

export function KeyboardShortcutsModal({
	isOpen,
	onClose,
	isExtensionMode = false,
}: KeyboardShortcutsModalProps) {
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);

	// Keyboard trap and ESC handler
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}

			// Focus trapping within modal
			if (e.key === "Tab" && modalRef.current) {
				const focusableElements = modalRef.current.querySelectorAll<
					HTMLButtonElement | HTMLAnchorElement
				>("button, a, [tabindex]:not([tabindex='-1'])");
				if (focusableElements.length === 0) return;

				const firstElement = focusableElements[0];
				const lastElement = focusableElements[focusableElements.length - 1];

				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						e.preventDefault();
						lastElement?.focus();
					}
				} else {
					if (document.activeElement === lastElement) {
						e.preventDefault();
						firstElement?.focus();
					}
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		closeButtonRef.current?.focus();

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const sections: ShortcutSection[] = [
		...(isExtensionMode
			? [
					{
						title: "GLOBAL BROWSER COMMANDS",
						shortcuts: [
							{
								keys: ["⌘", "⇧", "C"],
								description: "Toggle Docked Side Panel (Ctrl+Shift+C)",
							},
							{
								keys: ["⌘", "⇧", ","],
								description: "Open Quick Popup (Ctrl+Shift+,)",
							},
							{
								keys: ["⌘", "⇧", "O"],
								description: "Open Full Tab Studio (Ctrl+Shift+O)",
							},
						],
					},
					{
						title: "SEAMLESS VIEW SWITCHING",
						shortcuts: [
							{
								keys: ["1"],
								description:
									"Switch to Side Panel (autocloses active view & resumes operations)",
							},
							{
								keys: ["2"],
								description:
									"Switch to Quick Popup (autocloses active view & resumes operations)",
							},
							{
								keys: ["3"],
								description:
									"Switch to Studio Tab (autocloses active view & resumes operations)",
							},
						],
					},
				]
			: []),
		{
			title: "CONVERSION & QUEUE CONTROLS",
			shortcuts: [
				{
					keys: ["⌘", "O"],
					description: "Open system file picker (Ctrl+O)",
				},
				{
					keys: ["⌘", "Enter"],
					description: "Convert all staged files in queue (Ctrl+Enter)",
				},
				{
					keys: ["⌘", "D"],
					description: "Download all completed conversions as ZIP (Ctrl+D)",
				},
				{
					keys: ["⌘", "A"],
					description: "Select / deselect all items in queue (Ctrl+A)",
				},
				{
					keys: ["⌘", "⌫"],
					description: "Remove selected items from queue (Ctrl+Backspace)",
				},
				{
					keys: ["⌘", "K"],
					description: "Focus target format search & selector (Ctrl+K)",
				},
			],
		},
		{
			title: "INTERFACE & DRAWER TOGGLES",
			shortcuts: [
				{
					keys: ["P"],
					description: "Toggle quick format presets bar",
				},
				{
					keys: ["H"],
					description: "Toggle conversion history drawer",
				},
				{
					keys: ["?"],
					description: "Toggle keyboard shortcuts reference dialog",
				},
				{
					keys: ["Esc"],
					description: "Close active drawer, modal, or preview overlay",
				},
			],
		},
	];

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="shortcuts-dialog-title"
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div
				ref={modalRef}
				className="flex flex-col border max-w-lg w-full max-h-[90vh] overflow-hidden rounded-2xl"
				style={{
					background: "var(--surface)",
					borderColor: "var(--rule)",
				}}
			>
				{/* Dialog Header */}
				<div
					className="flex items-center justify-between border-b px-5 py-3.5"
					style={{ borderColor: "var(--rule-subtle)" }}
				>
					<div className="flex items-center gap-2.5">
						<span
							className="mono text-[12px] font-bold uppercase tracking-wide"
							style={{ color: "var(--accent)" }}
						>
							KEYBOARD SHORTCUTS
						</span>
						<span
							id="shortcuts-dialog-title"
							className="mono text-[10px] uppercase px-2 py-0.5 rounded-full border"
							style={{
								color: "var(--ink-muted)",
								borderColor: "var(--rule-subtle)",
								background: "var(--ground)",
							}}
						>
							TECHNICAL INSTRUMENT
						</span>
					</div>
					<button
						ref={closeButtonRef}
						type="button"
						onClick={onClose}
						aria-label="Close keyboard shortcuts dialog"
						className="mono text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors"
						style={{
							borderColor: "var(--rule-subtle)",
							color: "var(--ink-muted)",
							background: "var(--ground)",
						}}
					>
						✕ ESC
					</button>
				</div>

				{/* Shortcuts Content */}
				<div className="overflow-y-auto p-5 flex flex-col gap-5 max-h-[calc(90vh-100px)]">
					{sections.map((section) => (
						<div key={section.title} className="flex flex-col gap-2">
							<h3
								className="mono text-[10px] uppercase font-bold tracking-wider pb-1 border-b"
								style={{
									color: "var(--accent)",
									borderColor: "var(--rule-subtle)",
								}}
							>
								{section.title}
							</h3>
							<div className="flex flex-col gap-1.5">
								{section.shortcuts.map((s) => (
									<div
										key={`${section.title}-${s.description}`}
										className="flex items-center justify-between py-1.5 px-3 rounded-lg border text-[11px] mono transition-colors hover:border-[var(--rule)]"
										style={{
											borderColor: "var(--rule-subtle)",
											background: "var(--ground)",
										}}
									>
										<span
											className="text-[11px] leading-snug mr-3"
											style={{ color: "var(--ink)" }}
										>
											{s.description}
										</span>
										<div className="flex items-center gap-1 shrink-0">
											{s.keys.map((k) => (
												<kbd
													key={`${s.description}-${k}`}
													className="mono text-[10px] px-2 py-0.5 rounded border font-semibold min-w-5 text-center"
													style={{
														borderColor: "var(--rule)",
														background: "var(--surface)",
														color: "var(--ink)",
													}}
												>
													{k}
												</kbd>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				{/* Dialog Footer */}
				<div
					className="border-t px-5 py-3 flex items-center justify-between text-[11px] mono"
					style={{
						borderColor: "var(--rule-subtle)",
						background: "var(--ground)",
						color: "var(--ink-muted)",
					}}
				>
					<span>PRESS ? TO TOGGLE</span>
					<button
						type="button"
						onClick={onClose}
						className="mono text-[11px] px-4 py-1.5 rounded-full border cursor-pointer font-semibold transition-colors"
						style={{
							borderColor: "var(--accent)",
							background: "var(--accent)",
							color: "var(--ground)",
						}}
					>
						DONE
					</button>
				</div>
			</div>
		</div>
	);
}
